import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { ListaEsperaToca } from "@/components/ListaEsperaToca";
import {
  ARU_JOIA,
  PILL_CLARA,
  PILL_ESCURA,
  PortaMiniatura,
  ROTULO_PRODUTO,
} from "@/components/TocaCampanha";
import { TOCAS, contagemPortas } from "@/lib/toca";

const WHATSAPP = "https://wa.me/5534992086611";

export const Route = createFileRoute("/jogos-educativos")({
  head: () => ({
    meta: [
      { title: "Jogos educativos sob medida | Aruanã Digital" },
      {
        name: "description",
        content:
          "Jogos educativos sob medida para escolas, cursinhos e empresas, com gamificação personalizada e acessibilidade desde o começo. Para provar, construímos o nosso: a Toca da Madalena, jogo de estudos para o ENEM, com lista de espera aberta.",
      },
      { property: "og:title", content: "Jogos educativos sob medida | Aruanã Digital" },
      { property: "og:url", content: "https://aruanadigital.com/jogos-educativos" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/jogos-educativos" }],
  }),
  component: JogosEducativosPage,
});

const PILARES = [
  ["Mundo e personagem", "Arte própria, mascote e salas que o aluno reconhece pela forma."],
  ["Pedagogia no centro", "Cada sala serve a um momento do estudo, não a enfeite."],
  ["Conta e conteúdo protegido", "Login, progresso salvo e material servido só para quem entrou."],
  ["Acessível por padrão", "Teclado, leitor de tela e movimento reduzido desde o primeiro dia."],
] as const;

function JogosEducativosPage() {
  return (
    <PageLayout>
      {/* HERO CLARO */}
      <section className="bg-white py-14 lg:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
          <div className="space-y-5">
            <span className={PILL_CLARA}>Jogos educativos</span>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-balance text-brand-navy-deep lg:text-[52px]">
              Estudo que o aluno quer abrir de novo amanhã.
            </h1>
            <p className="text-lg leading-relaxed text-[#4B5768]">
              Criamos jogos educativos sob medida para escolas, cursinhos e empresas, com
              gamificação personalizada. Para provar, construímos o nosso.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-brand-green px-7 py-3.5 font-bold text-brand-navy-deep shadow-card transition hover:-translate-y-0.5"
              >
                Conversar sobre um jogo
              </a>
              <a
                href="#toca"
                className="inline-flex items-center rounded-full border-2 border-brand-navy-deep px-6 py-3 font-bold text-brand-navy-deep transition hover:bg-brand-navy-deep hover:text-white"
              >
                Ver a Toca ↓
              </a>
              <a
                href="#lista"
                className="inline-flex items-center px-2 py-3.5 font-bold text-brand-green-text underline underline-offset-4"
              >
                Sou estudante: entrar na lista
              </a>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-premium">
            <img
              src="/toca/tempo.webp"
              alt="Interior de uma toca com lanterna e ampulheta, a Sala do Tempo do jogo"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-white/95 px-5 py-3 text-sm">
              <span className="font-semibold text-brand-navy-deep">Toca da Madalena · Sala do Tempo</span>
              <span className="text-[#5B6675]">Produto próprio</span>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO NAVY */}
      <section id="toca" className="bg-brand-navy-deep py-16 text-white lg:py-24">
        <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-4">
              <span className={PILL_ESCURA}>{ROTULO_PRODUTO}</span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Toca da Madalena
              </h2>
              <p className="text-lg leading-relaxed text-white/80">
                Um jogo de estudos para o ENEM: uma árvore com seis tocas, cada uma com uma função
                na rotina do aluno. Não é maquete, é software com conta de aluno.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <img src={ARU_JOIA} alt="" className="h-36 w-auto" />
              <p className="max-w-[220px] text-sm font-medium text-white/90">
                “Abre em breve. Enquanto isso, dá para espiar algumas portas.”
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {TOCAS.map((_, i) => (
              <PortaMiniatura key={i} i={i} />
            ))}
          </ul>
        </div>
      </section>

      {/* O QUE FIZEMOS */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight text-brand-navy-deep sm:text-4xl">
            O que fizemos na Toca, e podemos fazer no seu.
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PILARES.map(([t, d]) => (
              <li key={t} className="border-t-[3px] border-brand-green pt-4">
                <h3 className="font-display text-lg font-bold text-brand-navy-deep">{t}</h3>
                <p className="mt-2 text-[15px] text-[#4B5768]">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LISTA DE ESPERA */}
      <section id="lista" className="scroll-mt-24 bg-brand-cloud py-16 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_460px] lg:gap-16 lg:px-8">
          <div className="space-y-4">
            <span className={PILL_CLARA}>Para quem vai fazer o ENEM</span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy-deep sm:text-4xl">
              Seja o primeiro a entrar na Toca.
            </h2>
            <p className="text-lg text-[#4B5768]">
              Sem data marcada ainda. Quando a primeira porta abrir de verdade, o Aru avisa. Uma
              mensagem, sem enxurrada.
            </p>
            <p className="text-sm font-semibold text-brand-navy-deep">{contagemPortas()}</p>
          </div>
          <div className="rounded-[28px] border border-[#E1E6EC] bg-white p-7 shadow-card">
            <ListaEsperaToca layout="coluna" />
          </div>
        </div>
      </section>

      {/* ESCOLAS */}
      <section className="bg-brand-navy-deep py-14 text-white">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Escola, cursinho ou empresa? Vamos conversar sobre o seu jogo.
          </h2>
          <p className="text-white/80">
            Arte, mundo navegável, conta de aluno e plano de estudos, tudo feito pela Aruanã, com
            acessibilidade desde o começo.
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-brand-green px-7 py-3.5 font-bold text-brand-navy-deep shadow-card transition hover:-translate-y-0.5"
          >
            Conversar sobre um jogo
          </a>
        </div>
      </section>
    </PageLayout>
  );
}
