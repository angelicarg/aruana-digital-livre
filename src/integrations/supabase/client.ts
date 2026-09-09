// Gerado por ferramenta na origem do projeto, mas **editado à mão desde
// 09/09/2026**: o bloco `realtime` abaixo é decisão nossa e se perde se alguém
// regenerar o arquivo. Se a sala de yoga voltar a cair sozinha, conferir se ele
// ainda está aqui antes de procurar em qualquer outro lugar.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { registrar } from '@/lib/diagnostico';

function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      // ⚠️ O batimento cardíaco do Realtime sai da thread principal.
      //
      // O padrão do `realtime-js` é `worker: false`: um `setInterval` de 25 s na
      // thread principal. Esta aplicação tem uma cena 3D em WebGL rodando laço
      // contínuo, decodificação de Draco e compilação de shader — tudo na mesma
      // thread. Quando ela engasga, o batimento atrasa, o servidor conclui que o
      // cliente sumiu e fecha: é o `CLOSED` que a sala de yoga mostrava.
      //
      // Explica também por que só acontecia na máquina dela: três janelas
      // desenhando ao mesmo tempo disputam a mesma thread, enquanto no meu
      // ambiente de teste as abas de fundo ficam congeladas e nem desenham — a
      // thread delas está ociosa e o batimento nunca atrasa.
      //
      // Sem `workerUrl`, o `realtime-js` monta o worker de um Blob interno: não
      // busca script na rede e não depende de CSP.
      worker: true,
      heartbeatCallback: (status: string, latencia?: number) => {
        // Tudo vai para o registro, inclusive o batimento normal: e o intervalo
        // entre eles que diz se o temporizador esta atrasando. Só o anormal vai
        // para o console.
        registrar('batimento', latencia != null ? `${status} ${latencia}ms` : status);
        if (status !== 'sent' && status !== 'ok') {
          console.warn('[sala] batimento', status, latencia ?? '');
        }
      },
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

