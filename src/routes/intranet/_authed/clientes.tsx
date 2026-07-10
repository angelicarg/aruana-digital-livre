import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  CLIENT_STATUS_LABELS,
  type Client,
  type ClientUpdate,
} from "@/lib/intranet/clients";
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
import { ClientFormDialog, type ClientFormValues } from "@/components/intranet/ClientFormDialog";

export const Route = createFileRoute("/intranet/_authed/clientes")({
  component: ClientesPage,
});

const STATUS_COLORS: Record<Client["status"], StatusColor> = {
  lead: "gray",
  prospect: "blue",
  active: "green",
  paused: "amber",
  past: "red",
};

function ClientesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Client["status"] | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["intranet", "clients"],
    queryFn: listClients,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["intranet", "clients"] });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ClientUpdate }) =>
      updateClient(id, values),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: invalidate,
  });

  const filteredClients = (clients ?? []).filter(
    (c) => statusFilter === "all" || c.status === statusFilter,
  );

  function handleNew() {
    setEditingClient(null);
    setDialogOpen(true);
  }

  function handleEdit(client: Client) {
    setEditingClient(client);
    setDialogOpen(true);
  }

  function handleSubmit(values: ClientFormValues) {
    const payload = {
      ...values,
      company: values.company || null,
      email: values.email || null,
      phone: values.phone || null,
      source: values.source || null,
      notes: values.notes || null,
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastro de leads, prospectos e clientes.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="size-4" />
          Novo cliente
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
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
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
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
            {!isLoading && filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
            {filteredClients.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => handleEdit(client)}
              >
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.company || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span>{client.email || "—"}</span>
                    <span className="text-muted-foreground">{client.phone || ""}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={CLIENT_STATUS_LABELS[client.status]}
                    color={STATUS_COLORS[client.status]}
                  />
                </TableCell>
                <TableCell>
                  <ConfirmDeleteButton
                    itemLabel={client.name}
                    onConfirm={() => deleteMutation.mutate(client.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editingClient}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
