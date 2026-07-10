import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Document = Tables<"intranet_documents">;
export type DocumentInsert = TablesInsert<"intranet_documents">;

export type DocumentWithRelations = Document & {
  intranet_clients: { name: string } | null;
  intranet_projects: { name: string } | null;
};

const BUCKET = "intranet-documents";

export async function listDocuments() {
  const { data, error } = await supabase
    .from("intranet_documents")
    .select("*, intranet_clients(name), intranet_projects(name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DocumentWithRelations[];
}

export async function uploadDocument(input: {
  file: File;
  name: string;
  category: Document["category"];
  client_id: string | null;
  project_id: string | null;
}) {
  const folder = input.client_id ?? "geral";
  const storagePath = `${folder}/${crypto.randomUUID()}-${input.file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("intranet_documents")
    .insert({
      name: input.name,
      category: input.category,
      client_id: input.client_id,
      project_id: input.project_id,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDocumentDownloadUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(id: string, storagePath: string) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from("intranet_documents").delete().eq("id", id);
  if (error) throw error;
}

export const DOCUMENT_CATEGORY_LABELS: Record<Document["category"], string> = {
  contrato: "Contrato",
  proposta: "Proposta",
  outro: "Outro",
};
