import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/intranet/login")({
  head: () => ({
    meta: [{ title: "Login — Intranet | Aruanã Digital" }],
  }),
  component: IntranetLoginPage,
});

function IntranetLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /**
   * Pede o e-mail de redefinição.
   *
   * ⚠️ **A resposta é a mesma exista ou não a conta.** `resetPasswordForEmail`
   * não distingue os dois casos de propósito, e a mensagem aqui também não
   * pode: um retorno diferente para e-mail cadastrado transformaria esta tela
   * num verificador de quem tem acesso à intranet.
   */
  async function pedirRedefinicao() {
    setError(null);
    setAviso(null);

    if (!email.trim()) {
      setError("Escreva o seu e-mail no campo acima primeiro.");
      return;
    }

    setEnviando(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/intranet/nova-senha`,
    });
    setEnviando(false);
    setAviso(
      "Se existir uma conta com esse e-mail, o link de redefinição chegou lá. Ele vale por uma hora.",
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    const { data: isAdmin } = await supabase.rpc("is_intranet_admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      setError("Esta conta não tem acesso à intranet.");
      setLoading(false);
      return;
    }

    navigate({ to: "/intranet" });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Intranet Aruanã Digital</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesso restrito à equipe.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {aviso && <p className="text-sm text-muted-foreground">{aviso}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>

          {/* Botão e não link: a ação acontece aqui mesmo, com o e-mail que já
              está no campo acima. `type="button"` porque dentro de um form o
              padrão é submeter — sem isso, clicar aqui tentaria entrar. */}
          <button
            type="button"
            onClick={pedirRedefinicao}
            disabled={enviando}
            className="w-full text-sm text-muted-foreground underline underline-offset-4 transition hover:text-foreground disabled:opacity-50"
          >
            {enviando ? "Enviando…" : "Esqueci minha senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
