import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Copy, Send, FileSignature, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  listDeals,
  listPendingCharges,
  createDeal,
  IMPLANTACAO_STATUS_LABELS,
  MENSALIDADE_STATUS_LABELS,
  IMPLANTACAO_METODO_LABELS,
  CONTRATO_STATUS_LABELS,
  PACKAGE_TIER_LABELS,
  type DealWithClient,
} from "@/lib/intranet/deals";
import { listClients } from "@/lib/intranet/clients";
import { listProjects } from "@/lib/intranet/projects";
import { listDocuments } from "@/lib/intranet/documents";
import { sendImplantacaoPaymentLink } from "@/lib/api/deals.functions";
import { syncContractStatus } from "@/lib/api/signature.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge, type StatusColor } from "@/components/intranet/StatusBadge";
import { DealFormDialog, type DealFormValues } from "@/components/intranet/DealFormDialog";
import { SendContractDialog } from "@/components/intranet/SendContractDialog";

export const Route = createFileRoute("/intranet/_authed/negocios")({
  component: NegociosPage,
});

const IMPLANTACAO_COLORS: Record<DealWithClient["implantacao_status"], StatusColor> = {
  pendente: "gray",
  preferencia_registrada: "amber",
  link_enviado: "green",
};

const MENSALIDADE_COLORS: Record<DealWithClient["mensalidade_status"], StatusColor> = {
  pendente: "gray",
  assinatura_criada: "amber",
  ativa: "green",
  cancelada: "red",
  falhou: "red",
};

const CONTRATO_COLORS: Record<DealWithClient["contrato_status"], StatusColor> = {
  pendente: "gray",
  enviado: "amber",
  assinado: "green",
  rejeitado: "red",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dealLink(id: string) {
  return `https://aruanadigital.com/fechar/${id}`;
}

function NegociosPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contractDeal, setContractDeal] = useState<DealWithClient | null>(null);

  const { data: deals, isLoading } = useQuery({
    queryKey: ["intranet", "deals"],
    queryFn: listDeals,
  });

  const { data: pendingCharges, isLoading: pendingLoading } = useQuery({
    queryKey: ["intranet", "deals", "pending"],
    queryFn: listPendingCharges,
  });

  const { data: clients } = useQuery({
    queryKey: ["intranet", "clients"],
    queryFn: listClients,
  });

  const { data: projects } = useQuery({
    queryKey: ["intranet", "projects"],
    queryFn: listProjects,
  });

  const { data: documents } = useQuery({
    queryKey: ["intranet", "documents"],
    queryFn: listDocuments,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["intranet", "deals"] });
  };

  const contractDocuments = (documents ?? []).filter(
    (doc) => doc.category === "contrato" && doc.client_id === contractDeal?.client_id,
  );

  const createMutation = useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
    },
  });

  function handleSubmit(values: DealFormValues) {
    createMutation.mutate({
      client_id: values.client_id,
      project_id: values.project_id || null,
      package_tier: values.package_tier,
      setup_value: Number(values.setup_value),
      monthly_value: Number(values.monthly_value),
    });
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(dealLink(id));
    toast.success("Link copiado.");
  }

  // Rede de segurança do webhook: relê o status direto da Autentique.
  const syncMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("sem sessão");
      return syncContractStatus({ data: { dealId, accessToken } });
    },
    onSuccess: (result) => {
      if (result.synced) {
        invalidate();
        const mensagens = {
          assinado: "Contrato assinado por todos os signatários.",
          rejeitado: "A assinatura foi recusada.",
          enviado: "Ainda aguardando assinatura de algum signatário.",
        } as const;
        toast.success(mensagens[result.status]);
        return;
      }
      const erros: Record<string, string> = {
        not_admin: "Sessão sem permissão. Entre novamente.",
        not_configured: "Integração da Autentique não configurada.",
        deal_not_found: "Negócio não encontrado.",
        no_contract: "Este negócio ainda não tem contrato enviado.",
        autentique_error: "Não foi possível consultar a Autentique agora.",
        save_failed: "Status lido, mas houve falha ao salvar.",
        unexpected_error: "Erro inesperado ao atualizar o status.",
      };
      toast.error(erros[result.reason] ?? "Não foi possível atualizar o status.");
    },
    onError: () => toast.error("Não foi possível atualizar o status."),
  });

  // Sincronização automática ao abrir a página: a Autentique não está
  // chamando nosso webhook de forma confiável (o endpoint responde, mas o
  // status nunca virou sozinho — ver comentário em api.autentique-webhook.ts),
  // então relemos o status de cada contrato pendente aqui. Cada negócio é
  // consultado no máximo uma vez por carregamento; o botão manual continua
  // disponível para reconsultar na hora.
  const autoSyncRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pendentes = (deals ?? []).filter(
      (deal) =>
        deal.contrato_status === "enviado" &&
        deal.contrato_autentique_id &&
        !autoSyncRef.current.has(deal.id),
    );
    if (pendentes.length === 0) return;

    // Marca antes de qualquer await — senão a re-execução do efeito (StrictMode
    // em dev, ou um refetch rápido) dispararia a mesma consulta duas vezes.
    for (const deal of pendentes) autoSyncRef.current.add(deal.id);

    let cancelado = false;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      let algumMudou = false;
      for (const deal of pendentes) {
        try {
          const resultado = await syncContractStatus({ data: { dealId: deal.id, accessToken } });
          if (resultado.synced && resultado.status !== "enviado") algumMudou = true;
        } catch {
          // Silencioso de propósito: é uma atualização de fundo, e o botão
          // manual dá o retorno de erro quando ela for pedida explicitamente.
        }
      }

      if (algumMudou && !cancelado) invalidate();
    })();

    return () => {
      cancelado = true;
    };
  }, [deals]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Negócios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Links de fechamento por cliente — implantação e mensalidade.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Novo negócio
        </Button>
      </div>

      <Tabs defaultValue="negocios" className="mt-6">
        <TabsList>
          <TabsTrigger value="negocios">Negócios</TabsTrigger>
          <TabsTrigger value="pendentes">
            Cobranças Pendentes
            {pendingCharges && pendingCharges.length > 0 ? ` (${pendingCharges.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="negocios">
          <div className="mt-4 rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Implantação</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Status implantação</TableHead>
                  <TableHead>Status mensalidade</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && (deals ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum negócio criado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {(deals ?? []).map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">
                      {deal.intranet_clients?.name ?? "—"}
                    </TableCell>
                    <TableCell>{PACKAGE_TIER_LABELS[deal.package_tier]}</TableCell>
                    <TableCell>{formatCurrency(deal.setup_value)}</TableCell>
                    <TableCell>{formatCurrency(deal.monthly_value)}/mês</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={IMPLANTACAO_STATUS_LABELS[deal.implantacao_status]}
                        color={IMPLANTACAO_COLORS[deal.implantacao_status]}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={MENSALIDADE_STATUS_LABELS[deal.mensalidade_status]}
                        color={MENSALIDADE_COLORS[deal.mensalidade_status]}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          label={CONTRATO_STATUS_LABELS[deal.contrato_status]}
                          color={CONTRATO_COLORS[deal.contrato_status]}
                        />
                        {(deal.contrato_status === "pendente" ||
                          deal.contrato_status === "rejeitado") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Enviar contrato para assinatura"
                            onClick={() => setContractDeal(deal)}
                          >
                            <FileSignature className="size-4" />
                          </Button>
                        )}
                        {deal.contrato_status === "enviado" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Atualizar status pela Autentique"
                            disabled={syncMutation.isPending}
                            onClick={() => syncMutation.mutate(deal.id)}
                          >
                            <RefreshCw
                              className={`size-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
                            />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => copyLink(deal.id)}>
                        <Copy className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pendentes">
          <div className="mt-4 space-y-3">
            {pendingLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!pendingLoading && (pendingCharges ?? []).length === 0 && (
              <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma cobrança pendente.
              </p>
            )}
            {(pendingCharges ?? []).map((deal) => (
              <PendingChargeRow key={deal.id} deal={deal} onSent={invalidate} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <DealFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients ?? []}
        projects={projects ?? []}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending}
      />

      <SendContractDialog
        open={contractDeal !== null}
        onOpenChange={(open) => {
          if (!open) setContractDeal(null);
        }}
        deal={contractDeal}
        contractDocuments={contractDocuments}
        onSent={invalidate}
      />
    </div>
  );
}

