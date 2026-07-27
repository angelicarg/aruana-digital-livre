import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import crypto from "node:crypto";

// Recebe eventos da Autentique quando o status de assinatura de um contrato
// muda (ver sendContractForSignature em signature.functions.ts).
// Doc: https://docs.autentique.com.br/api/integration-basics/webhooks
//
// POR QUE ESTE HANDLER NÃO CONFIA NO CORPO DO EVENTO:
// a primeira versão validava o HMAC do payload e lia o status direto dele.
// Na prática, um contrato assinado de verdade (27/07/2026) nunca chegou a
// virar "assinado" na intranet — e como o handler descarta em silêncio tanto
// HMAC inválido quanto formato inesperado, era impossível saber qual dos dois
// falhou (nem se a Autentique chegou a chamar). Nem a doc nem a API deles
// permitem confirmar o formato exato do header/payload.
//
// Então o evento passou a ser tratado como simples GATILHO: extraímos
// qualquer id de documento do corpo, conferimos se ele pertence a um negócio
// nosso e reconsultamos a API da Autentique, que é a fonte da verdade — mesma
// postura do webhook do Mercado Pago. Consequências:
//   - imune a mudança de formato do payload e de nome dos eventos;
//   - imune a header/algoritmo de HMAC diferente do que assumimos;
//   - seguro sem o HMAC: nada é gravado a partir do que o corpo afirma, e um
//     id que não bate com nenhum negócio é descartado antes de qualquer
//     chamada externa (não vira vetor de abuso).
// O HMAC continua sendo verificado, mas só para registrar se bate — o status
// gravado vem sempre da consulta à API.
//
// Sempre responde 200 rápido (eles reenviam em não-2xx, até 3 tentativas);
// falhas só são logadas, nunca propagadas como erro HTTP.

function hmacConfere(rawBody: string, signatureHeader: string | null, secret: string) {
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

// Os ids de documento da Autentique são strings hexadecimais longas. Varre o
// payload inteiro (sem assumir onde o id está aninhado) e devolve os
// candidatos encontrados.
function extrairIdsCandidatos(valor: unknown, encontrados = new Set<string>()): Set<string> {
  if (typeof valor === "string") {
    if (/^[a-f0-9]{32,}$/i.test(valor)) encontrados.add(valor);
    return encontrados;
  }
  if (Array.isArray(valor)) {
    for (const item of valor) extrairIdsCandidatos(item, encontrados);
    return encontrados;
  }
  if (valor && typeof valor === "object") {
    for (const item of Object.values(valor)) extrairIdsCandidatos(item, encontrados);
  }
  return encontrados;
}

export const Route = createFileRoute("/api/autentique-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const secret = process.env.AUTENTIQUE_WEBHOOK_SECRET;
          const apiToken = process.env.AUTENTIQUE_API_TOKEN;

          if (secret) {
            const confere = hmacConfere(rawBody, request.headers.get("x-autentique-signature"), secret);
            if (!confere) {
              console.warn(
                "[signature] webhook: HMAC não confere (evento segue pela consulta à API, que é a fonte da verdade)",
              );
            }
          }

          if (!apiToken) {
            console.error("[signature] webhook: AUTENTIQUE_API_TOKEN não configurado");
            return new Response("ok", { status: 200 });
          }

          let payload: unknown;
          try {
            payload = JSON.parse(rawBody);
          } catch {
            return new Response("ok", { status: 200 });
          }

          const candidatos = [...extrairIdsCandidatos(payload)];
          if (candidatos.length === 0) {
            console.error("[signature] webhook: nenhum id de documento no payload");
            return new Response("ok", { status: 200 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { fetchAutentiqueStatus } = await import("@/lib/api/signature.functions");

          // Só ids que já pertencem a um negócio nosso seguem adiante — isso
          // limita o trabalho e impede que um POST qualquer gere chamadas à
          // API externa.
          const { data: deals, error: dealsError } = await supabaseAdmin
            .from("intranet_deals")
            .select("id, contrato_autentique_id")
            .in("contrato_autentique_id", candidatos);

          if (dealsError) {
            console.error("[signature] webhook: falha ao buscar negócios", dealsError);
            return new Response("ok", { status: 200 });
          }
          if (!deals?.length) return new Response("ok", { status: 200 });

          for (const deal of deals) {
            if (!deal.contrato_autentique_id) continue;

            const resultado = await fetchAutentiqueStatus(apiToken, deal.contrato_autentique_id);
            if ("error" in resultado) {
              console.error("[signature] webhook: consulta à Autentique falhou", resultado.error);
              continue;
            }

            const { error: updateError } = await supabaseAdmin
              .from("intranet_deals")
              .update({
                contrato_status: resultado.status,
                ...(resultado.status === "assinado"
                  ? { contrato_signed_at: new Date().toISOString() }
                  : {}),
              })
              .eq("id", deal.id);

            if (updateError) {
              console.error("[signature] webhook: falha ao atualizar negócio", updateError);
            }
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
