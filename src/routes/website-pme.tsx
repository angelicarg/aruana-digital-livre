import { createFileRoute } from "@tanstack/react-router";
import {
  SearchX,
  MonitorX,
  TrendingDown,
  CheckCircle2,
  GraduationCap,
  Accessibility,
  Heart,
  MessageCircle,
  Mail,
  MapPin,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AruanaLogo } from "@/components/AruanaLogo";
import mascot from "@/assets/mascot-aru.png";

const WHATSAPP_NUMBER = "5534992086611";

function whatsappHref(context: string) {
  const message = `Olá! Vi o anúncio da Aruanã Digital e quero criar um website profissional para o meu negócio. (${context})`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const Route = createFileRoute("/website-pme")({
  head: () => ({
    meta: [
      { title: "Website Profissional para o Seu Negócio — Aruanã Digital" },
      {
        name: "description",
        content:
          "Website profissional, pronto para converter clientes. Fale com um especialista da Aruanã Digital agora pelo WhatsApp.",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Website Profissional para o Seu Negócio — Aruanã Digital" },
      {
        property: "og:description",
        content: "Presença digital profissional, otimizada para Google e pronta para converter clientes.",
      },
    ],
  }),
  component: WebsitePmePage,
});

function WebsitePmePage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden bg-hero-gradient text-white">
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:py-28 lg:px-8">
          <div className="animate-fade-up text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">
              Aruanã Digital
            </p>
            <h1 className="mt-3 font-display text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Sua Loja Está Invisível no Google?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80 lg:mx-0">
              A gente cria um website profissional que faz seus clientes te encontrarem — e
              comprarem. Sem complicação, sem enrolação.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href={whatsappHref("Hero")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-8 py-4 text-base font-semibold text-white shadow-glow transition hover:scale-105 sm:w-auto"
              >
                <MessageCircle className="h-5 w-5" />
                Falar com Especialista
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src={mascot}
              alt="Aru, mascote da Aruanã Digital"
              className="animate-float w-56 sm:w-72 lg:w-80"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Você Está Nessa Situação?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: SearchX,
                title: "Seus clientes não te encontram no Google",
                stat: "73% das buscas não chegam em sites de pequenas empresas",
              },
              {
                icon: MonitorX,
                title: "Website antigo ou feito por amigo passa amadorismo",
                stat: "Boa parte dos clientes desiste se a página é lenta ou feia",
              },
              {
                icon: TrendingDown,
                title: "Website bonito, mas que não vende",
                stat: "Visitante entra e sai — falta estratégia, não falta design",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-border bg-card p-6 text-center shadow-card"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-cloud text-brand-green-deep">
                  <card.icon className="h-7 w-7" />
                </div>
                <p className="mt-4 font-semibold">{card.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{card.stat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="bg-brand-navy-deep py-16 text-white sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black sm:text-3xl">
            Nós Criamos Websites que Vendem
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">
            Presença digital profissional, otimizada para Google e pronta para converter clientes.
          </p>
          <ul className="mx-auto mt-10 grid max-w-2xl gap-4 text-left sm:grid-cols-2">
            {[
              "Design que Impressiona — site moderno que gera confiança",
              "SEO Pronto — pessoas te encontram no Google",
              "Integração WhatsApp — cliente clica, conversa direto com você",
              "Rápido & Acessível — funciona em todos os dispositivos",
              "Suporte da Aruanã — você não fica sozinho",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-white/90">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Por Que Aruanã?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: GraduationCap,
                title: "Educação Tecnológica Incluída",
                text: "A gente não só cria seu website, ensina a gerenciar. Você fica independente depois.",
              },
              {
                icon: Accessibility,
                title: "Acessibilidade (VLibras + WCAG)",
                text: "Seu website funciona pra todos os clientes — vira diferencial competitivo.",
              },
              {
                icon: Heart,
                title: "Atendimento Humanizado",
                text: "Não somos máquina. Conhecemos Uberlândia e respondemos rápido.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <card.icon className="h-7 w-7" />
                </div>
                <p className="mt-4 font-semibold">{card.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CASOS (ANÔNIMOS) */}
      <section className="bg-brand-cloud py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Quem Confia, Transforma</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                segmento: "Clínica de saúde · Uberlândia/MG",
                texto:
                  "Trocou a agenda por telefone e WhatsApp por um sistema de agendamento online, com lembretes automáticos para os pacientes.",
              },
              {
                segmento: "Comércio de alimentos · Uberlândia/MG",
                texto:
                  "Ganhou loja virtual própria com atendimento automático por inteligência artificial, vendendo direto pelo site.",
              },
              {
                segmento: "Varejo · Minas Gerais",
                texto:
                  "Saiu das redes sociais para uma plataforma própria, com painel de gestão de conteúdo e assistente virtual 24h.",
              },
            ].map((c) => (
              <div key={c.segmento} className="rounded-3xl bg-card p-6 shadow-card">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-green-deep">
                  {c.segmento}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{c.texto}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Casos reais de clientes, apresentados de forma anônima.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Como Funciona</h2>
          <div className="mt-10 space-y-4">
            {[
              {
                titulo: "1. Conversa Inicial (gratuita)",
                texto: "Entendemos seu negócio e objetivo. 20 minutos por WhatsApp ou videochamada.",
              },
              {
                titulo: "2. Proposta Clara",
                texto: "Mostramos exatamente o que fazemos e quanto custa. Sem surpresa depois.",
              },
              {
                titulo: "3. Desenvolvimento",
                texto: "A gente cria enquanto você cuida do negócio. Prazo combinado com você.",
              },
              {
                titulo: "4. Você Assume",
                texto: "Website pronto, você leva e gerencia. Treinamento incluído, suporte sempre disponível.",
              },
            ].map((passo) => (
              <div
                key={passo.titulo}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-green/15 text-brand-green-deep">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{passo.titulo}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{passo.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-brand-cloud py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Perguntas Frequentes</h2>
          <Accordion type="single" collapsible className="mt-8 rounded-3xl bg-card px-6 shadow-card">
            {[
              {
                q: "Quanto custa?",
                a: "Depende do que você precisa — nossos projetos vão de um website simples a sistemas completos, com investimento a partir de R$ 1.500. Na conversa inicial (gratuita) a gente entende sua necessidade e te passa um valor certo, sem compromisso.",
              },
              {
                q: "Meu negócio é muito pequeno pra website?",
                a: "Website AUMENTA negócio pequeno. Seus concorrentes já estão online — você quer ficar pra trás?",
              },
              {
                q: "Vou conseguir gerenciar sozinho?",
                a: "Sim. A gente treina. O website é feito pro proprietário gerenciar, não precisa ser técnico.",
              },
              {
                q: "Quanto tempo leva?",
                a: "Em geral 15 a 30 dias, dependendo da complexidade — menos do que você imagina.",
              },
              {
                q: "E se eu não gostar depois?",
                a: "A gente ajusta com você até ficar do jeito certo. Sua satisfação é prioridade.",
              },
            ].map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger className="text-left font-semibold">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-hero-gradient py-16 text-center text-white sm:py-20 lg:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black sm:text-3xl">
            Pronto para Transformar Seu Negócio?
          </h2>
          <p className="mt-3 text-white/80">
            Agende uma conversa grátis com nosso especialista — sem compromisso.
          </p>
          <a
            href={whatsappHref("CTA final")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-8 py-4 text-base font-semibold text-white shadow-glow transition hover:scale-105"
          >
            <MessageCircle className="h-5 w-5" />
            Falar com Especialista via WhatsApp
          </a>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/60">
            <Rocket className="h-4 w-4" />
            Respondemos em até 1 hora
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-brand-navy-deep py-10 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
          <AruanaLogo size="sm" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-brand-green" /> (34) 99208-6611
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-brand-green" /> aruanadigital@aruanadigital.com
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-brand-green" /> Uberlândia / MG
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-green" /> CNPJ 67.876.737/0001-43
            </span>
            <a href="/privacidade" className="transition hover:text-brand-green">
              Política de Privacidade
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
