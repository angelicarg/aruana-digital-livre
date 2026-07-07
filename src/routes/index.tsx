import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Code2,
  Network,
  Lightbulb,
  Bot,
  GraduationCap,
  Accessibility,
  Search,
  ClipboardList,
  Rocket,
  Users,
  TrendingUp,
  Quote,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import heroFish from "@/assets/hero-fish.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Criação de Site Institucional para Empresas | Aruanã Digital" },
      {
        name: "description",
        content:
          "Criação de sites institucionais profissionais para empresas: design premium, SEO, performance e acessibilidade. Atendemos Uberlândia, o Triângulo Mineiro e todo o Brasil. Solicite um orçamento.",
      },
      {
        name: "keywords",
        content:
          "criação de site institucional, site institucional para empresas, desenvolvimento de sites, agência de sites, site profissional, site corporativo, criação de sites SEO, sites acessíveis, agência digital Uberlândia, agência digital Minas Gerais, Aruanã Digital",
      },
      { property: "og:title", content: "Criação de Site Institucional para Empresas | Aruanã Digital" },
      {
        property: "og:description",
        content:
          "Sites institucionais sob medida para empresas: design, SEO, performance e acessibilidade. De Uberlândia/MG para todo o Brasil.",
      },
      { property: "og:url", content: "https://aruanadigital.com/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://aruanadigital.com${heroFish}` },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Criação de Site Institucional para Empresas | Aruanã Digital" },
      {
        name: "twitter:description",
        content:
          "Sites institucionais sob medida para empresas: design, SEO, performance e acessibilidade.",
      },
      { name: "twitter:image", content: `https://aruanadigital.com${heroFish}` },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: "Aruanã Digital",
          url: "https://aruanadigital.com/",
          image: `https://aruanadigital.com${heroFish}`,
          email: "aruanadigital@aruanadigital.com",
          description:
            "Agência de criação de sites institucionais para empresas, com foco em SEO, performance, acessibilidade e resultados. Sediada em Uberlândia/MG, atende empresas de todo o Brasil.",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Uberlândia",
            addressRegion: "MG",
            addressCountry: "BR",
          },
          areaServed: [
            { "@type": "City", name: "Uberlândia" },
            { "@type": "State", name: "Minas Gerais" },
            { "@type": "Country", name: "Brasil" },
          ],
          serviceType: [
            "Criação de Site Institucional",
            "Desenvolvimento Web",
            "SEO",
            "Automação e Inteligência Artificial",
            "Acessibilidade Digital",
          ],
          sameAs: ["https://wa.me/5534992086611", "https://instagram.com/aruanadigital"],
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+55-34-99208-6611",
            contactType: "sales",
            areaServed: "BR",
            availableLanguage: ["Portuguese"],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Criação de Site Institucional para Empresas",
          provider: { "@type": "Organization", name: "Aruanã Digital", url: "https://aruanadigital.com/" },
          areaServed: "BR",
          description:
            "Desenvolvimento de sites institucionais profissionais para empresas, com design sob medida, SEO técnico, acessibilidade WCAG 2.1 e foco em conversão.",
        }),
      },
    ],
  }),
  component: HomePage,
});

const WHATSAPP = "https://wa.me/5534992086611?text=Ol%C3%A1%2C+quero+falar+com+um+especialista.";

const SERVICES = [
  {
    icon: Code2,
    title: "Sites Estratégicos",
    desc: "Presença digital que vende, ensina e conecta. Performance, SEO e conversão.",
  },
  {
    icon: Network,
    title: "Ecossistemas Digitais",
    desc: "Integração de plataformas, canais e dados em uma operação fluida.",
  },
  {
    icon: Lightbulb,
    title: "Consultoria em Inovação",
    desc: "Estratégia, diagnóstico e roadmap de transformação digital.",
  },
  {
    icon: Bot,
    title: "Automação & IA",
    desc: "Reduza tarefas repetitivas e amplifique a operação com inteligência artificial.",
  },
  {
    icon: GraduationCap,
    title: "Educação Tecnológica",
    desc: "Capacitação prática para equipes, gestores e instituições de ensino.",
  },
  {
    icon: Accessibility,
    title: "Acessibilidade Digital",
    desc: "Projetos inclusivos com VLibras, WCAG e usabilidade universal.",
  },
];

