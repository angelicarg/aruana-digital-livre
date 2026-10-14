import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ListaEsperaToca } from "@/components/ListaEsperaToca";
import {
  TOCAS,
  TOCA_MADALENA_REVELADA,
  contagemPortas,
  portaAberta,
} from "@/lib/toca";

// Peças da campanha de pré-inauguração. Aru sempre dos arquivos oficiais, nunca espelhado.
const ARU_APONTANDO = "/marca/aru-apontando-v1.png";
const ARU_FRENTE = "/marca/aru-frente-v1.png";
const ARU_JOIA = "/marca/aru-joia-v1.png";

export const ROTULO_PRODUTO = "Produto próprio · nosso demonstrativo em jogos educativos";

const HOLOFOTE =
  "radial-gradient(ellipse 42% 34% at 52% 58%, rgba(4,27,51,0) 0%, rgba(4,27,51,.45) 55%, rgba(4,27,51,.9) 100%)";
const SILHUETA = "brightness(0) drop-shadow(0 0 18px rgba(232,163,61,.75))";

const PILL_ESCURA =
  "inline-block rounded-full bg-brand-green/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#4FE0A6]";
const PILL_CLARA =
  "inline-block rounded-full bg-brand-green/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-brand-green-text";

function Madalena({ className }: { className: string }) {
  return (
    <img
      src="/toca/madalena.webp"
      alt={TOCA_MADALENA_REVELADA ? "Madalena, a tartaruga da Toca" : ""}
      className={className}
      style={TOCA_MADALENA_REVELADA ? undefined : { filter: SILHUETA }}
    />
  );
}

export function ArteDaArvore({ comAru = true }: { comAru?: boolean }) {
  return (
    <div className="relative">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-premium">
        <img
          src="/toca/jardim.webp"
          alt="Uma árvore grande com portas redondas nas raízes, iluminada por lanternas"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "55% 60%" }}
        />
        <div className="absolute inset-0" style={{ background: HOLOFOTE }} aria-hidden="true" />
        <Madalena className="absolute bottom-[6%] left-1/2 h-[42%] -translate-x-1/2" />
        <p className="absolute bottom-3 left-3 rounded-full bg-brand-navy-deep/75 px-3 py-1.5 text-[13px] font-semibold text-white">
          {contagemPortas()}
        </p>
      </div>
      {comAru && (
        <img
          src={ARU_APONTANDO}
          alt="Aru apontando para a árvore"
          className="absolute -bottom-4 -left-3 h-[62%] w-auto"
        />
      )}
    </div>
  );
}

