import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/intranet/nova-senha")({
  head: () => ({
    meta: [
      { title: "Nova senha — Intranet | Aruanã Digital" },
      // A página só existe para quem chegou pelo link do e-mail; indexá-la não
      // serve a ninguém e ainda expõe o caminho de recuperação na busca.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NovaSenhaPage,
});

/** Mínimo que exigimos aqui. O padrão do Supabase é 6; oito é pouco mais e
 *  ainda é curto — o que segura a conta de verdade é o e-mail de recuperação,
 *  não o comprimento. */
const MINIMO = 8;

/**
 * Define uma senha nova a partir do link de recuperação.
 *
 * O fluxo: o link do e-mail traz o token, o cliente do Supabase o converte em
 * sessão sozinho (`detectSessionInUrl` está ligado por padrão) e é essa sessão
 * temporária que autoriza a troca. Por isso a página não pede a senha antiga.
 *
 * ⚠️ **Esperar o `PASSWORD_RECOVERY` sozinho não basta.** O cliente pode
 * estabelecer a sessão antes deste componente montar, e aí o evento já passou e
 * a tela ficaria esperando para sempre. Por isso são dois caminhos: o ouvinte
 * e uma leitura direta da sessão.
 *
 * ⚠️ **O endereço de retorno precisa estar na lista do Supabase.** Em
 * Authentication → URL Configuration → Redirect URLs. Fora da lista, o link do
 * e-mail cai na home sem token e esta página diz que o link é inválido — o
 * sintoma não aponta para a configuração, então fica registrado aqui.
 */
function NovaSenhaPage() {
  const navigate = useNavigate();
  const [pronta, setPronta] = useState<"verificando" | "valida" | "invalida">("verificando");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;

    const { data: escuta } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!vivo) return;
      if (evento === "PASSWORD_RECOVERY" || sessao) setPronta("valida");
    });

    // O outro caminho: a sessão pode já existir quando esta tela monta.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!vivo) return;
      setPronta((antes) => (data.session ? "valida" : antes === "valida" ? "valida" : "invalida"));
    })();

    return () => {
      vivo = false;
      escuta.subscription.unsubscribe();
    };
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < MINIMO) {
      setErro(`A senha precisa ter pelo menos ${MINIMO} caracteres.`);
      return;
    }
    if (senha !== repetir) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      // A mensagem do Supabase vem em inglês e às vezes é técnica demais para
      // quem só quer voltar a entrar.
      setErro("Não deu para salvar a senha. Peça um link novo e tente de novo.");
      return;
    }

    // Trocar a senha deixa a pessoa autenticada, mas autenticada não é o mesmo
    // que ter acesso: a intranet é allowlist. Sem esta checagem, quem não é da
    // equipe sairia daqui com sessão e esbarraria num redirecionamento seco
    // dentro da área restrita, sem entender por quê.
    const { data: ehAdmin } = await supabase.rpc("is_intranet_admin");
    if (!ehAdmin) {
      await supabase.auth.signOut();
      setSalvando(false);
      setErro("Senha alterada, mas esta conta não tem acesso à intranet.");
      return;
    }

    navigate({ to: "/intranet" });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Definir uma nova senha</h1>

        {pronta === "verificando" && (
          <p className="mt-4 text-sm text-muted-foreground">Conferindo o link…</p>
        )}

        {pronta === "invalida" && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Este link não vale mais. Eles expiram em uma hora e só funcionam uma vez.
            </p>
            <Button className="mt-5 w-full" onClick={() => navigate({ to: "/intranet/login" })}>
              Pedir um link novo
            </Button>
          </>
        )}

        {pronta === "valida" && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha a senha que você vai usar para entrar na intranet.
            </p>
            <form onSubmit={salvar} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input
                  id="senha"
                  type="password"
                  // Diz ao gerenciador de senhas que é cadastro de senha nova, e
                  // não login: sem isso ele oferece a senha antiga, que é
                  // exatamente a que não serve mais.
                  autoComplete="new-password"
                  minLength={MINIMO}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repetir">Repita a senha</Label>
                <Input
                  id="repetir"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={repetir}
                  onChange={(e) => setRepetir(e.target.value)}
                />
              </div>

              {erro && <p className="text-sm text-destructive">{erro}</p>}

              <Button type="submit" className="w-full" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar e entrar"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