function PendingChargeRow({
  deal,
  onSent,
}: {
  deal: DealWithClient;
  onSent: () => void;
}) {
  const [link, setLink] = useState(deal.implantacao_cobre_pj_link ?? "");
  const alreadySent = deal.implantacao_status === "link_enviado";

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada, faça login novamente.");

      return sendImplantacaoPaymentLink({
        data: { id: deal.id, cobrePjLink: link, accessToken },
      });
    },
    onSuccess: (result) => {
      if (!result.updated) {
        toast.error("Não foi possível salvar o link. Confira sua sessão e tente de novo.");
        return;
      }
      if (result.emailSent) {
        toast.success("Link salvo e e-mail enviado ao cliente.");
      } else {
        toast.warning("Link salvo, mas o e-mail falhou — copie e envie manualmente.");
      }
      onSent();
    },
    onError: () => {
      toast.error("Não foi possível salvar o link.");
    },
  });

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{deal.intranet_clients?.name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">
            {deal.implantacao_metodo ? IMPLANTACAO_METODO_LABELS[deal.implantacao_metodo] : "—"}
            {deal.implantacao_metodo === "cartao" && deal.implantacao_parcelas
              ? ` em ${deal.implantacao_parcelas}x`
              : ""}
            {" · "}
            {formatCurrency(deal.setup_value)}
          </p>
        </div>
        {alreadySent && (
          <StatusBadge label="Link já enviado — confira se chegou" color="amber" />
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Cole aqui o link do Cobre PJ"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="max-w-md"
        />
        <Button
          onClick={() => mutation.mutate()}
          disabled={!link || mutation.isPending}
          className="gap-2"
        >
          <Send className="size-4" />
          {mutation.isPending ? "Enviando…" : alreadySent ? "Reenviar" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
