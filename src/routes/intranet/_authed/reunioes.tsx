import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  MEETING_STATUS_LABELS,
  MEETING_TYPE_LABELS,
  type Meeting,
  type MeetingUpdate,
} from "@/lib/intranet/meetings";
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
import {
  MeetingFormDialog,
  MEETING_NONE_VALUE,
  type MeetingFormValues,
} from "@/components/intranet/MeetingFormDialog";

export const Route = createFileRoute("/intranet/_authed/reunioes")({
  component: ReunioesPage,
});

const STATUS_COLORS: Record<Meeting["status"], StatusColor> = {
  agendado: "blue",
  realizado: "green",
  cancelado: "red",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReunioesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Meeting["status"] | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["intranet", "meetings"],
    queryFn: listMeetings,
  });

  const { data: clients } = useQuery({ queryKey: ["intranet", "clients"], queryFn: listClients });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["intranet", "meetings"] });

  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: MeetingUpdate }) =>
      updateMeeting(id, values),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: invalidate,
  });

  const filteredMeetings = (meetings ?? []).filter(
    (m) => statusFilter === "all" || m.status === statusFilter,
  );

  function handleNew() {
    setEditingMeeting(null);
    setDialogOpen(true);
  }

  function handleEdit(meeting: Meeting) {
    setEditingMeeting(meeting);
    setDialogOpen(true);
  }

  function handleSubmit(values: MeetingFormValues) {
    const payload = {
      title: values.title,
      client_id: values.client_id === MEETING_NONE_VALUE ? null : values.client_id || null,
      meeting_type: values.meeting_type,
      scheduled_at: values.scheduled_at,
      status: values.status,
      notes: values.notes || null,
    };

    if (editingMeeting) {
      updateMutation.mutate({ id: editingMeeting.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reuniões</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agenda de reuniões com prospects e clientes.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="size-4" />
          Nova reunião
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(MEETING_STATUS_LABELS).map(([value, label]) => (
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
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data/hora</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredMeetings.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma reunião encontrada.
                </TableCell>
              </TableRow>
            )}
            {filteredMeetings.map((m) => (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => handleEdit(m)}>
                <TableCell className="font-medium">{m.title}</TableCell>
                <TableCell>{m.intranet_clients?.name ?? "—"}</TableCell>
                <TableCell>{MEETING_TYPE_LABELS[m.meeting_type]}</TableCell>
                <TableCell>{formatDateTime(m.scheduled_at)}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={MEETING_STATUS_LABELS[m.status]}
                    color={STATUS_COLORS[m.status]}
                  />
                </TableCell>
                <TableCell>
                  <ConfirmDeleteButton
                    itemLabel={m.title}
                    onConfirm={() => deleteMutation.mutate(m.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MeetingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meeting={editingMeeting}
        clients={clients ?? []}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
