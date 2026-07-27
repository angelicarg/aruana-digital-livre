import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Integração com a Autentique (assinatura eletrônica de contratos),
// documentação: https://docs.autentique.com.br/api/ — API GraphQL, sem SDK
// oficial em Node, então o multipart de upload de arquivo (campo
// `file: Upload!`, segue o "GraphQL multipart request spec") é montado à
// mão aqui com FormData nativo.
//
// Mesma postura de graceful degradation dos outros integradores
// (Resend/Mercado Pago): sem AUTENTIQUE_API_TOKEN configurado, a ação falha
// de forma sinalizada (reason), nunca derruba o resto da intranet.
//
// NOTA: a doc pública menciona um modo sandbox ("Use `sandbox: true`
// parameter for non-billed test documents") mas não confirma em qual nível
// exato da mutation esse argumento entra — incluir um argumento GraphQL
// inexistente quebraria a chamada real inteira. Por isso este arquivo NÃO
// tenta sandbox; o primeiro teste real deve ser feito contra a API de
// produção mesmo (custo é de centavos de dólar por documento). Se ela
// confirmar o formato certo do sandbox na doc/painel, adicionar depois.

const CREATE_DOCUMENT_MUTATION = `
  mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument(document: $document, signers: $signers, file: $file) {
      id
      name
    }
  }
`;

async function autentiqueCreateDocument(params: {
  token: string;
  name: string;
  file: Blob;
  fileName: string;
  signerEmail: string;
}): Promise<{ id: string } | { error: string }> {
  const operations = JSON.stringify({
    query: CREATE_DOCUMENT_MUTATION,
    variables: {
      document: { name: params.name },
      signers: [{ email: params.signerEmail, action: "SIGN" }],
      file: null,
    },
  });
  const map = JSON.stringify({ "0": ["variables.file"] });

  const formData = new FormData();
  formData.append("operations", operations);
  formData.append("map", map);
  formData.append("0", params.file, params.fileName);

  const response = await fetch("https://api.autentique.com.br/v2/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${params.token}` },
    body: formData,
  });

  let json: {
    data?: { createDocument?: { id: string; name: string } };
    errors?: { message: string }[];
  };

  try {
    json = await response.json();
  } catch {
    return { error: `Resposta não-JSON da Autentique (status ${response.status})` };
  }

  if (json.errors?.length) {
    return { error: json.errors.map((e) => e.message).join("; ") };
  }
  if (!json.data?.createDocument?.id) {
    return { error: "Resposta inesperada da Autentique (sem id de documento criado)" };
  }
  return { id: json.data.createDocument.id };
}

// ─── LEITURA DE STATUS (fonte da verdade) ───────────────────────────────────
// O status de assinatura é sempre lido da API da Autentique, nunca inferido
// do corpo de um webhook: o payload/HMAC deles não pôde ser validado contra
// um evento real, então tratar o evento como mero "gatilho" e reconsultar o
// documento é o que mantém o status correto mesmo se o webhook mudar de
// formato ou nunca chegar (ver syncContractStatus + o botão na intranet).

export type ContratoStatusRemoto = "assinado" | "rejeitado" | "enviado";

// Usa os contadores da própria Autentique em vez de deduzir da lista de
// signatários. A lista traz entradas que NÃO são assinaturas exigidas — o
// dono da conta aparece nela com `action: null` (registro de autor) e nunca
// assina. Contar a lista deixaria o contrato preso em "aguardando
// assinatura" para sempre; `signatures_count`/`signed_count` são a
// contabilidade oficial e já excluem essas entradas.
const DOCUMENT_STATUS_QUERY = `
  query DocumentStatus($id: UUID!) {
    document(id: $id) {
      id
      signatures_count
      signed_count
      rejected_count
    }
  }
`;

export async function fetchAutentiqueStatus(
  token: string,
  documentId: string,
): Promise<{ status: ContratoStatusRemoto } | { error: string }> {
  const response = await fetch("https://api.autentique.com.br/v2/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: DOCUMENT_STATUS_QUERY, variables: { id: documentId } }),
  });

  let json: {
    data?: {
      document?: {
        signatures_count: number;
        signed_count: number;
        rejected_count: number;
      } | null;
    };
    errors?: { message: string }[];
  };

  try {
    json = await response.json();
  } catch {
    return { error: `Resposta não-JSON da Autentique (status ${response.status})` };
  }

  if (json.errors?.length) return { error: json.errors.map((e) => e.message).join("; ") };

  const doc = json.data?.document;
  if (!doc) return { error: "Documento não encontrado na Autentique" };

  if (doc.rejected_count > 0) return { status: "rejeitado" };
  if (doc.signatures_count > 0 && doc.signed_count >= doc.signatures_count) {
    return { status: "assinado" };
  }
  return { status: "enviado" };
}

const sendContractSchema = z.object({
  dealId: z.string().uuid(),
  documentId: z.string().uuid(),
  signerEmail: z.string().email(),
  accessToken: z.string().min(1),
});

export type SendContractResult =
  | { sent: true }
  | {
      sent: false;
      reason:
        | "not_admin"
        | "not_configured"
        | "deal_not_found"
        | "already_sent"
        | "document_not_found"
        | "file_download_failed"
        | "autentique_error"
        | "save_failed"
        | "unexpected_error";
    };

