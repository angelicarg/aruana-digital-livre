import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Lead = Tables<"leads">;
export type LeadUpdate = TablesUpdate<"leads">;

export async function listLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateLead(id: string, input: LeadUpdate) {
  const { error } = await supabase.from("leads").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

// Cria o cliente com o que o lead já informou e amarra os dois, para o mesmo lead não virar cliente duas vezes.
export async function convertLead(lead: Lead) {
  const detalhes = [
    lead.tipo_negocio && lead.tipo_negocio !== "Não informado" && lead.tipo_negocio !== "Não especificado"
      ? `Negócio: ${lead.tipo_negocio}`
      : null,
    lead.site_url ? `Site: ${lead.site_url}` : null,
    lead.pacote_sugerido ? `Pacote sugerido: ${lead.pacote_sugerido}` : null,
    lead.mensagem ? `Mensagem: ${lead.mensagem}` : null,
  ].filter(Boolean);

  const { data: client, error } = await supabase
    .from("intranet_clients")
    .insert({
      name: lead.nome,
      email: lead.email,
      phone: lead.whatsapp,
      status: "prospect",
      source: `Site — ${LEAD_ORIGEM_LABELS[lead.origem]}`,
      notes: detalhes.length ? detalhes.join("\n") : null,
    })
    .select("id")
    .single();

  if (error) throw error;
  await updateLead(lead.id, { status: "convertido", cliente_id: client.id });
}

export const LEAD_STATUS_LABELS: Record<Lead["status"], string> = {
  novo: "Novo",
  contatado: "Contatado",
  convertido: "Virou cliente",
  descartado: "Descartado",
};

export const LEAD_ORIGEM_LABELS: Record<Lead["origem"], string> = {
  banner: "Simulador (modal)",
  simulador: "Simulador",
  home_lead_form: "Formulário da home",
  diagnostico: "Diagnóstico gratuito",
  contato: "Página de contato",
};

// CSV com ";" e BOM: é o formato que o Excel em português abre sem embaralhar acentos e colunas.
export function leadsToCsv(leads: Lead[]) {
  const header = ["Nome", "E-mail", "WhatsApp", "Origem", "Autorizou em", "Recebido em"];
  const cell = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const data = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "");
  const rows = leads.map((l) =>
    [l.nome, l.email, l.whatsapp, LEAD_ORIGEM_LABELS[l.origem], data(l.aceite_em), data(l.created_at)]
      .map(cell)
      .join(";"),
  );
  return "﻿" + [header.map(cell).join(";"), ...rows].join("\r\n");
}
