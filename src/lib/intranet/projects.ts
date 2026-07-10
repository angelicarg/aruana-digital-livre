import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Project = Tables<"intranet_projects">;
export type ProjectInsert = TablesInsert<"intranet_projects">;
export type ProjectUpdate = TablesUpdate<"intranet_projects">;

export type ProjectWithClient = Project & { intranet_clients: { name: string } | null };

export async function listProjects() {
  const { data, error } = await supabase
    .from("intranet_projects")
    .select("*, intranet_clients(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ProjectWithClient[];
}

export async function createProject(input: ProjectInsert) {
  const { data, error } = await supabase.from("intranet_projects").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, input: ProjectUpdate) {
  const { data, error } = await supabase
    .from("intranet_projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("intranet_projects").delete().eq("id", id);
  if (error) throw error;
}

export const PROJECT_STATUS_LABELS: Record<Project["status"], string> = {
  proposta: "Proposta",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PACKAGE_TIER_LABELS: Record<
  NonNullable<Project["package_tier"]>,
  string
> = {
  essencial: "Essencial",
  profissional: "Profissional",
  avancado: "Avançado",
  sob_medida: "Sob Medida",
};