const DIFFERENTIATORS = [
  "Tecnologia acessível",
  "Educação aplicada",
  "Inclusão digital",
  "Atendimento humanizado",
  "Soluções sob medida",
  "Foco em resultados",
];

const STEPS = [
  { icon: Search, title: "Diagnóstico", desc: "Entendemos o cenário, a operação e os objetivos." },
  {
    icon: ClipboardList,
    title: "Planejamento",
    desc: "Desenhamos a estratégia digital com clareza e prioridade.",
  },
  {
    icon: Rocket,
    title: "Implementação",
    desc: "Construímos a solução com tecnologia e acessibilidade.",
  },
  { icon: Users, title: "Capacitação", desc: "Treinamos sua equipe para autonomia e evolução." },
  {
    icon: TrendingUp,
    title: "Crescimento",
    desc: "Acompanhamos resultados e otimizamos continuamente.",
  },
];

const TESTIMONIALS = [
  {
    name: "Mariana Costa",
    role: "Diretora — Instituto Educar+",
    text: "A Aruanã traduziu nossa visão em uma plataforma acessível e simples. Triplicamos o número de matrículas em 6 meses.",
  },
  {
    name: "Rafael Mendes",
    role: "CEO — Logística MG",
    text: "Automatizamos processos críticos e a equipe ganhou tempo para o que importa. Profissionais excepcionais.",
  },
  {
    name: "Letícia Almeida",
    role: "Coordenadora Pedagógica",
    text: "O cuidado com acessibilidade fez toda a diferença. Hoje atendemos um público muito mais amplo.",
  },
];

