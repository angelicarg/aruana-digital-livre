import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { listTransactions } from "@/lib/intranet/transactions";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const Route = createFileRoute("/intranet/_authed/relatorios")({
  component: RelatoriosPage,
});

const MONTHS_BACK = 6;

const chartConfig: ChartConfig = {
  recebido: { label: "Recebido", color: "hsl(142, 71%, 45%)" },
  aReceber: { label: "A receber", color: "hsl(38, 92%, 50%)" },
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function useMonthlyRevenue() {
  return useQuery({
    queryKey: ["intranet", "transactions"],
    queryFn: listTransactions,
    select: (transactions) => {
      const now = new Date();
      const months: string[] = [];
      for (let i = MONTHS_BACK - 1; i >= 0; i--) {
        months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
      }

      const totals = new Map(months.map((m) => [m, { recebido: 0, aReceber: 0 }]));

      for (const t of transactions) {
        if (t.type !== "receita") continue;
        const referenceDate = t.paid_date ?? t.due_date;
        if (!referenceDate) continue;
        const key = monthKey(new Date(referenceDate));
        const bucket = totals.get(key);
        if (!bucket) continue;
        if (t.status === "pago") bucket.recebido += Number(t.amount);
        else if (t.status === "pendente" || t.status === "atrasado") bucket.aReceber += Number(t.amount);
      }

      return months.map((key) => ({
        month: monthLabel(key),
        ...totals.get(key)!,
      }));
    },
  });
}

function RelatoriosPage() {
  const { data, isLoading } = useMonthlyRevenue();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Receita recebida vs. a receber nos últimos {MONTHS_BACK} meses.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Receita mensal</CardTitle>
          <CardDescription>Baseado na data de vencimento/pagamento dos lançamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: chartConfig.recebido.color }} />
                  Recebido
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: chartConfig.aReceber.color }} />
                  A receber
                </span>
              </div>
              <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
                <BarChart data={data}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="recebido" fill="var(--color-recebido)" radius={4} />
                  <Bar dataKey="aReceber" fill="var(--color-aReceber)" radius={4} />
                </BarChart>
              </ChartContainer>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
