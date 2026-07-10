import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  type Transaction,
  type TransactionUpdate,
} from "@/lib/intranet/transactions";
import { listClients } from "@/lib/intranet/clients";
import { listProjects } from "@/lib/intranet/projects";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  TransactionFormDialog,
  TRANSACTION_NONE_VALUE,
  type TransactionFormValues,
} from "@/components/intranet/TransactionFormDialog";

export const Route = createFileRoute("/intranet/_authed/financeiro")({
  component: FinanceiroPage,
});

const STATUS_COLORS: Record<Transaction["status"], StatusColor> = {
  pendente: "amber",
  pago: "green",
  atrasado: "red",
  cancelado: "gray",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FinanceiroPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Transaction["status"] | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["intranet", "transactions"],
    queryFn: listTransactions,
  });

  const { data: clients } = useQuery({ queryKey: ["intranet", "clients"], queryFn: listClients });
  const { data: projects } = useQuery({ queryKey: ["intranet", "projects"], queryFn: listProjects });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["intranet", "transactions"] });

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TransactionUpdate }) =>
      updateTransaction(id, values),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: invalidate,
  });

  const allTransactions = transactions ?? [];
  const filteredTransactions = allTransactions.filter(
    (t) => statusFilter === "all" || t.status === statusFilter,
  );

  const totalReceived = allTransactions
    .filter((t) => t.type === "receita" && t.status === "pago")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalReceivable = allTransactions
    .filter((t) => t.type === "receita" && (t.status === "pendente" || t.status === "atrasado"))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalOverdue = allTransactions
    .filter((t) => t.type === "receita" && t.status === "atrasado")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  function handleNew() {
    setEditingTransaction(null);
    setDialogOpen(true);
  }

  function handleEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setDialogOpen(true);
  }

  function handleSubmit(values: TransactionFormValues) {
    const payload = {
      type: values.type,
      description: values.description,
      amount: Number(values.amount),
      client_id: values.client_id === TRANSACTION_NONE_VALUE ? null : values.client_id || null,
      project_id: values.project_id === TRANSACTION_NONE_VALUE ? null : values.project_id || null,
      due_date: values.due_date || null,
      paid_date: values.paid_date || null,
      status: values.status,
    };

    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">Receitas, despesas e cobranças.</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="size-4" />
          Novo lançamento
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalReceived)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A receber</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(totalReceivable)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalOverdue)}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
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
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
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
            {!isLoading && filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            )}
            {filteredTransactions.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => handleEdit(t)}>
                <TableCell className="font-medium">{t.description}</TableCell>
                <TableCell>{TRANSACTION_TYPE_LABELS[t.type]}</TableCell>
                <TableCell>{t.intranet_clients?.name ?? "—"}</TableCell>
                <TableCell>{formatCurrency(Number(t.amount))}</TableCell>
                <TableCell>{t.due_date ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={TRANSACTION_STATUS_LABELS[t.status]}
                    color={STATUS_COLORS[t.status]}
                  />
                </TableCell>
                <TableCell>
                  <ConfirmDeleteButton
                    itemLabel={t.description}
                    onConfirm={() => deleteMutation.mutate(t.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editingTransaction}
        clients={clients ?? []}
        projects={projects ?? []}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