function HomePage() {
  return (
    <PageLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-navy-deep text-white">
        {/* Fish as ambient background */}
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src={heroFish}
            alt=""
            className="absolute inset-y-0 right-0 h-full w-[140%] max-w-none object-cover object-right opacity-25 mix-blend-screen animate-float sm:w-[90%] sm:opacity-35 lg:w-3/5 lg:opacity-40"
          />
          {/* Mobile: vertical fade from top so fish sits behind text softly */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-navy-deep via-brand-navy-deep/70 to-brand-navy-deep sm:hidden" />
          {/* Tablet/Desktop: horizontal fade so left side stays readable */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-brand-navy-deep via-brand-navy-deep/85 to-brand-navy-deep/20 sm:block" />
          <div className="absolute inset-0 hidden bg-gradient-to-b from-brand-navy-deep/30 via-transparent to-brand-navy-deep sm:block" />
          <div className="absolute inset-0 grid-pattern opacity-20 sm:opacity-30" />
          <div className="absolute -right-32 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-brand-green/15 blur-3xl animate-pulse-glow lg:h-[700px] lg:w-[700px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-40">
          <div className="max-w-3xl animate-fade-up">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-green backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Tecnologia · Educação · Resultados
            </p>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
              Transformamos sua presença digital em uma ferramenta ativa de{" "}
              <span className="text-gradient-brand">captação, inclusão e resultados reais.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Desenvolvemos ecossistemas digitais que unem tecnologia, acessibilidade, educação e
              inovação para gerar crescimento sustentável.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-brand-gradient px-7 py-3.5 font-semibold text-white shadow-glow transition hover:scale-105"
              >
                <MessageCircle className="h-5 w-5" /> Falar com Especialista
              </a>
              <Link
                to="/cases"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                Ver Nossos Cases <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
              {["VLibras integrado", "WCAG 2.1", "100% responsivo"].map((b) => (
                <span key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-green" /> {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section className="border-y border-border bg-muted py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-deep">
                Sobre a Aruanã Digital
              </p>
              <h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                Tecnologia deve ser{" "}
                <span className="text-gradient-brand">funcional para todos.</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Somos um hub de tecnologia, educação e inovação. Acreditamos que a inovação só é
                completa quando gera resultados concretos e promove inclusão social — por isso
                transformamos tecnologias complexas em processos simples, acessíveis e orientados ao
                impacto real.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ["Missão", "Tornar a tecnologia acessível, inclusiva e geradora de resultados."],
                  ["Visão", "Ser referência nacional em transformação digital com propósito."],
                  ["Filosofia", "Inovação completa é aquela que inclui e transforma."],
                  ["Compromisso", "Acessibilidade e impacto social em cada projeto."],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-2xl bg-card p-5 shadow-card">
                    <p className="font-display text-sm font-bold uppercase tracking-wider text-brand-green-deep">
                      {t}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                "Inclusão",
                "Acessibilidade",
                "Educação",
                "Inovação",
                "Transparência",
                "Simplicidade",
                "Funcionalidade",
                "Resultados",
                "Impacto",
              ].map((v, i) => (
                <div
                  key={v}
                  className="aspect-square rounded-2xl border border-border bg-card p-4 text-center shadow-card transition hover:-translate-y-1 hover:border-brand-green"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="grid h-full place-items-center">
                    <span className="font-display text-sm font-bold text-brand-navy-deep">{v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-deep">
              O que entregamos
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">
              Soluções que unem <span className="text-gradient-brand">estratégia e tecnologia</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Do diagnóstico à operação, construímos ecossistemas digitais sob medida.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <article
                key={s.title}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-card transition hover:-translate-y-1 hover:border-brand-green hover:shadow-premium"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <s.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                <Link
                  to="/servicos"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green-deep transition group-hover:gap-2.5"
                >
                  Saiba mais <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="relative overflow-hidden bg-brand-navy-deep py-20 text-white lg:py-28">
        <div className="absolute inset-0 grid-pattern opacity-30" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green">
              Por que Aruanã
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">Nossos diferenciais</h2>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map((d) => (
              <div
                key={d}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-brand-green hover:bg-white/10"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-gradient">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <span className="font-display text-lg font-bold">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METODOLOGIA */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-deep">
              Metodologia
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">A jornada Aruanã</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Um caminho claro do diagnóstico ao crescimento sustentável.
            </p>
          </div>

          <ol className="mt-14 grid gap-6 md:grid-cols-3 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="relative rounded-3xl border border-border bg-card p-6 shadow-card"
              >
                <span className="absolute -top-3 left-6 rounded-full bg-brand-gradient px-3 py-1 text-xs font-bold text-white">
                  Etapa {i + 1}
                </span>
                <div className="mt-3 grid h-12 w-12 place-items-center rounded-xl bg-muted text-brand-green-deep">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TECNOLOGIA PARA TODOS */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-green-deep to-brand-navy-deep py-20 text-white lg:py-28">
        <div className="absolute inset-0 grid-pattern opacity-20" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green">
              Acessibilidade
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">Tecnologia para Todos</h2>
            <p className="mt-6 text-lg leading-relaxed text-white/85">
              Acreditamos que a inovação só faz sentido quando pode ser utilizada por todas as
              pessoas. Nossos projetos seguem princípios de acessibilidade digital, inclusão e
              usabilidade universal.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["VLibras", "Tradução automática para Libras em todo o site."],
              ["Visual Acessível", "Controles de fonte e alto contraste."],
              ["Inclusão Digital", "Projetos pensados para todos os públicos."],
              ["Experiência Universal", "Navegação por teclado e leitores de tela."],
            ].map(([t, d]) => (
              <div
                key={t}
                className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur"
              >
                <Accessibility className="h-7 w-7 text-brand-green" />
                <h3 className="mt-3 font-display font-bold">{t}</h3>
                <p className="mt-1.5 text-sm text-white/80">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="bg-muted py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-deep">
              Depoimentos
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">Quem confia, transforma</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="rounded-3xl bg-card p-7 shadow-card">
                <Quote className="h-8 w-8 text-brand-green" />
                <blockquote className="mt-4 text-base leading-relaxed text-foreground">
                  "{t.text}"
                </blockquote>
                <figcaption className="mt-6 border-t border-border pt-4">
                  <p className="font-display font-bold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden bg-hero-gradient py-20 text-white lg:py-28">
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black leading-tight sm:text-4xl lg:text-6xl">
            Pronto para transformar tecnologia em{" "}
            <span className="text-gradient-brand">resultados</span>?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
            Converse com um especialista e descubra como criar um ecossistema digital acessível,
            eficiente e preparado para o futuro. Atendemos empresas de Uberlândia, do Triângulo
            Mineiro e de todo o Brasil.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-8 py-4 font-semibold text-white shadow-glow transition hover:scale-105"
            >
              <MessageCircle className="h-5 w-5" /> Falar com Especialista
            </a>
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 font-semibold backdrop-blur transition hover:bg-white/10"
            >
              Solicitar Diagnóstico <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
