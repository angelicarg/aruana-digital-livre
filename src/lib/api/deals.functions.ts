import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server functions do fluxo "Fechar Negócio" (ver /fechar/$id). Duas
// naturezas bem diferentes de operação aqui:
//   - getDealByToken / submitImplantacaoPreference / createMensalidadeCheckout:
//     chamadas pela página pública, sem sessão nenhuma — sempre via
//     supabaseAdmin (service role), igual `leads.functions.ts`. RLS não
//     entra em jogo pra essas.
//   - sendImplantacaoPaymentLink: chamada só pela intranet autenticada, mas
//     como toda createServerFn é um endpoint público, valida admin via
//     requireIntranetAdmin antes de fazer qualquer coisa.

const dealIdSchema = z.object({ id: z.string().uuid() });

// Subconjunto seguro pra exibição pública — nunca client_id, notes, ids
// internos do Mercado Pago.
export type PublicDeal = {
  clientName: string;
  packageTier: "essencial" | "profissional" | "avancado" | "sob_medida";
  setupValue: number;
  monthlyValue: number;
  implantacaoStatus: "pendente" | "preferencia_registrada" | "link_enviado";
  implantacaoMetodo: "pix" | "cartao" | null;
  implantacaoParcelas: number | null;
  implantacaoCobrePjLink: string | null;
  mensalidadeStatus: "pendente" | "assinatura_criada" | "ativa" | "cancelada" | "falhou";
};

export const getDealByToken = createServerFn({ method: "GET" })
  .inputValidator(dealIdSchema)
  .handler(async ({ data }): Promise<PublicDeal | null> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: deal, error } = await supabaseAdmin
        .from("intranet_deals")
        .select("*, intranet_clients(name)")
        .eq("id", data.id)
        .maybeSingle();

      if (error || !deal) return null;

      return {
        clientName: deal.intranet_clients?.name ?? "Cliente",
        packageTier: deal.package_tier,
        setupValue: deal.setup_value,
        monthlyValue: deal.monthly_value,
        implantacaoStatus: deal.implantacao_status,
        implantacaoMetodo: deal.implantacao_metodo,
        implantacaoParcelas: deal.implantacao_parcelas,
        implantacaoCobrePjLink: deal.implantacao_cobre_pj_link,
        mensalidadeStatus: deal.mensalidade_status,
      };
    } catch (err) {
      console.error("[deals] getDealByToken failed", err);
      return null;
    }
  });

const submitImplantacaoSchema = z.object({
  id: z.string().uuid(),
  metodo: z.enum(["pix", "cartao"]),
  parcelas: z.number().int().min(1).max(12).nullable(),
});

export const submitImplantacaoPreference = createServerFn({ method: "POST" })
  .inputValidator(submitImplantacaoSchema)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: deal, error: fetchError } = await supabaseAdmin
        .from("intranet_deals")
        .select("implantacao_status")
        .eq("id", data.id)
        .maybeSingle();

      if (fetchError || !deal) {
        return { updated: false as const };
      }

      // Idempotência: não deixa um resubmit sobrescrever silenciosamente uma
      // preferência que a equipe já pode ter começado a atender.
      if (deal.implantacao_status !== "pendente") {
        return { updated: false as const };
      }

      const { error: updateError } = await supabaseAdmin
        .from("intranet_deals")
        .update({
          implantacao_metodo: data.metodo,
          implantacao_parcelas: data.metodo === "cartao" ? data.parcelas : null,
          implantacao_status: "preferencia_registrada",
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("[deals] submitImplantacaoPreference update failed", updateError);
        return { updated: false as const };
      }

      return { updated: true as const };
    } catch (err) {
      console.error("[deals] submitImplantacaoPreference unavailable", err);
      return { updated: false as const };
    }
  });

