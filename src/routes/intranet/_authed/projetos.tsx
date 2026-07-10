import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  PROJECT_STATUS_LABELS,
  PACKAGE_TIER_LABELS,
  type Project,
  type ProjectUpdate,
} from "@/lib/intranet/projects";
import { listClients } from "@/lib/intranet/clients";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, type StatusColor } from "@/components/intranet/StatusBadge";
import { ConfirmDeleteButton } from "@/components/intranet/ConfirmDeleteButton";
import { ProjectFormDialog, type ProjectFormValues } from "@/components/intranet/ProjectFormDialog";

export const Route = createFileRoute("/intranet/_authed/projetos")({
  component: ProjetosPage,
});

const STATUS_COLORS: Record<Project["status"], StatusColor> = {
  proposta: "blue",
  em_andamento: "green",
  pausado: "amber",
  concluido: "gray",
  cancelado: "red",
};

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProjetosPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Project["status"] | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["intranet", "projects"],
    queryFn: listProjects,
  });

  const { data: clients } = useQuery({
    queryKey: ["intranet", "clients"],
    queryFn: listClients,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["intranet", "projects"] });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProjectUpdate }) =>
      updateProject(id, values),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: invalidate,
  });

  const filteredProjects = (projects ?? []).filter(
    (p) => statusFilter === "all" || p.status === statusFilter,
  );

  function handleNew() {
    setEditingProject(null);
    setDialogOpen(true);
  }

  function handleEdit(project: Project) {
    setEditingProject(project);
    setDialogOpen(true);
  }

  function handleSubmit(values: ProjectFormValues) {
    const payload = {
      client_id: values.client_id,
      name: values.name,
      package_tier: (values.package_tier || null) as ProjectUpdate["package_tier"],
      status: values.status,
      setup_value: values.setup_value ? Number(values.setup_value) : null,
      monthly_value: values.monthly_value ? Number(values.monthly_value) : null,
      start_date: values.start_date || null,
      notes: values.notes || null,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhamento dos projetos de cada cliente.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="size-4" />
          Novo projeto
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pacote</TableHead>
              <TableHead>Implantação</TableHead>
              <TableHead>Mensalidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredProjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum projeto encontrado.
                </TableCell>
              </TableRow>
            )}
            {filteredProjects.map((project) => (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => handleEdit(project)}
              >
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.intranet_clients?.name ?? "—"}</TableCell>
                <TableCell>
                  {project.package_tier ? PACKAGE_TIER_LABELS[project.package_tier] : "—"}
                </TableCell>
                <TableCell>{formatCurrency(project.setup_value)}</TableCell>
                <TableCell>{formatCurrency(project.monthly_value)}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={PROJECT_STATUS_LABELS[project.status]}
                    color={STATUS_COLORS[project.status]}
                  />
                </TableCell>
                <TableCell>
                  <ConfirmDeleteButton
                    itemLabel={project.name}
                    onConfirm={() => deleteMutation.mutate(project.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        clients={clients ?? []}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
