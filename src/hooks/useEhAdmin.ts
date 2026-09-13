import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * A pessoa que está olhando é da allowlist da intranet?
 *
 * Usa a mesma `is_intranet_admin()` que o login da intranet consulta, e não
 * "está autenticada": **a credencial de visitante dos demos é pública**, está
 * impressa na página `/cases` para qualquer um copiar. Se o critério fosse
 * estar logado, quem leu aquela página poderia conduzir a aula.
 *
 * ⚠️ **Isto é visibilidade de interface, não autorização.** O canal da sala é
 * público — quem souber o código entra e, com o console aberto, pode emitir
 * um evento de aula sem passar por aqui. O que este gancho decide é quem *vê*
 * o painel, e isso basta enquanto a sala é protótipo com `noindex` e código de
 * sala. Fechar de verdade exige canal privado com RLS em `realtime.messages`,
 * que é mudança no canal que custou a estabilizar — vale quando a sala abrir
 * para visitante de verdade, e está anotado como pendência.
 */
export function useEhAdmin(): boolean {
  const [ehAdmin, setEhAdmin] = useState(false);

  useEffect(() => {
    let vivo = true;

    async function conferir() {
      // Sem sessão nem chama a função: numa sala que é quase toda de gente
      // anônima, esta é a saída para praticamente todo mundo.
      const { data: sessao } = await supabase.auth.getSession();
      if (!vivo) return;
      if (!sessao.session) return setEhAdmin(false);

      const { data, error } = await supabase.rpc("is_intranet_admin");
      if (!vivo) return;
      // Erro vira "não é admin". A falha fecha o painel em vez de abrir —
      // numa dúvida sobre permissão, a resposta segura é não.
      setEhAdmin(!error && Boolean(data));
    }

    void conferir();
    // A sessão pode chegar depois da primeira renderização (o cliente restaura
    // do armazenamento local de forma assíncrona) e pode cair no meio da aula.
    const { data: escuta } = supabase.auth.onAuthStateChange(() => void conferir());

    return () => {
      vivo = false;
      escuta.subscription.unsubscribe();
    };
  }, []);

  return ehAdmin;
}
