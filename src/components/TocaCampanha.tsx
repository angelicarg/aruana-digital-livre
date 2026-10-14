import { Link } from "@tanstack/react-router";
import { ListaEsperaToca } from "@/components/ListaEsperaToca";
import {
  TOCAS,
  TOCA_MADALENA_REVELADA,
  contagemPortas,
  portaAberta,
} from "@/lib/toca";

// Peças da campanha de pré-inauguração. Aru sempre dos arquivos oficiais, nunca espelhado.
const ARU_APONTANDO = "/marca/aru-apontando-v1.png";
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
            Estamos preparando um espaço de estudos para quem vai fazer o ENEM, organizado para
            estudar no seu ritmo, sem perder de vista a continuidade dos estudos. Seis tocas e uma
            tartaruga. Deixe seus dados e o Aru avisa quando houver novidade.
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

// Miniatura quadrada (1d)
export function PortaMiniatura({ i }: { i: number }) {
  const t = TOCAS[i];
  const aberta = portaAberta(i);
  return (
    <li aria-label={aberta ? undefined : `Porta ${i + 1}, em breve`}>
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-white/10">
        <img
          src={aberta ? `/toca/jogo/${t.slug}.webp` : "/toca/jardim.webp"}
          alt=""
          className={`h-full w-full object-cover ${aberta ? "" : "scale-110 blur-[14px]"}`}
        />
        {!aberta && <div className="absolute inset-0 bg-brand-navy-deep/50" aria-hidden="true" />}
      </div>
      <p className="mt-2 text-sm font-semibold text-white/85">{aberta ? t.nome : `Porta ${i + 1} · em breve`}</p>
    </li>
  );
}

export { ARU_JOIA, PILL_ESCURA, PILL_CLARA, Madalena };
