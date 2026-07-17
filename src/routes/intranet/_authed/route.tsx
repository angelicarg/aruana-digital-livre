import { useEffect } from "react";
import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Handshake,
  Wallet,
  CalendarClock,
  FileText,
  BarChart3,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const NAV_ITEMS = [
  { to: "/intranet", label: "Painel", icon: LayoutDashboard },
  { to: "/intranet/clientes", label: "Clientes", icon: Users },
  { to: "/intranet/projetos", label: "Projetos", icon: Briefcase },
  { to: "/intranet/negocios", label: "Negócios", icon: Handshake },
  { to: "/intranet/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/intranet/reunioes", label: "Reuniões", icon: CalendarClock },
  { to: "/intranet/documentos", label: "Documentos", icon: FileText },
  { to: "/intranet/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

export const Route = createFileRoute("/intranet/_authed")({
  beforeLoad: async () => {
    // A sessão do Supabase Auth vive no localStorage do navegador — no SSR
    // (usado em `vite dev`; a build de produção é uma SPA estática, sem SSR
    // por requisição) esse storage não existe. O componente reforça o guard
    // no client logo após montar.
    if (typeof window === "undefined") return;

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/intranet/login" });
    }
  },
  component: IntranetAuthedLayout,
});

function IntranetAuthedLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/intranet/login" });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate({ to: "/intranet/login" });
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/intranet/login" });
  }

  return (
    <SidebarProvider>
      <Toaster position="top-right" />
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-3">
          <span className="text-sm font-semibold tracking-tight">Aruanã Digital</span>
          <span className="text-xs text-muted-foreground">Intranet</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <Link
                        to={item.to}
                        activeOptions={{ exact: item.to === "/intranet" }}
                        activeProps={{ "data-active": true }}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
