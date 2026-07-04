import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHero } from "@/components/PageLayout";
import { Heart, Target, Eye, Sparkles, GraduationCap, Accessibility } from "lucide-react";
import mascot from "@/assets/mascot-aru.png";
import heroFish from "@/assets/hero-fish.jpg";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Aruanã Digital — Agência de Sites Institucionais" },
      {
        name: "description",
        content:
          "Conheça a Aruanã Digital, agência de Iturama/MG especializada em criação de sites institucionais, com foco em tecnologia, acessibilidade e resultados para empresas de todo o Brasil.",
      },
      {
        name: "keywords",
        content:
          "sobre a Aruanã Digital, agência digital Iturama, agência digital Minas Gerais, hub de tecnologia e educação, acessibilidade digital",
      },
      { property: "og:title", content: "Sobre a Aruanã Digital — Agência de Sites Institucionais" },
      {
        property: "og:description",
        content: "Tecnologia deve ser funcional para todos. Conheça nosso propósito.",
      },
      { property: "og:url", content: "https://aruanadigital.com/sobre" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://aruanadigital.com${heroFish}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://aruanadigital.com${heroFish}` },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/sobre" }],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <PageLayout>
      <PageHero
        eyebrow="Sobre nós"
        title="Tecnologia com propósito, educação com impacto."
        subtitle="Somos um hub de tecnologia, educação e inovação que desenvolve ecossistemas digitais completos para empresas e instituições que desejam alcançar maturidade digital."
      />

      <section className="py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">Nossa história</h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
              <p>
                A Aruanã Digital nasceu da convicção de que a tecnologia precisa servir às pessoas —
                não o contrário. Inspirada na força e elegância do peixe Aruanã, símbolo de
                movimento, prosperidade e visão de longo alcance, a marca representa nosso
                compromisso com soluções que evoluem junto ao cliente.
              </p>
              <p>
                Atendemos empresas, instituições de ensino e gestores que precisam transformar a
                complexidade digital em processos simples, inclusivos e orientados a resultados
                reais.
              </p>
              <p>
                Cada projeto que entregamos carrega um princípio:{" "}
                <strong className="text-foreground">
                  tecnologia deve ser funcional para todos
                </strong>
                .
              </p>
            </div>
          </div>
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-full bg-brand-green/15 blur-3xl"
              aria-hidden="true"
            />
            <img
              src={mascot}
              alt="Aru — mascote oficial da Aruanã Digital"
              className="relative mx-auto w-full max-w-md"
              loading="lazy"
              width={800}
              height={800}
            />
          </div>
        </div>
      </section>

      <section className="bg-muted py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Target,
                t: "Missão",
                d: "Transformar a presença digital de empresas e instituições em uma ferramenta ativa de captação, inclusão e resultados reais.",
              },
              {
                icon: Eye,
                t: "Visão",
                d: "Ser referência nacional em tecnologia acessível, educação aplicada e inovação com impacto social.",
              },
              {
                icon: Heart,
                t: "Valores",
                d: "Inclusão, acessibilidade, educação, inovação, transparência, simplicidade, funcionalidade, resultados e impacto.",
              },
            ].map((c) => (
              <article key={c.t} className="rounded-3xl bg-card p-8 shadow-card">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <c.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-2xl font-black">{c.t}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{c.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              icon: Sparkles,
              t: "Filosofia",
              d: "Inovação só é completa quando gera resultados concretos e promove inclusão social.",
            },
            {
              icon: GraduationCap,
              t: "Educação",
              d: "Capacitamos pessoas e equipes para que a tecnologia seja apropriada e sustentável.",
            },
            {
              icon: Accessibility,
              t: "Acessibilidade",
              d: "Projetos seguem WCAG, integram VLibras e contemplam todos os públicos.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-3xl border border-border p-8">
              <c.icon className="h-8 w-8 text-brand-green-deep" />
              <h3 className="mt-4 text-xl font-bold">{c.t}</h3>
              <p className="mt-2 text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