export const sendContractForSignature = createServerFn({ method: "POST" })
  .inputValidator(sendContractSchema)
  .handler(async ({ data }): Promise<SendContractResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { requireIntranetAdmin, NotIntranetAdminError } = await import(
        "@/lib/api/intranet-auth.server"
      );

      try {
        await requireIntranetAdmin(supabaseAdmin, data.accessToken);
      } catch (err) {
        if (err instanceof NotIntranetAdminError) {
          return { sent: false, reason: "not_admin" };
        }
        throw err;
      }

      const apiToken = process.env.AUTENTIQUE_API_TOKEN;
      if (!apiToken) {
        console.error("[signature] AUTENTIQUE_API_TOKEN não configurado");
        return { sent: false, reason: "not_configured" };
      }

      const { data: deal, error: dealError } = await supabaseAdmin
        .from("intranet_deals")
        .select("*, intranet_clients(name)")
        .eq("id", data.dealId)
        .maybeSingle();

      if (dealError || !deal) {
        return { sent: false, reason: "deal_not_found" };
      }

      // Idempotência: um contrato já enviado ou assinado não pode ser
      // reenviado por aqui (evita duplicar cobrança/confundir o signatário).
      // "rejeitado" e "pendente" podem, sim, disparar um novo envio.
      if (deal.contrato_status === "enviado" || deal.contrato_status === "assinado") {
        return { sent: false, reason: "already_sent" };
      }

      const { data: document, error: documentError } = await supabaseAdmin
        .from("intranet_documents")
        .select("*")
        .eq("id", data.documentId)
        .maybeSingle();

      if (documentError || !document) {
        return { sent: false, reason: "document_not_found" };
      }

      const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
        .from("intranet-documents")
        .download(document.storage_path);

      if (downloadError || !fileBlob) {
        console.error("[signature] falha ao baixar arquivo do storage", downloadError);
        return { sent: false, reason: "file_download_failed" };
      }

      // A Autentique valida o tipo do arquivo pela EXTENSÃO do nome enviado no
      // multipart. O nome de exibição do documento normalmente não tem extensão
      // ("Contrato de Teste"), o que faz a API recusar com must_be_type — por
      // isso o nome enviado é o do arquivo físico no storage, que sempre tem a
      // extensão real.
      const storageFileName = document.storage_path.split("/").pop() || "contrato.pdf";

      const result = await autentiqueCreateDocument({
        token: apiToken,
        name: `Contrato — ${deal.intranet_clients?.name ?? "Cliente"}`,
        file: fileBlob,
        fileName: storageFileName,
        signerEmail: data.signerEmail,
      });

      if ("error" in result) {
        console.error("[signature] autentique createDocument falhou", result.error);
        return { sent: false, reason: "autentique_error" };
      }

      const { error: updateError } = await supabaseAdmin
        .from("intranet_deals")
        .update({
          contrato_status: "enviado",
          contrato_document_id: data.documentId,
          contrato_autentique_id: result.id,
          contrato_signer_email: data.signerEmail,
          contrato_enviado_at: new Date().toISOString(),
        })
        .eq("id", data.dealId);

      if (updateError) {
        console.error("[signature] falha ao salvar status do contrato", updateError);
        return { sent: false, reason: "save_failed" };
      }

      return { sent: true };
    } catch (err) {
      console.error("[signature] sendContractForSignature unavailable", err);
      return { sent: false, reason: "unexpected_error" };
    }
  });

// ─── SINCRONIZAÇÃO MANUAL ───────────────────────────────────────────────────
// Rede de segurança para o webhook: reconsulta a Autentique e grava o status
// real. Serve tanto para o botão "Atualizar status" da intranet quanto para
// destravar qualquer contrato caso o evento não chegue.

const syncContractSchema = z.object({
  dealId: z.string().uuid(),
  accessToken: z.string().min(1),
});

export type SyncContractResult =
  | { synced: true; status: ContratoStatusRemoto }
  | {
      synced: false;
      reason: "not_admin" | "not_configured" | "deal_not_found" | "no_contract" | "autentique_error" | "save_failed" | "unexpected_error";
    };

export const syncContractStatus = createServerFn({ method: "POST" })
  .inputValidator(syncContractSchema)
  .handler(async ({ data }): Promise<SyncContractResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { requireIntranetAdmin, NotIntranetAdminError } = await import(
        "@/lib/api/intranet-auth.server"
      );

      try {
        await requireIntranetAdmin(supabaseAdmin, data.accessToken);
      } catch (err) {
        if (err instanceof NotIntranetAdminError) return { synced: false, reason: "not_admin" };
        throw err;
      }

      const apiToken = process.env.AUTENTIQUE_API_TOKEN;
      if (!apiToken) return { synced: false, reason: "not_configured" };

      const { data: deal, error: dealError } = await supabaseAdmin
        .from("intranet_deals")
        .select("id, contrato_autentique_id")
        .eq("id", data.dealId)
        .maybeSingle();

      if (dealError || !deal) return { synced: false, reason: "deal_not_found" };
      if (!deal.contrato_autentique_id) return { synced: false, reason: "no_contract" };

      const result = await fetchAutentiqueStatus(apiToken, deal.contrato_autentique_id);
      if ("error" in result) {
        console.error("[signature] sync: falha ao consultar Autentique", result.error);
        return { synced: false, reason: "autentique_error" };
      }

      const { error: updateError } = await supabaseAdmin
        .from("intranet_deals")
        .update({
          contrato_status: result.status,
          ...(result.status === "assinado" ? { contrato_signed_at: new Date().toISOString() } : {}),
        })
        .eq("id", data.dealId);

      if (updateError) {
        console.error("[signature] sync: falha ao salvar status", updateError);
        return { synced: false, reason: "save_failed" };
      }

      return { synced: true, status: result.status };
    } catch (err) {
      console.error("[signature] syncContractStatus unavailable", err);
      return { synced: false, reason: "unexpected_error" };
    }
  });
