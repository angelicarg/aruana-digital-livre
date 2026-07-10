import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Wallet, CalendarClock, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/intranet/_authed/")({
  component: IntranetDashboard,
});

function startOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function endOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

function useDashboardSummary() {
  return useQuery({
    queryKey: ["intranet", "dashboard-summary"],
    queryFn: async () => {
      const [clientsActive, projectsActive, meetingsUpcoming, receivable] = await Promise.all([
        supabase
          .from("intranet_clients")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("intranet_projects")
          .select("id", { count: "exact", head: true })
          .eq("status", "em_andamento"),
        supabase
          .from("intranet_meetings")
          .select("id", { count: "exact", head: true })
          .eq("status", "agendado")
          .gte("scheduled_at", new Date().toISOString()),
        supabase
          .from("intranet_transactions")
          .select("amount")
          .eq("type", "receita")
          .in("status", ["pendente", "atrasado"])
          .gte("due_date", startOfMonthIso())
          .lte("due_date", endOfMonthIso()),
      ]);

      const receivableTotal = (receivable.data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        clientsActive: clientsActive.count ?? 0,
        projectsActive: projectsActive.count ?? 0,
        meetingsUpcoming: meetingsUpcoming.count ?? 0,
        receivableTotal,
      };
    },
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function IntranetDashboard() {
  const { data, isLoading } = useDashboardSummary();

  const cards = [
    {
      label: "Clientes ativos",
      value: data?.clientsActive ?? 0,
      icon: Users,
    },
    {
      label: "Projetos em andamento",
      value: data?.projectsActive ?? 0,
      icon: Briefcase,
    },
    {
      label: "A receber este mês",
      value: formatCurrency(data?.receivableTotal ?? 0),
      icon: Wallet,
    },
    {
      label: "Próximas reuniões",
      value: data?.meetingsUpcoming ?? 0,
      icon: CalendarClock,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
      <p className="mt-1 text-sm text-muted-foreground">Visão geral da operação da Aruanã Digital.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "…" : card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
