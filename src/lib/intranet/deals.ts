import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Deal = Tables<"intranet_deals">;
export type DealInsert = TablesInsert<"intranet_deals">;
export type DealUpdate = TablesUpdate<"intranet_deals">;

export type DealWithClient = Deal & {
  intranet_clients: { name: string; email: string | null } | null;
};

export async function listDeals() {
  const { data, error } = await supabase
    .from("intranet_deals")
    .select("*, intranet_clients(name, email)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DealWithClient[];
}

// Inclui "link_enviado" também (não só "preferencia_registrada") pra dar
// pra reenviar quando o e-mail falha silenciosamente do lado do provedor
// (ex: restrição do domínio de teste do Resend) — sem isso não existia
// nenhuma forma de tentar de novo pela intranet.
export async function listPendingCharges() {
  const { data, error } = await supabase
    .from("intranet_deals")
    .select("*, intranet_clients(name, email)")
    .in("implantacao_status", ["preferencia_registrada", "link_enviado"])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as DealWithClient[];
}

export async function createDeal(input: DealInsert) {
  const { data, error } = await supabase.from("intranet_deals").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateDeal(id: string, input: DealUpdate) {
  const { data, error } = await supabase
    .from("intranet_deals")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const IMPLANTACAO_STATUS_LABELS: Record<Deal["implantacao_status"], string> = {
  pendente: "Aguardando cliente",
  preferencia_registrada: "Aguardando link (Cobre PJ)",
  link_enviado: "Link enviado",
};

export const MENSALIDADE_STATUS_LABELS: Record<Deal["mensalidade_status"], string> = {
  pendente: "Aguardando cliente",
  assinatura_criada: "Assinatura criada",
  ativa: "Ativa",
  cancelada: "Cancelada",
  falhou: "Falhou",
};

export const IMPLANTACAO_METODO_LABELS: Record<NonNullable<Deal["implantacao_metodo"]>, string> = {
  pix: "PIX à vista",
  cartao: "Cartão de crédito",
};

// Reexporta para quem só importa de deals.ts precisar de um único módulo
// pra montar o formulário de novo negócio.
export { PACKAGE_TIER_LABELS } from "./projects";
