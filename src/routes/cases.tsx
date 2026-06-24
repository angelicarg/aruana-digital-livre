import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHero } from "@/components/PageLayout";
import { TrendingUp, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Cases de Sites Institucionais e Projetos Digitais | Aruanã Digital" },
      {
        name: "description",
        content:
          "Veja cases reais de sites institucionais, automação e transformação digital entregues pela Aruanã Digital para empresas e instituições.",
      },
      { property: "og:title", content: "Cases de Sites Institucionais e Projetos Digitais | Aruanã Digital" },
      { property: "og:description", content: "Projetos, resultados e indicadores reais." },
      { property: "og:url", content: "https://aruanadigital.com/cases" },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/cases" }],
  }),
  component: CasesPage,
});

const CASES = [
  {
    tag: "Educação",
    title: "Instituto Educar+ — Acessibilidade total",
    desc: "Plataforma inclusiva com VLibras, audiodescrição e gestão simplificada para 4.000 alunos.",
    metrics: [
      ["+212%", "matrículas"],
      ["100%", "WCAG 2.1"],
      ["6 meses", "ROI"],
    ],
  },
  {
    tag: "Indústria",
    title: "Logística MG — Automação operacional",
    desc: "Automação de cotações, integrações com ERP e dashboard executivo em tempo real.",
    metrics: [
      ["−68%", "tempo operacional"],
      ["+3x", "cotações/dia"],
      ["24/7", "operação"],
    ],
  },
  {
    tag: "Saúde",
    title: "Clínica Vida — Ecossistema digital",
    desc: "Site, agendamento online, IA de atendimento e prontuário integrado.",
    metrics: [
      ["+147%", "leads"],
      ["−40%", "no-show"],
      ["+5★", "satisfação"],
    ],
  },
  {
    tag: "Governo",
    title: "Município Conecta — Portal acessível",
    desc: "Portal de serviços públicos com acessibilidade total e simplificação de jornadas.",
    metrics: [
      ["+8x", "serviços online"],
      ["AAA", "acessibilidade"],
      ["+92%", "satisfação"],
    ],
  },
];

function CasesPage() {
  return (
    <PageLayout>
      <PageHero
        eyebrow="Cases de sucesso"
        title="Resultados reais. Impacto que se mede."
        subtitle="Selecionamos projetos que mostram como tecnologia, educação e acessibilidade geram crescimento concreto."
      />

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {CASES.map((c) => (
              <article
                key={c.title}
                className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-premium"
              >
                <div className="bg-hero-gradient p-8 text-white">
                  <span className="rounded-full bg-brand-green/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-green">
                    {c.tag}
                  </span>
                  <h2 className="mt-4 text-2xl font-black">{c.title}</h2>
                  <p className="mt-3 text-white/80">{c.desc}</p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  {c.metrics.map(([v, l]) => (
                    <div key={l} className="p-6 text-center">
                      <p className="text-2xl font-black text-brand-green-deep">{v}</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                        {l}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {[
              { icon: TrendingUp, n: "+150%", l: "crescimento médio em conversão" },
              { icon: Users, n: "+30k", l: "pessoas alcançadas com acessibilidade" },
              { icon: Zap, n: "−60%", l: "tempo operacional com automação" },
            ].map((s) => (
              <div key={s.l} className="rounded-3xl bg-muted p-8 text-center">
                <s.icon className="mx-auto h-8 w-8 text-brand-green-deep" />
                <p className="mt-4 text-4xl font-black text-foreground">{s.n}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
