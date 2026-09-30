import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Shuffle } from "lucide-react";
import { FORMAS, NOME_DA_FORMA } from "@/components/Avatares";
import { corEfetiva } from "@/lib/personagensCast";
import {
  CABECA,
  CORES_ACESSORIO,
  INTENCOES,
  ROSTO,
  TAMANHO_APELIDO,
  TAPETES,
  TINTS,
  corEmHex,
  perfilAoAcaso,
  type Opcao,
  type Perfil,
} from "@/lib/perfilAvatar";
import { codigoDaSala } from "@/hooks/useSalaCompartilhada";
import { movimentoDoSistema } from "@/lib/movimento";

// A prévia carrega three e drei no cliente; a página já os usa, mas o
// servidor não tem WebGL — por isso o `lazy`, que também tira o Canvas da
// renderização no servidor.
const PreviaCriatura = lazy(() =>
  import("@/components/PreviaCriatura").then((m) => ({ default: m.PreviaCriatura })),
);

/**
 * A Sala de Espera: a entrada da sala de yoga.
 *
 * Ideia dela, e ela nomeou o motivo: as pessoas entram sabendo quantas há e se
 * a sala está cheia, como nos ambientes de encontro remoto. O ganho maior nem é
 * de etiqueta — é que **o estado da sala passa a ser visível antes de valer a
 * pena descobri-lo**. Antes, se a conexão tivesse caído, isso só aparecia
 * depois de acender a GPU e carregar a cena inteira; foi assim que um canal
 * derrubado passou duas rodadas parecendo defeito de desenho.
 *
 * Quem está aqui **escuta a sala e não se publica nela**: aparece o que há lá
 * dentro, sem que quem olha já vire um corpo. Entrar é a decisão que publica.
 *
 * Aqui a pessoa também monta a criatura: cor da roupa, acessórios, cor do
 * tapete, intenção e apelido. **Não há seletor de tapete** — decisão dela: a
 * pessoa entra pela porta e anda até um tapete livre, como numa sala de
 * verdade. O apelido é o mesmo estado do chat (um campo só, não dois).
 */

const acento = "#00CCA7";

function Etapa({ n, titulo, children }: { n: string; titulo: string; children: ReactNode }) {
  return (
    <fieldset className="mt-7">
      <legend className="flex items-baseline gap-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[#A59B8F]">
        <span className="font-mono" style={{ color: acento }}>
          {n}
        </span>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

function Rotulo({ children, atual }: { children: ReactNode; atual?: string }) {
  return (
    <p className="mb-1.5 mt-4 text-xs font-medium text-[#C9C0B5]">
      {children}
      {atual && <span className="text-[#7D746A]"> · {atual}</span>}
    </p>
  );
}

function Bolinhas<T>({
  opcoes,
  valor,
  aoEscolher,
  cor,
  rotulo,
}: {
  opcoes: Opcao<T>[];
  valor: T;
  aoEscolher: (v: T) => void;
  cor: (v: T) => string;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.nome}
            type="button"
            title={o.nome}
            aria-label={o.nome}
            aria-pressed={ativo}
            onClick={() => aoEscolher(o.valor)}
            className={`h-9 w-9 rounded-full border border-white/15 transition ${
              ativo ? "ring-2 ring-[#F4EFE8] ring-offset-2 ring-offset-[#17130F]" : "hover:scale-110"
            }`}
            style={{ background: cor(o.valor) }}
          />
        );
      })}
    </div>
  );
}

function Fichas<T>({
  opcoes,
  valor,
  aoEscolher,
  rotulo,
}: {
  opcoes: Opcao<T>[];
  valor: T;
  aoEscolher: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.nome}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoEscolher(o.valor)}
            className={`min-h-11 rounded-xl border px-3.5 py-2 text-sm font-medium transition sm:min-h-9 ${
              ativo
                ? "border-[#00CCA7] bg-[#00CCA7]/15 text-white"
                : "border-[#342D27] bg-[#211C18] text-[#C9C0B5] hover:border-white/30"
            }`}
          >
            {o.nome}
          </button>
        );
      })}
    </div>
  );
}