export const createMensalidadeCheckout = createServerFn({ method: "POST" })
  .inputValidator(dealIdSchema)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: deal, error: fetchError } = await supabaseAdmin
        .from("intranet_deals")
        .select("*, intranet_clients(name, email)")
        .eq("id", data.id)
        .maybeSingle();

      if (fetchError || !deal) {
        return { checkoutUrl: null as string | null };
      }

      if (deal.mensalidade_status === "ativa") {
        // Já tem assinatura ativa — não cria duplicada. O front trata
        // checkoutUrl null + mensalidadeStatus "ativa" (via getDealByToken)
        // como "já configurado", não como erro.
        return { checkoutUrl: null as string | null };
      }

      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.error("[deals] MERCADOPAGO_ACCESS_TOKEN não configurado");
        return { checkoutUrl: null as string | null };
      }

      const clientEmail = deal.intranet_clients?.email;
      if (!clientEmail) {
        console.error("[deals] createMensalidadeCheckout: cliente sem e-mail cadastrado", data.id);
        return { checkoutUrl: null as string | null };
      }

      // SDK oficial do Mercado Pago (`mercadopago`, v2+). Nomes de campo da
      // resposta (init_point/sandbox_init_point) seguem a doc atual deles —
      // vale reconferir contra a doc oficial no primeiro teste real com
      // credenciais de sandbox, já que essa é a única parte deste arquivo
      // que não pôde ser exercida contra a API de verdade durante o build.
      const { MercadoPagoConfig, PreApproval } = await import("mercadopago");
      const client = new MercadoPagoConfig({ accessToken });
      const preapproval = new PreApproval(client);

      const result = await preapproval.create({
        body: {
          reason: `Aruanã Digital — Mensalidade (${deal.package_tier})`,
          payer_email: clientEmail,
          back_url: `https://aruanadigital.com/fechar/${deal.id}?mensalidade=sucesso`,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: deal.monthly_value,
            currency_id: "BRL",
          },
          status: "pending",
        },
      });

      // A API atual do Mercado Pago só retorna `init_point` — ele já aponta
      // pro checkout sandbox ou produção dependendo do tipo do access token
      // usado (TEST-... vs APP_USR-...), não existe mais um campo separado
      // "sandbox_init_point" na resposta.
      const checkoutUrl = result.init_point ?? null;

      if (!result.id || !checkoutUrl) {
        console.error("[deals] mercadopago preapproval sem id/checkout url", result);
        return { checkoutUrl: null as string | null };
      }

      const { error: updateError } = await supabaseAdmin
        .from("intranet_deals")
        .update({
          mensalidade_mp_preapproval_id: result.id,
          mensalidade_status: "assinatura_criada",
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("[deals] createMensalidadeCheckout: falha ao salvar preapproval id", updateError);
      }

      return { checkoutUrl };
    } catch (err) {
      console.error("[deals] createMensalidadeCheckout failed", err);
      return { checkoutUrl: null as string | null };
    }
  });

const sendPaymentLinkSchema = z.object({
  id: z.string().uuid(),
  cobrePjLink: z.string().url(),
  accessToken: z.string().min(1),
});

export const sendImplantacaoPaymentLink = createServerFn({ method: "POST" })
  .inputValidator(sendPaymentLinkSchema)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { requireIntranetAdmin, NotIntranetAdminError } = await import(
        "@/lib/api/intranet-auth.server"
      );

      try {
        await requireIntranetAdmin(supabaseAdmin, data.accessToken);
      } catch (err) {
        if (err instanceof NotIntranetAdminError) {
          return { updated: false as const, emailSent: false as const };
        }
        throw err;
      }

      const { data: deal, error: fetchError } = await supabaseAdmin
        .from("intranet_deals")
        .select("*, intranet_clients(name, email)")
        .eq("id", data.id)
        .maybeSingle();

      if (fetchError || !deal) {
        return { updated: false as const, emailSent: false as const };
      }

      const { error: updateError } = await supabaseAdmin
        .from("intranet_deals")
        .update({
          implantacao_cobre_pj_link: data.cobrePjLink,
          implantacao_status: "link_enviado",
          implantacao_link_enviado_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (updateError) {
        console.error("[deals] sendImplantacaoPaymentLink update failed", updateError);
        return { updated: false as const, emailSent: false as const };
      }

      const clientEmail = deal.intranet_clients?.email;
      const clientName = deal.intranet_clients?.name ?? "Cliente";

      if (!clientEmail) {
        console.error("[deals] sendImplantacaoPaymentLink: cliente sem e-mail, link salvo mas não enviado", data.id);
        return { updated: true as const, emailSent: false as const };
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL;
      if (!resendApiKey || !fromEmail) {
        console.error("[deals] RESEND_API_KEY/RESEND_FROM_EMAIL não configurados — link salvo mas não enviado por e-mail");
        return { updated: true as const, emailSent: false as const };
      }

      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        await resend.emails.send({
          from: fromEmail,
          to: clientEmail,
          subject: "Aruanã Digital — Link de pagamento da implantação",
          html: `
            <p>Olá, ${clientName}!</p>
            <p>Segue o link para pagamento da implantação do seu projeto (${deal.package_tier}), no valor de ${(deal.setup_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}:</p>
            <p><a href="${data.cobrePjLink}">${data.cobrePjLink}</a></p>
            <p>Qualquer dúvida, é só chamar a gente no WhatsApp.</p>
          `,
        });

        return { updated: true as const, emailSent: true as const };
      } catch (emailErr) {
        console.error("[deals] resend send failed", emailErr);
        return { updated: true as const, emailSent: false as const };
      }
    } catch (err) {
      console.error("[deals] sendImplantacaoPaymentLink unavailable", err);
      return { updated: false as const, emailSent: false as const };
    }
  });
