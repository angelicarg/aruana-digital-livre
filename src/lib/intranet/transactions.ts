import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Transaction = Tables<"intranet_transactions">;
export type TransactionInsert = TablesInsert<"intranet_transactions">;
export type TransactionUpdate = TablesUpdate<"intranet_transactions">;

export type TransactionWithRelations = Transaction & {
  intranet_clients: { name: string } | null;
  intranet_projects: { name: string } | null;
};

export async function listTransactions() {
  const { data, error } = await supabase
    .from("intranet_transactions")
    .select("*, intranet_clients(name), intranet_projects(name)")
    .order("due_date", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data as TransactionWithRelations[];
}

export async function createTransaction(input: TransactionInsert) {
  const { data, error } = await supabase
    .from("intranet_transactions")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, input: TransactionUpdate) {
  const { data, error } = await supabase
    .from("intranet_transactions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("intranet_transactions").delete().eq("id", id);
  if (error) throw error;
}

export const TRANSACTION_STATUS_LABELS: Record<Transaction["status"], string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export const TRANSACTION_TYPE_LABELS: Record<Transaction["type"], string> = {
  receita: "Receita",
  despesa: "Despesa",
};
