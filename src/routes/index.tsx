import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  ArrowRight,
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
  CheckCircle2,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { CasePreview } from "@/components/CasePreview";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { trackEvent } from "@/lib/analytics";
import heroFish from "@/assets/hero-fish.jpg";
import { mountAruanaFish } from "@/lib/aruana-fish";

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
          sameAs: [
            "https://wa.me/5534992086611",
            "https://instagram.com/aruanadigital",
            "https://www.linkedin.com/in/aruan%C3%A3-digital-956442421/",
          ],
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Aruanã Digital",
          url: "https://aruanadigital.com/",
          description:
            "Agência de criação de sites institucionais profissionais com SEO, performance e acessibilidade.",
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

// Prova verificável no lugar de depoimentos: projetos de demonstração no ar,
// que o visitante pode abrir e testar. Nunca apresentar como clientes reais.
const PROOF_PROJECTS = [
  {
    name: "Clínica Dente Vivo",
    desc: "Agende uma consulta de verdade: escolha a dentista, o dia e o horário, e veja a confirmação chegar.",
    url: "https://dente-vivo.vercel.app/",
    print: "/cases/dente-vivo.webp",
  },
  {
    name: "Forno 81",
    desc: "Monte um pedido no carrinho e converse com o Toninho, um atendente com IA real que conhece todo o cardápio.",
    url: "https://forno81.vercel.app/",
    print: "/cases/forno81.webp",
  },
  {
    name: "Patas Nobres",
    desc: "Agende banho e tosa, explore a loja e peça uma recomendação de produto à assistente de IA.",
    url: "https://patas-nobres.vercel.app/",
    print: "/cases/patas-nobres.webp",
  },
];

