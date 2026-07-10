import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Client = Tables<"intranet_clients">;
export type ClientInsert = TablesInsert<"intranet_clients">;
export type ClientUpdate = TablesUpdate<"intranet_clients">;

export async function listClients() {
  const { data, error } = await supabase
    .from("intranet_clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createClient(input: ClientInsert) {
  const { data, error } = await supabase.from("intranet_clients").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateClient(id: string, input: ClientUpdate) {
  const { data, error } = await supabase
    .from("intranet_clients")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("intranet_clients").delete().eq("id", id);
  if (error) throw error;
}

export const CLIENT_STATUS_LABELS: Record<Client["status"], string> = {
  lead: "Lead",
  prospect: "Prospecto",
  active: "Ativo",
  paused: "Pausado",
  past: "Encerrado",
};
