import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Recebe a notificação assíncrona do Mercado Pago quando o status de uma
// assinatura (preapproval) muda — é assim que a mensalidade fica
// "confirmada de verdade" depois do cliente preencher o cartão no checkout
// hospedado deles (ver createMensalidadeCheckout em deals.functions.ts).
//
// Nunca confia no corpo do webhook em si — sempre rebusca o recurso
// autoritativo na API do Mercado Pago com o access token, e só então
// atualiza `intranet_deals`. Sempre responde 200 rápido (eles reenviam em
// não-2xx); falhas só são logadas.

function mapPreapprovalStatus(
  mpStatus: string | undefined,
): "ativa" | "cancelada" | "falhou" {
  if (mpStatus === "authorized") return "ativa";
  if (mpStatus === "cancelled" || mpStatus === "paused") return "cancelada";
  return "falhou";
}

export const Route = createFileRoute("/api/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          let preapprovalId: string | null = null;

          // Formato atual: corpo JSON { type: "preapproval", data: { id } }.
          // Formato antigo/defensivo: query params ?topic=&id=.
          try {
            const body = (await request.json()) as {
              type?: string;
              data?: { id?: string };
            };
            if (body?.data?.id) preapprovalId = body.data.id;
          } catch {
            // corpo vazio/não-JSON — cai pro fallback de query params
          }

          if (!preapprovalId) {
            preapprovalId = url.searchParams.get("id") ?? url.searchParams.get("data.id");
          }

          if (!preapprovalId) {
            return new Response("ok", { status: 200 });
          }

          const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
          if (!accessToken) {
            console.error("[deals] webhook: MERCADOPAGO_ACCESS_TOKEN não configurado");
            return new Response("ok", { status: 200 });
          }

          const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${preapprovalId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );

          if (!mpResponse.ok) {
            console.error("[deals] webhook: falha ao rebuscar preapproval", mpResponse.status);
            return new Response("ok", { status: 200 });
          }

          const preapproval = (await mpResponse.json()) as { status?: string };
          const mensalidadeStatus = mapPreapprovalStatus(preapproval.status);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { error } = await supabaseAdmin
            .from("intranet_deals")
            .update({
              mensalidade_status: mensalidadeStatus,
              mensalidade_mp_status: preapproval.status ?? null,
            })
            .eq("mensalidade_mp_preapproval_id", preapprovalId);

          if (error) {
            console.error("[deals] webhook: falha ao atualizar deal", error);
          }

          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[deals] webhook: erro inesperado", err);
          return new Response("ok", { status: 200 });
        }
      },
    },
  },
});