function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!canvasRef.current || !textRef.current) return;
    return mountAruanaFish(canvasRef.current, textRef.current, {
      colorSrc: "/hero/fish-color.webp",
      maskSrc: "/hero/fish-mask.png",
    });
  }, []);
  return (
    <PageLayout>
      {/* HERO */}
      {/* O peixe é um canvas 2D (lib/aruana-fish.js): a imagem aprovada fatiada em
          tiras, com perspectiva e ondulação de cauda. Atrás do texto, nunca sobre ele.
          Sem JS ou com a imagem falhando, o fundo em gradiente e os pixels seguem. */}
      <section
        className="relative flex items-center overflow-hidden border-b border-white/10 text-white"
        style={{
          minHeight: "min(72vh, 620px)",
          background: "radial-gradient(110% 90% at 70% 50%, #0A2E4A 0%, #041B33 55%, #021226 100%)",
        }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block h-full w-full"
        />
        <div className="pointer-events-none relative z-[2] mx-auto flex w-full max-w-[1240px] flex-col px-7 pb-10 pt-10">
          <div ref={textRef} className="flex max-w-[700px] flex-col gap-5">
            <span className="font-mono text-xs uppercase tracking-[.16em] text-brand-green">
              Uberlândia/MG · para todo o Brasil
            </span>
            <h1 className="max-w-[17ch] text-balance text-[clamp(36px,4.6vw,62px)] font-semibold leading-[1.03] tracking-[-.035em]">
              Sites que trabalham por você:{" "}
              <span className="text-brand-green">captam, incluem e geram resultado.</span>
            </h1>
            <p className="max-w-[44ch] text-pretty text-[clamp(17px,1.5vw,19px)] leading-[1.55] text-white/75">
              Ecossistemas digitais que unem tecnologia, acessibilidade, educação e inovação para
              gerar crescimento sustentável.
            </p>
            <div className="pointer-events-auto mt-1 flex flex-wrap gap-3">
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("click_whatsapp", { placement: "home_hero" })}
                className="inline-flex items-center gap-2 rounded-full bg-brand-green px-[26px] py-4 font-semibold text-brand-navy-deep shadow-[0_0_0_6px_rgba(47,213,140,.12)] transition hover:scale-105"
              >
                <MessageCircle className="h-5 w-5" /> Falar com Especialista
              </a>
              <Link
                to="/cases"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-brand-navy-deep/45 px-[26px] py-4 font-medium text-white transition hover:bg-white/10"
              >
                Ver Nossos Cases <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="mt-6 hidden max-w-[540px] flex-wrap min-[1000px]:flex gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-sm text-white/70">
              {["VLibras integrado", "WCAG 2.1", "100% responsivo"].map((b) => (
                <span key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-green" /> {b}
                </span>
              ))}
            </div>
          </div>
          {/* Reserva o lugar do peixe embaixo do texto em telas estreitas. */}
          <div className="h-0 max-[999px]:h-[46vw]" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2]">
          <div className="mx-auto flex max-w-[1240px] justify-end px-7 pb-4 font-mono text-[11px] uppercase tracking-[.14em] text-[#7E93A5]">
            Clique para rever a entrada ↻
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section className="border-y border-border bg-muted py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-text">
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
                    <p className="font-display text-sm font-bold uppercase tracking-wider text-brand-green-text">
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
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-text">
              O que entregamos
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">
              Soluções que unem <span className="text-gradient-brand">estratégia e tecnologia</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Do diagnóstico à operação, construímos ecossistemas digitais sob medida.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                {/* Os seis cards repetiam "Saiba mais" como único texto do link.
                    Quem usa leitor de tela navega puxando a lista de links da
                    página, e ali isso vira seis entradas idênticas que não dizem
                    para onde vão (WCAG 2.4.4). O rótulo nomeia o serviço sem
                    mudar o que aparece na tela — mesmo padrão dos links de
                    "Abrir e testar ao vivo" na seção de prova. */}
                <Link
                  to="/servicos"
                  aria-label={`Saiba mais sobre ${s.title}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green-text transition group-hover:gap-2.5"
                >
                  Saiba mais <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="relative overflow-hidden bg-brand-navy-deep py-12 text-white lg:py-16">
        <div className="absolute inset-0 grid-pattern opacity-30" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green">
              Por que Aruanã
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">Nossos diferenciais</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-text">
              Metodologia
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">A jornada Aruanã</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Um caminho claro do diagnóstico ao crescimento sustentável.
            </p>
          </div>

          <ol className="mt-10 grid gap-6 md:grid-cols-3 lg:grid-cols-5">
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
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-green-deep to-brand-navy-deep py-12 text-white lg:py-16">
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

      {/* PROVA VERIFICÁVEL */}
      <section className="bg-muted py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-text">
              Prova real
            </p>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">
              Não vamos te mostrar depoimento.{" "}
              <span className="text-gradient-brand">Vamos te mostrar software funcionando.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Todos os projetos abaixo estão no ar — abra, clique, teste o agendamento, converse com
              o chatbot. Construímos cada um para demonstrar o que é possível: empresa fictícia,
              software real.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PROOF_PROJECTS.map((p) => (
              <article
                key={p.name}
                className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-card transition hover:-translate-y-1 hover:shadow-premium"
              >
                <CasePreview nome={p.name} url={p.url} print={p.print} />
                <div className="flex flex-1 flex-col p-7">
                <span className="self-start rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-green-text">
                  Projeto de demonstração
                </span>
                <h3 className="mt-4 font-display text-xl font-bold">{p.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir e testar ao vivo: ${p.name}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-green-text transition hover:gap-3"
                >
                  Abrir e testar ao vivo <ExternalLink className="h-4 w-4" />
                </a>
                </div>
              </article>
            ))}
          </div>
          {/* A pergunta de preço vem depois da prova, e não antes: quem acabou de
              abrir um agendamento funcionando já está perguntando quanto custa.
              Um bloco só, e não dois links para /cases — a página passou a ter
              projeto e preço juntos, então o rótulo diz as duas coisas.
              ⚠️ O texto do link precisa dizer o destino sozinho (WCAG 2.4.4):
              quem usa leitor de tela navega puxando a lista de links da página,
              e "clique aqui" não informa nada nessa lista. */}
          <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-card">
            <h3 className="font-display text-2xl font-black text-brand-navy-deep">
              Quer saber quanto custa?
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Os preços estão junto dos sites que a gente já construiu — dá para ver cada um
              funcionando, testar por dentro e conferir a faixa de investimento.
            </p>
            <Link
              to="/cases"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-green px-7 py-3.5 font-semibold text-brand-navy-deep shadow-card transition hover:-translate-y-0.5 hover:gap-3"
            >
              Ver projetos e preços <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE FORM */}
      <section className="bg-muted py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-card p-8 shadow-card sm:p-10">
            <div className="mb-8 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-green-text">
                Próximo passo
              </p>
              <h2 className="text-3xl font-black sm:text-4xl">
                Vamos conversar sobre seu projeto?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Deixe seus dados aqui — em 3 passos rápidos. Sem spam, sem complicação.
              </p>
            </div>
            <LeadCaptureForm />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden bg-hero-gradient py-12 text-white lg:py-16">
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
