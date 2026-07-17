import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  getDealByToken,
  submitImplantacaoPreference,
  createMensalidadeCheckout,
} from "@/lib/api/deals.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PACKAGE_TIER_LABELS: Record<string, string> = {
  essencial: "Essencial",
  profissional: "Profissional",
  avancado: "Avançado",
  sob_medida: "Sob Medida",
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const Route = createFileRoute("/fechar/$id")({
  loader: async ({ params }) => {
    const deal = await getDealByToken({ data: { id: params.id } });
    if (!deal) throw notFound();
    return deal;
  },
  component: FecharNegocioPage,
});

function FecharNegocioPage() {
  const { id } = Route.useParams();
  const initialDeal = Route.useLoaderData();
  const queryClient = useQueryClient();

  const { data: deal } = useQuery({
    queryKey: ["fechar", id],
    queryFn: () => getDealByToken({ data: { id } }),
    initialData: initialDeal,
  });

  if (!deal) return null;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">
          Aruanã Digital
        </p>
        <h1 className="mt-2 font-display text-2xl font-black sm:text-3xl">
          Fechamento — {deal.clientName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pacote {PACKAGE_TIER_LABELS[deal.packageTier] ?? deal.packageTier} · Implantação{" "}
          {formatBRL(deal.setupValue)} · Mensalidade {formatBRL(deal.monthlyValue)}/mês
        </p>
      </div>

      <div className="mt-10 space-y-6">
        <ImplantacaoCard
          dealId={id}
          status={deal.implantacaoStatus}
          cobrePjLink={deal.implantacaoCobrePjLink}
          onSubmitted={() => queryClient.invalidateQueries({ queryKey: ["fechar", id] })}
        />
        <MensalidadeCard
          dealId={id}
          status={deal.mensalidadeStatus}
          monthlyValue={deal.monthlyValue}
        />
      </div>
    </div>
  );
}

function ImplantacaoCard({
  dealId,
  status,
  cobrePjLink,
  onSubmitted,
}: {
  dealId: string;
  status: "pendente" | "preferencia_registrada" | "link_enviado";
  cobrePjLink: string | null;
  onSubmitted: () => void;
}) {
  const [metodo, setMetodo] = useState<"pix" | "cartao">("pix");
  const [parcelas, setParcelas] = useState("1");

  const mutation = useMutation({
    mutationFn: () =>
      submitImplantacaoPreference({
        data: { id: dealId, metodo, parcelas: metodo === "cartao" ? Number(parcelas) : null },
      }),
    onSuccess: (result) => {
      if (result.updated) onSubmitted();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Implantação (pagamento único)</CardTitle>
        <CardDescription>
          Escolha como prefere pagar. Assim que registrar, nossa equipe te envia o link de
          pagamento por e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "pendente" && (
          <div className="space-y-4">
            <RadioGroup value={metodo} onValueChange={(v) => setMetodo(v as "pix" | "cartao")}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pix" id="metodo-pix" />
                <Label htmlFor="metodo-pix">PIX à vista</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="cartao" id="metodo-cartao" />
                <Label htmlFor="metodo-cartao">Cartão de crédito parcelado</Label>
              </div>
            </RadioGroup>

            {metodo === "cartao" && (
              <div className="max-w-[180px]">
                <Label className="mb-1.5 block text-sm">Parcelas</Label>
                <Select value={parcelas} onValueChange={setParcelas}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirmar preferência"
              )}
            </Button>
          </div>
        )}

        {status === "preferencia_registrada" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-brand-green" />
            Preferência registrada — em breve você recebe o link de pagamento por e-mail.
          </p>
        )}

        {status === "link_enviado" && (
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-4 text-brand-green" />
              Link de pagamento enviado por e-mail.
            </p>
            {cobrePjLink && (
              <a
                href={cobrePjLink}
                target="_blank"
                rel="noreferrer"
                className="inline-block font-semibold text-brand-green hover:underline"
              >
                Abrir link de pagamento
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MensalidadeCard({
  dealId,
  status,
  monthlyValue,
}: {
  dealId: string;
  status: "pendente" | "assinatura_criada" | "ativa" | "cancelada" | "falhou";
  monthlyValue: number;
}) {
  const mutation = useMutation({
    mutationFn: () => createMensalidadeCheckout({ data: { id: dealId } }),
    onSuccess: (result) => {
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensalidade (cobrança automática)</CardTitle>
        <CardDescription>
          Cadastre um cartão para a cobrança de {formatBRL(monthlyValue)}/mês ser feita
          automaticamente todo mês, sem precisar lembrar de pagar manualmente. O cadastro do
          cartão é feito diretamente na página segura do Mercado Pago — nunca no nosso site.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "ativa" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-brand-green" />
            Mensalidade automática ativa.
          </p>
        )}

        {status === "assinatura_criada" && (
          <p className="text-sm text-muted-foreground">
            Estamos confirmando o cadastro da sua assinatura — isso pode levar alguns minutos.
            Se você já preencheu o cartão, pode atualizar esta página para ver a confirmação.
          </p>
        )}

        {(status === "pendente" || status === "falhou" || status === "cancelada") && (
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Configurar mensalidade automática"
            )}
          </Button>
        )}

        {mutation.isSuccess && !mutation.data.checkoutUrl && status !== "ativa" && (
          <p className="mt-3 text-sm text-destructive">
            Não foi possível iniciar o cadastro agora. Fale com a gente pelo WhatsApp que
            resolvemos por lá.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
