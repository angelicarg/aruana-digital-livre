import { useEffect, useRef, useState } from "react";
import { Check, Copy, Megaphone, Send, X } from "lucide-react";
import {
  LIMITE_TEXTO,
  PRONTAS,
  duracaoDaLegenda,
  legendaVisivel,
  sanearInstrucao,
  type Instrucao,
  type PoseProfessor,
} from "@/lib/aula";
import { Narrador } from "@/lib/narrador";

/**
 * A instrução na tela de quem está na sala.
 *
 * Mesmo texto para os dois canais: aparece escrito e, quando a narração está
 * ligada, é falado. Não são duas mensagens nem duas fontes de verdade — é o
 * motivo de a instrução nascer como texto.
 *
 * ⚠️ **A legenda some sozinha, sem mensagem de "apagar".** O tempo de leitura
 * é função do texto (`duracaoDaLegenda`), então toda máquina esconde no mesmo
 * instante sem gastar um evento do canal para isso. O `setTimeout` aqui é de
 * uma vez só, por instrução — não é temporizador periódico e não fala com a
 * rede, que é o que derrubava o canal.
 */
export function LegendaDaAula({
  instrucao,
  narrando,
}: {
  instrucao: Instrucao | null;
  narrando: boolean;
}) {
  const [agora, setAgora] = useState(() => Date.now());
  const narrador = useRef<Narrador | null>(null);
  const jaFalada = useRef<Instrucao | null>(null);

  // Um despertador por instrução, para o instante em que ela expira.
  useEffect(() => {
    if (!instrucao) return;
    setAgora(Date.now());
    const resta = instrucao.emMs + duracaoDaLegenda(instrucao.texto) - Date.now();
    if (resta <= 0) return;
    const id = window.setTimeout(() => setAgora(Date.now()), resta);
    return () => window.clearTimeout(id);
  }, [instrucao]);

  useEffect(() => {
    if (!instrucao || !narrando) return;
    // A mesma instrução não é falada duas vezes: a legenda re-renderiza quando
    // expira, e sem esta guarda a voz repetiria a frase ao sumir da tela.
    if (jaFalada.current === instrucao) return;
    jaFalada.current = instrucao;
    narrador.current ??= new Narrador();
    narrador.current.falar(instrucao.texto);
  }, [instrucao, narrando]);

  useEffect(() => () => narrador.current?.calar(), []);

  const visivel = legendaVisivel(instrucao, agora);

  return (
    /* `aria-live="polite"` e não `assertive`: a instrução é importante mas não
       é emergência, e interromper o leitor de tela no meio de outra coisa é
       pior que esperar a frase acabar. Sempre presente no DOM, porque região
       viva que nasce junto com o texto costuma não ser anunciada. */
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-28 z-40 flex justify-center px-4 sm:bottom-32"
    >
      {visivel && instrucao && (
        <p className="max-w-[42rem] rounded-2xl bg-black/75 px-5 py-3 text-center text-lg font-medium leading-snug text-white shadow-premium backdrop-blur-md sm:text-xl">
          {instrucao.texto}
        </p>
      )}
    </div>
  );
}

/**
 * O painel de quem conduz a aula.
 *
 * Só aparece para quem está na allowlist da intranet — ver `useEhAdmin`, que
 * também explica por que isto é visibilidade e não autorização.
 *
 * As prontas existem porque quem dá aula está com as mãos ocupadas com a
 * própria postura: um toque manda a frase e põe o professor na pose que
 * combina com ela. O campo livre cobre o que não estava previsto.
 */
export function PainelDaAula({
  instruir,
  pose,
  aoTrocarPose,
}: {
  instruir: (texto: string, pose: PoseProfessor) => void;
  pose: PoseProfessor;
  aoTrocarPose: (pose: PoseProfessor) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);

  /**
   * O convite para a aula.
   *
   * Está aqui, e não só no chip da sala, porque é aqui que a pessoa está quando
   * pensa em chamar alguém. Juntar duas pessoas dependia de coincidir um código
   * digitado nas duas pontas, e foi o que fez três tentativas de teste
   * falharem: cada janela numa sala, as duas sozinhas, e o sintoma idêntico ao
   * de rede caída.
   *
   * Copia o endereço atual em vez de remontá-lo: o que a pessoa manda tem de
   * ser exatamente o que abriu aqui.
   */
  async function copiarConvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem área de transferência, o chip da sala continua mostrando o código
      // para ditar.
    }
  }

  function enviarLivre() {
    const limpo = sanearInstrucao(texto);
    if (!limpo) return;
    instruir(limpo, pose);
    setTexto("");
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-green/90 px-4 py-2.5 text-xs font-semibold text-brand-navy-deep shadow-premium backdrop-blur-sm transition hover:bg-brand-green"
      >
        <Megaphone className="h-4 w-4" aria-hidden="true" />
        Conduzir a aula
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-black/80 p-4 pr-16 shadow-premium backdrop-blur-md sm:pr-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-white">Conduzindo a aula</h2>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar o painel de condução"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Primeiro item do painel de propósito: sem turma não há aula, e chamar
          alguém é a primeira coisa que se faz. */}
      <button
        type="button"
        onClick={copiarConvite}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/20"
      >
        {copiado ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" /> Convite copiado
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" aria-hidden="true" /> Copiar convite para esta sala
          </>
        )}
      </button>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Pose do professor
        </legend>
        <div className="mt-2 flex gap-2">
          {(["em_pe", "sentado"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => aoTrocarPose(p)}
              aria-pressed={pose === p}
              className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                pose === p
                  ? "bg-brand-green text-brand-navy-deep"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {p === "em_pe" ? "Em pé" : "Sentado"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Instruções</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRONTAS.map((p) => (
            <button
              key={p.rotulo}
              type="button"
              /* A pronta troca a pose junto: mandar "sente-se no tapete" com o
                 professor de pé denuncia que não tem ninguém ali. */
              onClick={() => {
                aoTrocarPose(p.pose);
                instruir(p.texto, p.pose);
              }}
              title={p.texto}
              className="min-h-11 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/85 transition hover:bg-white/20"
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="instrucao-livre" className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Falar outra coisa
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="instrucao-livre"
            value={texto}
            maxLength={LIMITE_TEXTO}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                enviarLivre();
              }
            }}
            placeholder="Escreva a instrução…"
            className="min-h-11 flex-1 rounded-xl bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
          <button
            type="button"
            onClick={enviarLivre}
            disabled={!sanearInstrucao(texto)}
            aria-label="Enviar a instrução para a sala"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green text-brand-navy-deep transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
