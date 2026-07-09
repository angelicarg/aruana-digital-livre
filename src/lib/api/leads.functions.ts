import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Persiste os leads capturados pelo simulador de orçamento. Roda com o
// service_role (bypassa RLS) porque este é o único caminho de escrita na
// tabela `leads` — não existe policy de insert para a chave anon.
// Se a chave não estiver configurada, falha graciosamente: o simulador
// continua funcionando (mostra o resultado e o CTA de WhatsApp), só não
// fica um registro salvo no banco.

const leadSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  whatsapp: z.string().trim().min(8).max(30),
  email: z.string().trim().max(160).nullable(),
  tipoNegocio: z.string().trim().min(1).max(120),
  precisaAgendamento: z.boolean(),
  interesseAvancado: z.enum(["nenhum", "loja", "loja_ia", "sob_medida"]),
  temSite: z.boolean().nullable(),
  pacoteSugerido: z.enum(["essencial", "profissional", "avancado", "sob_medida"]),
  origem: z.enum(["banner", "simulador"]),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator(leadSchema)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { error } = await supabaseAdmin.from("leads").insert({
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email,
        tipo_negocio: data.tipoNegocio,
        precisa_agendamento: data.precisaAgendamento,
        interesse_avancado: data.interesseAvancado,
        tem_site: data.temSite,
        pacote_sugerido: data.pacoteSugerido,
        origem: data.origem,
      });

      if (error) {
        console.error("[leads] insert failed", error);
        return { saved: false as const };
      }

      return { saved: true as const };
    } catch (err) {
      console.error("[leads] submitLead unavailable", err);
      return { saved: false as const };
    }
  });
