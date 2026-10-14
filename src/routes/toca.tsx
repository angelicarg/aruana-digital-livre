import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { ListaEsperaToca } from "@/components/ListaEsperaToca";
import {
  ARU_FRENTE,
  Madalena,
  PILL_ESCURA,
  PILL_CLARA,
  PortaCartao,
  ROTULO_PRODUTO,
} from "@/components/TocaCampanha";
import { TOCAS, contagemPortas } from "@/lib/toca";

export const Route = createFileRoute("/toca")({
  head: () => ({
    meta: [
      { title: "Toca da Madalena: jogo de estudos para o ENEM | Aruanã" },
      {
        name: "description",
        content:
          "Seis tocas debaixo de uma árvore, cada uma com uma função no seu estudo para o ENEM. Entre na lista e o Aru avisa quando a próxima porta abrir.",
      },
      { property: "og:title", content: "Toca da Madalena: jogo de estudos para o ENEM | Aruanã" },
      { property: "og:url", content: "https://aruanadigital.com/toca" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/toca" }],
  }),
  component: TocaPage,
});

function rolarAteLista(e: React.MouseEvent) {
  e.preventDefault();
  const alvo = document.getElementById("lista");
  if (!alvo) return;
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  alvo.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
  alvo.focus({ preventScroll: true });
}

function TocaPage() {
  return (
    <PageLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-navy-deep text-white">
        <img
          src="/toca/jardim.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "50% 70%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 30% 40% at 66% 66%, rgba(4,27,51,0) 0%, rgba(4,27,51,.55) 55%, rgba(4,27,51,.94) 100%)",
          }}
          aria-hidden="true"
        />
        <Madalena className="absolute bottom-[9%] left-[60%] hidden h-56 lg:block" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:min-h-[620px] lg:px-8 lg:py-24">
          <div className="max-w-xl space-y-5">
            <span className={PILL_ESCURA}>Em breve · para quem vai fazer o ENEM</span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-balance sm:text-5xl lg:text-[56px]">
              Quem mora debaixo desta árvore?
            </h1>
            <p className="text-lg leading-relaxed text-white/85">
              Ela carrega a casa nas costas e a casa tem seis tocas. Cada uma guarda uma parte do
              seu estudo até o dia da prova.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <a
                href="#lista"
                onClick={rolarAteLista}
                className="inline-flex items-center rounded-full bg-brand-green px-7 py-3.5 font-bold text-brand-navy-deep shadow-card transition hover:-translate-y-0.5"
              >
                Quero entrar primeiro
              </a>
              <span className="text-sm text-white/75">{contagemPortas()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* AS SEIS TOCAS */}
      <section className="bg-brand-cloud py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className={PILL_CLARA}>As seis tocas</span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy-deep sm:text-4xl">
                Uma porta se abre de cada vez.
              </h2>
            </div>
            <div className="flex items-end gap-3">
              <img src={ARU_FRENTE} alt="" className="h-24 w-auto" />
              <p className="max-w-xs pb-2 text-sm font-medium text-brand-navy-deep">
                “Volto aqui toda vez que uma porta abrir. Quem está na lista fica sabendo antes.”
              </p>
            </div>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TOCAS.map((_, i) => (
              <PortaCartao key={i} i={i} />
            ))}
          </ul>
        </div>
      </section>

      {/* LISTA DE ESPERA */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_460px] lg:gap-16 lg:px-8">
          <div id="lista" tabIndex={-1} className="space-y-4 outline-none">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy-deep sm:text-4xl">
              Seja o primeiro a entrar.
            </h2>
            <p className="text-lg text-[#4B5768]">
              Sem data marcada ainda. Quando a primeira porta abrir de verdade, o Aru avisa. Uma
              mensagem, sem enxurrada.
            </p>
          </div>
          <div className="rounded-[28px] border border-[#E1E6EC] bg-white p-7 shadow-card">
            <ListaEsperaToca layout="coluna" />
          </div>
        </div>
      </section>

      {/* ESCOLAS */}
      <section className="border-t border-[#E1E6EC] bg-white py-14">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-center sm:px-6 lg:px-8">
          <span className={PILL_CLARA}>{ROTULO_PRODUTO}</span>
          <h3 className="font-display text-2xl font-extrabold text-brand-navy-deep sm:text-3xl">
            Escola, cursinho ou empresa? A Toca é o que sabemos construir.
          </h3>
          <p className="text-[#4B5768]">
            Arte, mundo navegável, conta de aluno e plano de estudos, tudo feito pela Aruanã, com
            acessibilidade desde o começo.
          </p>
          <Link
            to="/jogos-educativos"
            className="inline-flex items-center rounded-full border-2 border-brand-navy-deep px-6 py-3 font-bold text-brand-navy-deep transition hover:bg-brand-navy-deep hover:text-white"
          >
            Conhecer jogos educativos →
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
