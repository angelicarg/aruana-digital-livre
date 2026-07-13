import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHero } from "@/components/PageLayout";
import { Bot, ExternalLink, Info, Layers, Sparkles } from "lucide-react";
import heroFish from "@/assets/hero-fish.jpg";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Cases: Criação de Sites e Projetos Digitais | Aruanã" },
      {
        name: "description",
        content:
          "Veja projetos completos e no ar construídos pela Aruanã Digital: sites, agendamento online, e-commerce e chatbots com IA real que você pode testar agora.",
      },
      {
        name: "keywords",
        content:
          "cases Aruanã Digital, portfólio de projetos digitais, sites com chatbot IA, sistema de agendamento online, e-commerce com WhatsApp, agência digital Uberlândia",
      },
      { property: "og:title", content: "Cases: Criação de Sites e Projetos Digitais | Aruanã" },
      { property: "og:description", content: "Projetos completos e no ar, prontos para você testar." },
      { property: "og:url", content: "https://aruanadigital.com/cases" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://aruanadigital.com${heroFish}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://aruanadigital.com${heroFish}` },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/cases" }],
  }),
  component: CasesPage,
});

const CASES = [
  {
    tag: "Serviços",
    title: "Carlos Pinto Pintor",
    desc: "Landing page com calculadora de orçamento em 3 passos, do cômodo até o valor final, direto para o fechamento via WhatsApp.",
    highlights: ["Orçamento em 3 passos", "Cálculo automático", "Fechamento via WhatsApp"],
    url: "https://carlos-pintor.vercel.app/",
  },
  {
    tag: "Saúde",
    title: "Clínica Dente Vivo",
    desc: "Agendamento online em tempo real, chatbot de atendimento e painel para a equipe confirmar ou recusar consultas.",
    highlights: ["Agendamento em tempo real", "Painel da equipe", "Chatbot de atendimento"],
    url: "https://dente-vivo.vercel.app/",
  },
  {
    tag: "Alimentação",
    title: "Forno 81",
    desc: "E-commerce com carrinho de compras, checkout via WhatsApp e o Toninho, um atendente com IA real que conhece todo o cardápio.",
    highlights: ["IA real (Claude)", "Carrinho + WhatsApp", "Atendimento a qualquer hora"],
    url: "https://forno81.vercel.app/",
  },
  {
    tag: "Varejo",
    title: "Página Mágica",
    desc: "Livraria online com painel administrativo completo — produtos, promoções e pedidos — e a Nina, uma IA que responde com o catálogo em tempo real.",
    highlights: ["Painel admin completo", "Pedidos salvos no banco", "IA lê o catálogo ao vivo"],
    url: "https://pagina-magica.vercel.app/",
  },
  {
    tag: "Saúde",
    title: "Clínica Visão Plena",
    desc: "Mesmo espírito do Dente Vivo, agora para oftalmologia: agendamento online por especialidade e médico, com painel para a equipe confirmar consultas e bloquear horários.",
    highlights: ["Agendamento por especialidade", "Painel da equipe", "Bloqueio de agenda"],
    url: "https://site-clinica-visao.vercel.app/",
  },
  {
    tag: "Pet",
    title: "Patas Nobres",
    desc: "Pet shop completo: agendamento de banho e tosa, loja com carrinho de compras e uma assistente de IA que recomenda produtos com base no perfil do pet — tudo com histórico do cliente unificado.",
    highlights: ["Agendamento + loja juntos", "IA recomenda produtos", "Histórico unificado por cliente"],
    url: "https://patas-nobres.vercel.app/",
  },
  {
    tag: "Educação Inclusiva",
    title: "PortLibras",
    desc: "Plataforma bilíngue Português-Libras para o ensino de surdos, nascida de pesquisa de doutorado em Estudos Linguísticos.",
    status: "soon" as const,
  },
];

function CasesPage() {
  return (
    <PageLayout>
      <PageHero
        eyebrow="Portfólio de projetos"
        title="Projetos completos. No ar. Para você testar."
        subtitle="Construímos cada um desses projetos do zero para mostrar como unimos design, automação e inteligência artificial. Clique e explore ao vivo."
      />

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex gap-4 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-6">
            <Info className="h-5 w-5 shrink-0 text-brand-green" />
            <p className="text-sm leading-relaxed text-foreground/80">
              <span className="font-semibold text-brand-navy">Sobre estes cases:</span> são projetos de
              demonstração, criados para mostrar nossa metodologia, capacidade técnica e padrão de
              qualidade — cada um funcionando de verdade, para você testar. Toda solução real é
              personalizada conforme o desafio específico do cliente. Quer que sua empresa seja o
              próximo case?{" "}
              <a href="/contato" className="font-semibold text-brand-green underline hover:text-brand-green-deep">
                Fale com nossa equipe
              </a>
              .
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {CASES.map((c) => (
              <article
                key={c.title}
                className={`group overflow-hidden rounded-3xl border bg-card shadow-card transition ${
                  c.status === "soon"
                    ? "border-dashed border-border/70 opacity-90"
                    : "border-border hover:-translate-y-1 hover:shadow-premium"
                }`}
              >
                <div className="bg-hero-gradient p-8 text-white">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-green/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-green">
                      {c.tag}
                    </span>
                    {c.status === "soon" && (
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/80">
                        Em breve
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 text-2xl font-black">{c.title}</h2>
                  <p className="mt-3 text-white/80">{c.desc}</p>
                </div>

                {c.status === "soon" ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Projeto em desenvolvimento — em breve com link ao vivo aqui.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 divide-x divide-border">
                      {c.highlights.map((h) => (
                        <div key={h} className="flex items-center p-5 text-center">
                          <p className="text-xs font-bold leading-snug text-brand-green-deep">{h}</p>
                        </div>
                      ))}
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 border-t border-border py-4 text-sm font-bold text-brand-navy-deep transition hover:gap-3"
                    >
                      Ver projeto ao vivo <ExternalLink className="h-4 w-4" />
                    </a>
                  </>
                )}
              </article>
            ))}
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Layers, n: "6", l: "projetos completos, no ar" },
              { icon: Bot, n: "3", l: "chatbots com IA real (Claude)" },
              { icon: Sparkles, n: "7", l: "segmentos de mercado no portfólio" },
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
