import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, UserPlus } from "lucide-react";
import {
  listLeads,
  updateLead,
  deleteLead,
  convertLead,
  leadsToCsv,
  LEAD_STATUS_LABELS,
  LEAD_ORIGEM_LABELS,
  type Lead,
} from "@/lib/intranet/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge, type StatusColor } from "@/components/intranet/StatusBadge";
import { ConfirmDeleteButton } from "@/components/intranet/ConfirmDeleteButton";

export const Route = createFileRoute("/intranet/_authed/leads")({
  component: LeadsPage,
});

const STATUS_COLORS: Record<Lead["status"], StatusColor> = {
  novo: "blue",
  contatado: "amber",
  convertido: "green",
  descartado: "gray",
};

const PACOTE_LABELS: Record<NonNullable<Lead["pacote_sugerido"]>, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  avancado: "Avançado",
  sob_medida: "Sob medida",
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const soDigitos = (tel: string) => {
  const d = tel.replace(/\D/g, "");
  return d.length <= 11 ? `55${d}` : d;
};

function LeadsPage() {
  const queryClient = useQueryClient();
  const [origem, setOrigem] = useState<Lead["origem"] | "all">("all");
  const [status, setStatus] = useState<Lead["status"] | "all">("all");
  const [novidades, setNovidades] = useState<"all" | "sim" | "nao">("all");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Lead | null>(null);

  const { data: leads, isLoading, error } = useQuery({
    queryKey: ["intranet", "leads"],
    queryFn: listLeads,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["intranet", "leads"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Lead["status"] }) => updateLead(id, { status }),
    onSuccess: invalidate,
    onError: () => toast.error("Não foi possível mudar o status."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      invalidate();
      setAberto(null);
      toast.success("Lead excluído.");
    },
    onError: () => toast.error("Não foi possível excluir."),
  });

  const convertMutation = useMutation({
    mutationFn: convertLead,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["intranet", "clients"] });
      setAberto(null);
      toast.success("Lead cadastrado em Clientes.");
    },
    onError: () => toast.error("Não foi possível criar o cliente."),
  });

  const termo = busca.trim().toLowerCase();
  const filtrados = (leads ?? []).filter(
    (l) =>
      (origem === "all" || l.origem === origem) &&
      (status === "all" || l.status === status) &&
      (novidades === "all" || l.aceita_novidades === (novidades === "sim")) &&
      (!termo ||
        [l.nome, l.email, l.whatsapp, l.site_url, l.tipo_negocio].some((v) => v?.toLowerCase().includes(termo))),
  );

  const autorizados = (leads ?? []).filter((l) => l.aceita_novidades && l.email);
  const novos = (leads ?? []).filter((l) => l.status === "novo").length;

  function exportar() {
    const blob = new Blob([leadsToCsv(autorizados)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-autorizaram-novidades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos que chegaram pelos formulários do site
            {leads ? ` · ${leads.length} no total, ${novos} sem atendimento` : ""}.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportar} disabled={autorizados.length === 0}>
          <Download className="size-4" />
          Exportar quem autorizou novidades ({autorizados.length})
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar nome, e-mail, telefone ou site"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-72"
          aria-label="Buscar leads"
        />
        <Select value={origem} onValueChange={(v) => setOrigem(v as typeof origem)}>
          <SelectTrigger className="w-52" aria-label="Filtrar por origem">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            {Object.entries(LEAD_ORIGEM_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-44" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={novidades} onValueChange={(v) => setNovidades(v as typeof novidades)}>
          <SelectTrigger className="w-56" aria-label="Filtrar por autorização de novidades">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Novidades: todos</SelectItem>
            <SelectItem value="sim">Autorizaram novidades</SelectItem>
            <SelectItem value="nao">Não autorizaram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recebido</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Novidades</TableHead>
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
            {error && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-destructive">
                  Não foi possível carregar os leads.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtrados.map((lead) => (
              <TableRow key={lead.id} className="cursor-pointer" onClick={() => setAberto(lead)}>
                <TableCell className="whitespace-nowrap text-sm">{dataHora(lead.created_at)}</TableCell>
                <TableCell className="font-medium">{lead.nome}</TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span>{lead.email || "—"}</span>
                    <span className="text-muted-foreground">{lead.whatsapp}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{LEAD_ORIGEM_LABELS[lead.origem]}</TableCell>
                <TableCell>
                  {lead.aceita_novidades ? (
                    <StatusBadge label="Autorizou" color="green" />
                  ) : (
                    <span className="text-sm text-muted-foreground">Não</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={lead.status}
                    onValueChange={(v) => statusMutation.mutate({ id: lead.id, status: v as Lead["status"] })}
                  >
                    <SelectTrigger className="h-8 w-36 border-none p-0 shadow-none" aria-label={`Status de ${lead.nome}`}>
                      <StatusBadge label={LEAD_STATUS_LABELS[lead.status]} color={STATUS_COLORS[lead.status]} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <ConfirmDeleteButton itemLabel={lead.nome} onConfirm={() => deleteMutation.mutate(lead.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={aberto !== null} onOpenChange={(open) => !open && setAberto(null)}>
        <DialogContent className="max-w-lg">
          {aberto && (
            <>
              <DialogHeader>
                <DialogTitle>{aberto.nome}</DialogTitle>
                <DialogDescription>
                  {LEAD_ORIGEM_LABELS[aberto.origem]} · {dataHora(aberto.created_at)}
                </DialogDescription>
              </DialogHeader>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">WhatsApp</dt>
                <dd>
                  <a
                    href={`https://wa.me/${soDigitos(aberto.whatsapp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {aberto.whatsapp}
                  </a>
                </dd>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>
                  {aberto.email ? (
                    <a href={`mailto:${aberto.email}`} className="underline">
                      {aberto.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt className="text-muted-foreground">Negócio</dt>
                <dd>{aberto.tipo_negocio}</dd>
                {aberto.site_url && (
                  <>
                    <dt className="text-muted-foreground">Site</dt>
                    <dd className="break-all">{aberto.site_url}</dd>
                  </>
                )}
                {aberto.pacote_sugerido && (
                  <>
                    <dt className="text-muted-foreground">Pacote sugerido</dt>
                    <dd>{PACOTE_LABELS[aberto.pacote_sugerido]}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Novidades</dt>
                <dd>
                  {aberto.aceita_novidades && aberto.aceite_em
                    ? `Autorizou em ${dataHora(aberto.aceite_em)}`
                    : "Não autorizou — responder só ao pedido"}
                </dd>
              </dl>

              {aberto.mensagem && (
                <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{aberto.mensagem}</p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {aberto.cliente_id ? (
                  <Button variant="outline" asChild>
                    <Link to="/intranet/clientes">Já está em Clientes</Link>
                  </Button>
                ) : (
                  <Button
                    className="gap-2"
                    onClick={() => convertMutation.mutate(aberto)}
                    disabled={convertMutation.isPending}
                  >
                    <UserPlus className="size-4" />
                    {convertMutation.isPending ? "Cadastrando…" : "Virar cliente"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
