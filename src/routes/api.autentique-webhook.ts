import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import crypto from "node:crypto";

// Recebe eventos da Autentique quando o status de assinatura de um
// contrato muda (ver sendContractForSignature em signature.functions.ts).
// Doc: https://docs.autentique.com.br/api/integration-basics/webhooks
//
// Diferente do webhook do Mercado Pago (que sempre rebusca o recurso
// autoritativo pela API antes de confiar em qualquer coisa), a Autentique
// não expõe uma consulta barata o bastante pra rebuscar a cada evento — a
// autenticidade aqui vem da verificação HMAC do próprio payload (header
// `x-autentique-signature`), então só confiamos no corpo do evento depois
// que a assinatura bate.
//
// Sempre responde 200 rápido (eles reenviam em não-2xx, até 3 tentativas);
// falhas só são logadas, nunca propagadas como erro HTTP.

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHeader, "hex"));
  } catch {
    // tamanhos diferentes (assinatura malformada/truncada) — timingSafeEqual
    // lança em vez de retornar false nesse caso.
    return false;
  }
}

function mapContratoStatus(eventType: string): "assinado" | "rejeitado" | null {
  if (eventType === "document.finished") return "assinado";
  if (eventType === "signature.rejected") return "rejeitado";
  return null;
}

export const Route = createFileRoute("/api/autentique-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const secret = process.env.AUTENTIQUE_WEBHOOK_SECRET;
          const signatureHeader = request.headers.get("x-autentique-signature");

          if (!secret) {
            console.error("[signature] webhook: AUTENTIQUE_WEBHOOK_SECRET não configurado");
            return new Response("ok", { status: 200 });
          }

          if (!verifySignature(rawBody, signatureHeader, secret)) {
            console.error("[signature] webhook: assinatura HMAC inválida, evento ignorado");
            return new Response("ok", { status: 200 });
          }

          let payload: {
            event?: {
              type?: string;
              data?: { object?: { id?: string; document?: { id?: string } } };
            };
          };
          try {
            payload = JSON.parse(rawBody);
          } catch {
            return new Response("ok", { status: 200 });
          }

          const eventType = payload.event?.type;
          const contratoStatus = eventType ? mapContratoStatus(eventType) : null;
          if (!contratoStatus) {
            // Evento que não nos interessa aqui (document.created,
            // signature.viewed, member.*, etc) — ignora silenciosamente.
            return new Response("ok", { status: 200 });
          }

          // document.finished: data.object É o documento (id direto).
          // signature.rejected: data.object é a assinatura — o id do
          // documento pai pode vir aninhado em .document.id; tenta os dois
          // caminhos já que o formato exato não pôde ser confirmado contra
          // um evento real durante a implementação.
          const documentId =
            payload.event?.data?.object?.document?.id ?? payload.event?.data?.object?.id;

          if (!documentId) {
            console.error(
              "[signature] webhook: evento sem id de documento identificável",
              eventType,
            );
            return new Response("ok", { status: 200 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { error } = await supabaseAdmin
            .from("intranet_deals")
            .update({
              contrato_status: contratoStatus,
              ...(contratoStatus === "assinado"
                ? { contrato_signed_at: new Date().toISOString() }
                : {}),
            })
            .eq("contrato_autentique_id", documentId);

          if (error) {
            console.error("[signature] webhook: falha ao atualizar deal", error);
          }

          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[signature] webhook: erro inesperado", err);
          return new Response("ok", { status: 200 });
        }
      },
    },
  },
});