// 1a: escura, mistério com o formulário ao lado
export function TocaSecaoEscura() {
  return (
    <section id="toca" className="bg-brand-navy-deep py-16 text-white lg:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:px-8">
        <div className="order-2 space-y-5 lg:order-1">
          <span className={PILL_ESCURA}>Produto próprio · em breve</span>
          <h2 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-balance lg:text-[46px]">
            Tem alguém se mudando para debaixo da árvore.
          </h2>
          <p className="text-lg leading-relaxed text-white/80">
            Seis tocas, uma tartaruga e um jeito novo de estudar para o ENEM. Ainda não dá para
            contar tudo. Quem estiver na lista fica sabendo primeiro, pelo Aru.
          </p>
          <div className="rounded-[20px] bg-white p-5 shadow-premium">
            <ListaEsperaToca layout="duas" rotuloBotao="Quero saber quando a porta abrir" />
          </div>
        </div>
        <div className="order-1 space-y-4 lg:order-2">
          <ArteDaArvore />
          <p className="pl-2 text-sm text-white/65">
            {ROTULO_PRODUTO}.{" "}
            <Link to="/jogos-educativos" className="font-semibold text-[#4FE0A6] underline-offset-4 hover:underline">
              Sua escola quer um jogo assim? →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// 1b: clara, faixa de arte com as seis portas e formulário em linha
export function TocaSecaoClara() {
  return (
    <section id="toca" className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-6xl space-y-9 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className={PILL_CLARA}>Novidades chegando</span>
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-brand-navy-deep">
              Toca da Madalena
            </h2>
            <p className="text-lg text-[#4B5768]">
              Um jogo de estudos para o ENEM está tomando forma debaixo de uma árvore. As portas
              vão se abrindo uma de cada vez.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <img src={ARU_APONTANDO} alt="" className="h-28 w-auto" />
            <div className="pb-2 text-sm">
              <p className="font-medium text-brand-navy-deep">
                “Ainda não posso contar quem mora aí. Mas aviso você primeiro.”
              </p>
              <p className="text-[#5B6675]">Aru, da Aruanã</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-brand-navy-deep md:h-[340px]">
          <img
            src="/toca/jardim.webp"
            alt="Uma árvore grande com portas redondas nas raízes, iluminada por lanternas"
            className="h-56 w-full object-cover md:absolute md:inset-0 md:h-full"
            style={{ objectPosition: "50% 62%" }}
          />
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                "radial-gradient(ellipse 34% 52% at 50% 62%, rgba(4,27,51,0) 0%, rgba(4,27,51,.5) 55%, rgba(4,27,51,.88) 100%)",
            }}
            aria-hidden="true"
          />
          <ol className="grid grid-cols-2 gap-2.5 p-3 md:absolute md:inset-x-0 md:bottom-0 md:grid-cols-6 md:p-[18px]">
            {TOCAS.map((t, i) => {
              const aberta = portaAberta(i);
              return (
                <li
                  key={t.slug}
                  aria-label={aberta ? undefined : `Porta ${i + 1}, ainda fechada`}
                  className="rounded-[14px] bg-brand-navy-deep/80 px-3.5 py-3 backdrop-blur-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4FE0A6]">
                    Porta {i + 1}
                  </p>
                  <p className={`mt-0.5 font-display text-[15px] ${aberta ? "font-bold text-white" : "font-semibold text-white/70"}`}>
                    {aberta ? t.nome : "Ainda fechada"}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-3">
          <ListaEsperaToca layout="linha" rotuloBotao="Entrar na lista" />
          <p className="text-sm text-[#5B6675]">
            {ROTULO_PRODUTO}.{" "}
            <Link to="/jogos-educativos" className="font-semibold text-brand-green-text underline underline-offset-4">
              Para escolas →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// Cartão de porta (1c): aberta mostra nome, fechada mostra só a pista e a imagem borrada
export function PortaCartao({ i }: { i: number }) {
  const t = TOCAS[i];
  const aberta = portaAberta(i);
  return (
    <li
      aria-label={aberta ? undefined : `Porta ${i + 1}, ainda fechada`}
      className="overflow-hidden rounded-3xl bg-white shadow-card"
    >
      <div className="relative aspect-video overflow-hidden bg-brand-navy-deep">
        <img
          src={aberta ? `/toca/${t.slug}.webp` : "/toca/jardim.webp"}
          alt=""
          className={`h-full w-full object-cover ${aberta ? "" : "scale-110 blur-xl"}`}
        />
        {!aberta && (
          <div className="absolute inset-0 grid place-items-center bg-brand-navy-deep/55">
            <span className="rounded-full bg-brand-navy-deep/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
              Porta {i + 1} · ainda fechada
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1 p-5">
        <p className={`text-xs font-bold uppercase tracking-wider ${aberta ? "text-brand-green-text" : "text-[#6B7684]"}`}>
          Porta {i + 1}{aberta ? " · aberta" : ""}
        </p>
        <h3 className="font-display text-xl font-bold text-brand-navy-deep">{aberta ? t.nome : "???"}</h3>
        <p className={`text-[15px] ${aberta ? "text-[#4B5768]" : "text-[#6B7684]"}`}>
          {aberta ? t.linha : t.pista}
        </p>
      </div>
    </li>
  );
}

// Miniatura quadrada (1d)
export function PortaMiniatura({ i }: { i: number }) {
  const t = TOCAS[i];
  const aberta = portaAberta(i);
  return (
    <li aria-label={aberta ? undefined : `Porta ${i + 1}, em breve`}>
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-white/10">
        <img
          src={aberta ? `/toca/${t.slug}.webp` : "/toca/jardim.webp"}
          alt=""
          className={`h-full w-full object-cover ${aberta ? "" : "scale-110 blur-[14px]"}`}
        />
        {!aberta && <div className="absolute inset-0 bg-brand-navy-deep/50" aria-hidden="true" />}
      </div>
      <p className="mt-2 text-sm font-semibold text-white/85">{aberta ? t.nome : `Porta ${i + 1} · em breve`}</p>
    </li>
  );
}

export { ARU_FRENTE, ARU_JOIA, ARU_APONTANDO, PILL_ESCURA, PILL_CLARA, Madalena, ArrowRight };
