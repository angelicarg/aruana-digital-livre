import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, PageHero } from "@/components/PageLayout";
import {
  Code2,
  Network,
  Lightbulb,
  Bot,
  GraduationCap,
  Accessibility,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import heroFish from "@/assets/hero-fish.jpg";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Criação de Sites Institucionais e Serviços Digitais | Aruanã Digital" },
      {
        name: "description",
        content:
          "Criação de sites institucionais para empresas, ecossistemas digitais, automação, IA e acessibilidade. Atendemos Iturama, Minas Gerais e todo o Brasil.",
      },
      {
        name: "keywords",
        content:
          "criação de site institucional, site para empresa, desenvolvimento de sites, sites corporativos, agência digital, SEO, automação, inteligência artificial, acessibilidade, agência digital Iturama, agência digital Minas Gerais",
      },
      { property: "og:title", content: "Criação de Sites Institucionais e Serviços Digitais | Aruanã Digital" },
      {
        property: "og:description",
        content:
          "Sites institucionais sob medida, automação, IA e acessibilidade para empresas que querem crescer.",
      },
      { property: "og:url", content: "https://aruanadigital.com/servicos" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://aruanadigital.com${heroFish}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://aruanadigital.com${heroFish}` },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/servicos" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Serviços Digitais para Empresas",
          provider: {
            "@type": "Organization",
            name: "Aruanã Digital",
            url: "https://aruanadigital.com/",
            address: { "@type": "PostalAddress", addressLocality: "Iturama", addressRegion: "MG", addressCountry: "BR" },
          },
          areaServed: [
            { "@type": "City", name: "Iturama" },
            { "@type": "State", name: "Minas Gerais" },
            { "@type": "Country", name: "Brasil" },
          ],
          description:
            "Criação de sites institucionais, ecossistemas digitais, automação, inteligência artificial e acessibilidade para empresas.",
        }),
      },
    ],
  }),
  component: ServicosPage,
});

const SERVICES = [
  {
    icon: Code2,
    title: "Desenvolvimento de Sites Estratégicos",
    problem:
      "Sites institucionais que não geram resultado, perdem oportunidades e excluem usuários.",
    solution:
      "Construímos sites estratégicos com foco em performance, SEO, conversão e acessibilidade.",
    benefits: [
      "Performance 90+ em PageSpeed",
      "SEO técnico embarcado",
      "Acessibilidade WCAG 2.1",
      "Design responsivo premium",
    ],
  },
  {
    icon: Network,
    title: "Ecossistemas Digitais",
    problem: "Plataformas isoladas, dados fragmentados, equipes desconectadas.",
    solution: "Integramos canais, sistemas e dados em uma operação digital fluida e mensurável.",
    benefits: [
      "Integração de APIs e CRMs",
      "Painéis unificados",
      "Automação entre sistemas",
      "Visão única do cliente",
    ],
  },
  {
    icon: Lightbulb,
    title: "Consultoria em Inovação",
    problem: "Falta de clareza sobre por onde começar a transformação digital.",
    solution: "Diagnóstico, estratégia e roadmap claros, com prioridades realistas e foco em ROI.",
    benefits: [
      "Diagnóstico de maturidade",
      "Roadmap de transformação",
      "Mentoria executiva",
      "Indicadores de evolução",
    ],
  },
  {
    icon: Bot,
    title: "Automação & Inteligência Artificial",
    problem: "Equipes sobrecarregadas com tarefas repetitivas e baixa produtividade.",
    solution: "Implementamos automações inteligentes e agentes de IA aplicados ao seu negócio.",
    benefits: [
      "Atendimento automatizado",
      "IA para conteúdo e suporte",
      "Redução de custos operacionais",
      "Escalabilidade",
    ],
  },
  {
    icon: GraduationCap,
    title: "Educação Tecnológica",
    problem: "Equipes despreparadas para usar e evoluir as ferramentas digitais.",
    solution: "Trilhas de capacitação aplicadas, do básico ao avançado, com foco prático.",
    benefits: [
      "Treinamentos in-company",
      "Conteúdo sob medida",
      "Materiais acessíveis",
      "Avaliação de resultados",
    ],
  },
  {
    icon: Accessibility,
    title: "Acessibilidade Digital",
    problem: "Produtos digitais que excluem pessoas com deficiência e geram risco jurídico.",
    solution: "Projetamos e adequamos plataformas com VLibras, WCAG 2.1 e usabilidade universal.",
    benefits: [
      "Auditoria de acessibilidade",
      "Integração VLibras",
      "Conformidade LBI",
      "Inclusão real de usuários",
    ],
  },
];

const WHATSAPP = "https://wa.me/5534992369831";

function ServicosPage() {
  return (
    <PageLayout>
      <PageHero
        eyebrow="Serviços"
        title="Soluções digitais que unem estratégia, tecnologia e impacto."
        subtitle="Cada serviço é desenhado para gerar resultado mensurável, com acessibilidade e simplicidade no centro. Atendemos empresas de Iturama, do Triângulo Mineiro e de todo o Brasil."
      />

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
          {SERVICES.map((s, i) => (
            <article
              key={s.title}
              className="grid gap-8 rounded-3xl border border-border bg-card p-8 shadow-card lg:grid-cols-[auto_1fr] lg:p-12"
            >
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-brand-gradient text-white shadow-glow">
                <s.icon className="h-10 w-10" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-green-deep">
                  Serviço {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">{s.title}</h2>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      O problema
                    </p>
                    <p className="mt-2 text-foreground">{s.problem}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-brand-green-deep">
                      Nossa solução
                    </p>
                    <p className="mt-2 text-foreground">{s.solution}</p>
                  </div>
                </div>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {s.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" /> {b}
                    </li>
                  ))}
                </ul>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 font-semibold text-brand-green-deep hover:gap-3 transition-all"
                >
                  Quero esse serviço <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-16 flex max-w-7xl flex-wrap justify-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/cases"
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-semibold text-foreground transition hover:border-brand-green hover:text-brand-green"
          >
            Ver resultados de clientes <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/sobre"
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-semibold text-foreground transition hover:border-brand-green hover:text-brand-green"
          >
            Conhecer a Aruanã Digital <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow transition hover:scale-105"
          >
            Solicitar orçamento <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
