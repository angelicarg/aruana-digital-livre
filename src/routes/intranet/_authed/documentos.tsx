import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Download } from "lucide-react";
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  DOCUMENT_CATEGORY_LABELS,
} from "@/lib/intranet/documents";
import { listClients } from "@/lib/intranet/clients";
import { listProjects } from "@/lib/intranet/projects";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteButton } from "@/components/intranet/ConfirmDeleteButton";
import {
  DocumentUploadDialog,
  DOCUMENT_NONE_VALUE,
  type DocumentFormValues,
} from "@/components/intranet/DocumentUploadDialog";

export const Route = createFileRoute("/intranet/_authed/documentos")({
  component: DocumentosPage,
});

function DocumentosPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["intranet", "documents"],
    queryFn: listDocuments,
  });

  const { data: clients } = useQuery({ queryKey: ["intranet", "clients"], queryFn: listClients });
  const { data: projects } = useQuery({ queryKey: ["intranet", "projects"], queryFn: listProjects });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["intranet", "documents"] });

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string }) =>
      deleteDocument(id, storagePath),
    onSuccess: invalidate,
  });

  async function handleDownload(storagePath: string) {
    const url = await getDocumentDownloadUrl(storagePath);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSubmit(values: DocumentFormValues, file: File) {
    uploadMutation.mutate({
      file,
      name: values.name,
      category: values.category,
      client_id: values.client_id === DOCUMENT_NONE_VALUE ? null : values.client_id || null,
      project_id: values.project_id === DOCUMENT_NONE_VALUE ? null : values.project_id || null,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Contratos, propostas e outros arquivos.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Novo documento
        </Button>
      </div>

      <div className="mt-6 rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (documents ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum documento encontrado.
                </TableCell>
              </TableRow>
            )}
            {(documents ?? []).map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell>{DOCUMENT_CATEGORY_LABELS[doc.category]}</TableCell>
                <TableCell>{doc.intranet_clients?.name ?? "—"}</TableCell>
                <TableCell>{doc.intranet_projects?.name ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc.storage_path)}
                    >
                      <Download className="size-4" />
                    </Button>
                    <ConfirmDeleteButton
                      itemLabel={doc.name}
                      onConfirm={() =>
                        deleteMutation.mutate({ id: doc.id, storagePath: doc.storage_path })
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DocumentUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients ?? []}
        projects={projects ?? []}
        onSubmit={handleSubmit}
        submitting={uploadMutation.isPending}
      />
    </div>
  );
}