export function SalaDeEspera({
  conectado,
  motivo,
  pessoas,
  sentadas,
  codigo,
  setCodigo,
  perfil,
  setPerfil,
  nome,
  setNome,
  entrar,
  ehAdmin,
  papel,
  setPapel,
}: {
  conectado: boolean;
  motivo: string | null;
  pessoas: number;
  sentadas: number;
  codigo: string;
  setCodigo: (c: string) => void;
  perfil: Perfil;
  setPerfil: (p: Perfil) => void;
  nome: string;
  setNome: (n: string) => void;
  /** Só quem está na allowlist da intranet escolhe conduzir. */
  ehAdmin: boolean;
  papel: "participante" | "professor";
  setPapel: (p: "participante" | "professor") => void;
  entrar: () => void;
}) {
  const [rascunho, setRascunho] = useState(codigo);
  // O codigo da URL so chega depois da montagem (no servidor nao ha `window`),
  // e sem isto o campo ficava eternamente escrito "publica" enquanto a pessoa
  // ja estava conectada a outra sala — a tela contradizendo o estado.
  useEffect(() => setRascunho(codigo), [codigo]);

  // Miniaturas de cada criatura, feitas no tempo livre do navegador para não
  // competir com a prévia grande. Até chegarem, o botão mostra a cor dela.
  const [miniaturas, setMiniaturas] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let vivo = true;
    let urls: Map<string, string> | null = null;
    const gerar = () =>
      import("@/lib/miniaturas")
        .then((m) => m.gerarMiniaturas(FORMAS))
        .then((mapa) => {
          urls = mapa;
          if (vivo) setMiniaturas(mapa);
          else mapa.forEach((u) => URL.revokeObjectURL(u));
        })
        // Sem WebGL extra ou sem memória: fica a bolinha de cor, que já basta.
        .catch(() => {});
    // Safari não tem requestIdleCallback.
    const ocioso = typeof window.requestIdleCallback === "function";
    const id = ocioso
      ? window.requestIdleCallback(gerar, { timeout: 3000 })
      : window.setTimeout(gerar, 800);
    return () => {
      vivo = false;
      if (ocioso) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      urls?.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const [sentada, setSentada] = useState(false);
  // Só no cliente: no servidor não há preferência de sistema para consultar.
  const [girar, setGirar] = useState(false);
  const [montou, setMontou] = useState(false);
  useEffect(() => {
    setMontou(true);
    setGirar(movimentoDoSistema() === "completo");
  }, []);

  const mudar = (p: Partial<Perfil>) => setPerfil({ ...perfil, ...p });
  const mudarAcc = (a: Partial<Perfil["acc"]>) => {
    // `undefined` explícito some da chave: "nada" é ausência, não um valor.
    const acc = { ...perfil.acc, ...a };
    if (!acc.head) delete acc.head;
    if (!acc.face) delete acc.face;
    mudar({ acc });
  };

  const nomeDe = <T,>(l: Opcao<T>[], v: T) => l.find((o) => o.valor === v)?.nome;
  const intencao = INTENCOES.find((i) => i.id === perfil.intent)!;

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-[#17130F] text-[#F4EFE8]">
      <div className="flex min-h-full flex-wrap">
        {/* Palco: em cima no celular, à esquerda e fixo no computador. */}
        <div className="relative h-[46dvh] min-h-[280px] flex-[1_1_560px] lg:sticky lg:top-0 lg:h-dvh">
          <div
            aria-hidden="true"
            className="absolute inset-0 transition-[background] duration-500"
            style={{
              background: `radial-gradient(55% 48% at 50% 58%, ${intencao.cor}42, transparent 72%)`,
            }}
          />
          {montou && (
            <Suspense fallback={null}>
              <PreviaCriatura perfil={perfil} sentada={sentada} girar={girar} />
            </Suspense>
          )}
          <p className="pointer-events-none absolute left-5 top-4 hidden text-[11px] sm:block font-semibold uppercase tracking-[0.12em] text-[#A59B8F]">
            Aruanã Digital · Sala de espera
          </p>
          <button
            type="button"
            onClick={() => setPerfil(perfilAoAcaso())}
            className="absolute right-4 top-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-black/40 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-black/60"
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> Me surpreenda
          </button>
          <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1.5">
            <div role="group" aria-label="Postura da prévia" className="flex gap-1 rounded-full bg-black/40 p-1 backdrop-blur-sm">
              {[
                { s: false, n: "Em pé" },
                { s: true, n: "Sentada" },
              ].map((o) => (
                <button
                  key={o.n}
                  type="button"
                  aria-pressed={sentada === o.s}
                  onClick={() => setSentada(o.s)}
                  className={`min-h-9 rounded-full px-4 text-xs font-semibold transition ${
                    sentada === o.s ? "bg-white/85 text-[#17130F]" : "text-white/75 hover:text-white"
                  }`}
                >
                  {o.n}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#7D746A]">Arraste para girar</p>
          </div>
        </div>

        {/* Painel */}
        <div className="w-full flex-[1_1_420px] px-6 pb-10 pt-8 sm:px-9 lg:max-w-[540px] lg:pt-11">
          <h1 className="text-[clamp(28px,3.2vw,38px)] font-extrabold leading-tight tracking-[-0.025em]">
            Sala de Yoga & Relaxamento
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#C9C0B5]">
            Um espaço 3D para respirar junto com outras pessoas, cada uma no seu lugar.
            Protótipo da Aruanã Digital.
          </p>

          {/* `status` e nao `alert`: muda sozinho conforme gente entra e sai, e
              interromper a leitura a cada mudanca seria hostil. */}
          <div
            role="status"
            aria-live="polite"
            className="mt-6 rounded-2xl border border-[#342D27] bg-[#211C18] p-4"
          >
            {!conectado ? (
              <p className="text-sm text-[#C9C0B5]">
                <strong className="font-semibold text-white">
                  Sala compartilhada indisponível.
                </strong>{" "}
                Você pode entrar assim mesmo — a experiência funciona sozinha, mas ninguém
                vai aparecer.
                {motivo && (
                  <>
                    {" "}
                    <span className="text-[#7D746A]">
                      Motivo: <code className="font-mono">{motivo}</code>. Tentando
                      reconectar.
                    </span>
                  </>
                )}
              </p>
            ) : pessoas === 0 ? (
              <p className="text-sm text-[#C9C0B5]">
                <strong className="font-semibold text-white">A sala está vazia.</strong> Você
                será a primeira pessoa a entrar.
              </p>
            ) : (
              <p className="text-sm text-[#C9C0B5]">
                <strong className="font-semibold text-white">
                  {pessoas === 1 ? "1 pessoa" : `${pessoas} pessoas`} na sala
                </strong>
                {sentadas > 0 && `, ${sentadas} em um tapete`}.
              </p>
            )}
          </div>

          <Etapa n="01" titulo="Criatura">
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FORMAS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={f === perfil.forma}
                  onClick={() => mudar({ forma: f })}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition ${
                    f === perfil.forma
                      ? "border-[#00CCA7] bg-[#00CCA7]/15 text-white"
                      : "border-[#342D27] bg-[#211C18] text-[#C9C0B5] hover:border-white/30"
                  }`}
                >
                  {miniaturas.get(f) ? (
                    <img
                      src={miniaturas.get(f)}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-lg bg-black/25 object-cover"
                    />
                  ) : (
                    <span className="grid h-11 w-11 place-items-center">
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: corEmHex(corEfetiva(f, null)) }}
                      />
                    </span>
                  )}
                  {NOME_DA_FORMA[f]}
                </button>
              ))}
            </div>
            {/* Nada de humanos aqui, e é decisão de produto: um conjunto de
                avatares humanos é uma declaração sobre quem está representado, e
                com poucas opções qualquer conjunto exclui. */}
            <p className="mt-2 text-xs leading-relaxed text-[#7D746A]">
              Você entra na sala como ela. Ninguém vê seu rosto nem seu nome real.
            </p>
          </Etapa>

          <Etapa n="02" titulo="Cores">
            <Rotulo atual={nomeDe(TINTS, perfil.tint)}>Roupa</Rotulo>
            <Bolinhas
              rotulo="Cor da roupa"
              opcoes={TINTS}
              valor={perfil.tint}
              aoEscolher={(tint) => mudar({ tint })}
              cor={(t) => corEmHex(corEfetiva(perfil.forma, t))}
            />
            <Rotulo atual={nomeDe(TAPETES, perfil.mat)}>Tapete</Rotulo>
            <Bolinhas
              rotulo="Cor do tapete"
              opcoes={TAPETES}
              valor={perfil.mat}
              aoEscolher={(mat) => mudar({ mat })}
              cor={(m) => m}
            />
          </Etapa>

          <Etapa n="03" titulo="Acessórios">
            <Rotulo>Na cabeça</Rotulo>
            <Fichas
              rotulo="Acessório na cabeça"
              opcoes={CABECA}
              valor={perfil.acc.head ?? null}
              aoEscolher={(head) => mudarAcc({ head: head ?? undefined })}
            />
            <Rotulo>No rosto e no pescoço</Rotulo>
            <Fichas
              rotulo="Acessório no rosto ou no pescoço"
              opcoes={ROSTO}
              valor={perfil.acc.face ?? null}
              aoEscolher={(face) => mudarAcc({ face: face ?? undefined })}
            />
            <Rotulo atual={nomeDe(CORES_ACESSORIO, perfil.acc.color ?? CORES_ACESSORIO[0].valor)}>
              Cor dos acessórios
            </Rotulo>
            <Bolinhas
              rotulo="Cor dos acessórios"
              opcoes={CORES_ACESSORIO}
              valor={perfil.acc.color ?? CORES_ACESSORIO[0].valor}
              aoEscolher={(color) => mudarAcc({ color })}
              cor={corEmHex}
            />
          </Etapa>

          <Etapa n="04" titulo="Presença">
            <label className="mt-3 block text-xs font-medium text-[#C9C0B5]">
              Apelido <span className="text-[#7D746A]">· opcional</span>
              <input
                value={nome}
                maxLength={TAMANHO_APELIDO}
                onChange={(e) => setNome(e.target.value)}
                placeholder={NOME_DA_FORMA[perfil.forma as keyof typeof NOME_DA_FORMA]}
                className="mt-1.5 block w-full rounded-xl border border-[#342D27] bg-[#110E0B] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00CCA7]"
              />
            </label>
            <p className="mt-1.5 text-xs leading-relaxed text-[#7D746A]">
              É como você aparece no chat. Vazio, vale o nome da criatura.
            </p>
            <Rotulo atual={intencao.nome}>Intenção</Rotulo>
            <div role="group" aria-label="Intenção" className="flex flex-wrap gap-1.5">
              {INTENCOES.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  aria-pressed={i.id === perfil.intent}
                  onClick={() => mudar({ intent: i.id })}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition sm:min-h-9 ${
                    i.id === perfil.intent
                      ? "border-[#00CCA7] bg-[#00CCA7]/15 text-white"
                      : "border-[#342D27] bg-[#211C18] text-[#C9C0B5] hover:border-white/30"
                  }`}
                >
                  <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: i.cor }} />
                  {i.nome}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#7D746A]">
              Vira um brilho em volta do seu tapete, que os outros veem.
            </p>
          </Etapa>

          <Etapa n="05" titulo="Entrar">
            <label className="mt-3 block text-xs font-medium text-[#C9C0B5]">
              Código da sala
              <input
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onBlur={() => setCodigo(codigoDaSala(`?sala=${rascunho}`))}
                className="mt-1.5 block w-full rounded-xl border border-[#342D27] bg-[#110E0B] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00CCA7]"
              />
            </label>
            <p className="mt-1.5 text-xs leading-relaxed text-[#7D746A]">
              Quem abrir o link com o mesmo código cai na mesma sala. Sem código, todo mundo
              entra na sala pública.
            </p>

            {/* A escolha do papel só existe para quem pode conduzir. Para todo o
                resto a sala continua tendo uma porta só. */}
            {ehAdmin && (
              <div className="mt-4">
                <Rotulo>Entrar como</Rotulo>
                <div className="flex gap-2">
                  {(["participante", "professor"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPapel(p)}
                      aria-pressed={papel === p}
                      className={`min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        papel === p
                          ? "bg-[#00CCA7] text-[#041B33]"
                          : "bg-white/10 text-white/80 hover:bg-white/20"
                      }`}
                    >
                      {p === "participante" ? "Participante" : "Professor"}
                    </button>
                  ))}
                </div>
                {papel === "professor" && (
                  <p className="mt-2 text-xs leading-relaxed text-[#7D746A]">
                    Você entra no lugar do professor, de frente para a turma. Não caminha e
                    não aparece como criatura — quem assiste vê você como o professor.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={entrar}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#00CCA7] px-6 py-3 text-sm font-bold text-[#041B33] transition hover:brightness-110"
            >
              {papel === "professor"
                ? "Entrar como professor"
                : `Entrar como ${nome.replace(/\s+/g, " ").trim().slice(0, TAMANHO_APELIDO) || NOME_DA_FORMA[perfil.forma]}`}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-[#7D746A]">
              Você entra pela porta e escolhe o seu tapete andando até ele. Com a sala cheia
              você entra em pé e continua vendo e ouvindo tudo — ninguém fica de fora.
            </p>
          </Etapa>
        </div>
      </div>
    </div>
  );
}
