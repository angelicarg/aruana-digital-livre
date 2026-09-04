import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Accessibility,
  CheckCircle2,
  FileText,
  Gauge,
  Mail,
  MapPin,
  MessageCircle,
  Rocket,
  Search,
  ShieldCheck,
  Target,
  ExternalLink,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AruanaLogo } from "@/components/AruanaLogo";
import { irParaAncora } from "@/lib/ancora";
import { trackEvent } from "@/lib/analytics";

const WHATSAPP_NUMBER = "5534992086611";

export const Route = createFileRoute("/diagnostico")({
  head: () => ({
    meta: [
      { title: "Diagnóstico gratuito de site em 48h | Aruanã Digital" },
      {
        name: "description",
        content:
          "Receba em até 48 horas um relatório de 2 páginas com velocidade, SEO, acessibilidade e conversão do site da sua empresa. Sem custo e sem proposta comercial junto.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Diagnóstico gratuito de site em 48h | Aruanã Digital" },
      {
        property: "og:description",
        content:
          "Velocidade, SEO, acessibilidade e conversão do seu site em um relatório de 2 páginas. Sem custo.",
      },
      { property: "og:url", content: "https://aruanadigital.com/diagnostico" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/diagnostico" }],
  }),
  component: DiagnosticoPage,
});

const FRENTES = [
  ["Velocidade", "quanto tempo leva para abrir no celular, de verdade"],
  ["SEO", "se o Google entende e mostra a sua empresa"],
  ["Acessibilidade", "conformidade com a LBI e a norma ABNT NBR 17225"],
  ["Conversão", "o que faz o visitante desistir antes de falar com você"],
] as const;

// Prova para tráfego frio: quem chega de anúncio nunca ouviu falar da
// empresa, e a primeira objeção é "quem são vocês?". Mesma regra da home —
// projeto de demonstração, nunca apresentado como cliente (ver BRAND.md).
const PROVA = [
  {
    nome: "Clínica Dente Vivo",
    desc: "Agendamento real: escolha a dentista, o dia e o horário e veja a confirmação chegar.",
    url: "https://dente-vivo.vercel.app/",
  },
  {
    nome: "Forno 81",
    desc: "Cardápio, carrinho e um atendente com IA que conhece os produtos de verdade.",
    url: "https://forno81.vercel.app/",
  },
  {
    nome: "Patas Nobres",
    desc: "Banho e tosa agendáveis, loja completa e assistente de IA que recomenda produtos.",
    url: "https://patas-nobres.vercel.app/",
  },
];

const ENTREGAS = [
  {
    icon: Gauge,
    title: "Nota por frente",
    desc: "Velocidade, SEO, acessibilidade e conversão, cada uma com nota de 0 a 10 e o que foi medido em cada caso.",
  },
  {
    icon: Target,
    title: "As três prioridades",
    desc: "Só três. Com o que acontece hoje, quanto custa não resolver e qual é o esforço de correção. Relatório com quinze problemas paralisa; um com três vira decisão.",
  },
  {
    icon: FileText,
    title: "Resumo em linguagem de negócio",
    desc: "Um parágrafo respondendo se o site está ajudando ou atrapalhando a empresa a vender. Sem jargão técnico.",
  },
];

const PASSOS = [
  {
    title: "Você envia o endereço do site",
    desc: "Pelo formulário acima. Três campos, menos de um minuto.",
  },
  {
    title: "Analisamos em até 48 horas",
    desc: "Velocidade real no celular, estrutura de SEO, teste de teclado e leitor de tela, e o caminho que o visitante percorre até o contato.",
  },
  {
    title: "Você recebe o PDF pelo WhatsApp",
    desc: "Sem reunião de apresentação, sem link para plataforma nenhuma. O arquivo é seu.",
  },
  {
    title: "Se fizer sentido, a gente conversa",
    desc: "Trinta minutos, sem compromisso. E se não fizer sentido, o diagnóstico continua sendo seu.",
  },
];

const FAQ = [
  {
    q: "É gratuito mesmo? Onde está a pegadinha?",
    a: "Não há. O diagnóstico leva algumas horas do nosso lado e a gente faz porque é a melhor forma de mostrar como trabalhamos. Você recebe o PDF completo mesmo que nunca contrate nada. Se quiser resolver os pontos por conta própria ou com outro fornecedor, o relatório serve igual.",
  },
  {
    q: "Preciso passar acesso ao site ou senha?",
    a: "Não. A análise é feita de fora, como qualquer visitante faria. Basta o endereço público do site. Se depois você quiser um aprofundamento técnico, aí sim conversamos sobre acesso — mas isso é outra etapa.",
  },
  {
    q: "Minha empresa é pequena. Vale a pena?",
    a: "Costuma valer mais, porque em empresa pequena cada visitante perdido pesa proporcionalmente mais. E as correções de maior impacto — velocidade, clareza da proposta, formulário e contraste — quase nunca exigem refazer o site.",
  },
  {
    q: "Vocês vão me ligar tentando vender?",
    a: "Não. A entrega é pelo WhatsApp, com o PDF anexado, e a conversa só continua se você quiser. Nenhuma ligação, nenhuma sequência de e-mails automáticos.",
  },
];

const SEGMENTOS = [
  "Instituição de ensino",
  "Indústria ou logística",
  "Comércio ou serviço local",
  "Saúde ou clínica",
  "Órgão público ou terceiro setor",
  "Outro",
];

function formatPhone(value: string) {
  let d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return d;
}

function DiagnosticoPage() {
  const [nome, setNome] = useState("");
  const [site, setSite] = useState("");
  const [whats, setWhats] = useState("");
  const [email, setEmail] = useState("");
  const [segmento, setSegmento] = useState("");
  const [erros, setErros] = useState<{ nome?: boolean; site?: boolean; whats?: boolean; email?: boolean }>({});

  const nomeRef = useRef<HTMLInputElement>(null);
  const siteRef = useRef<HTMLInputElement>(null);
  const whatsRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    const novos = {
      nome: nome.trim().length < 2,
      site: site.trim().length === 0,
      whats: whats.replace(/\D/g, "").length < 10,
      email: !emailValido,
    };
    setErros(novos);

    // Leva o foco ao primeiro campo com erro — WCAG 3.3.1
    if (novos.nome) return nomeRef.current?.focus();
    if (novos.site) return siteRef.current?.focus();
    if (novos.whats) return whatsRef.current?.focus();
    if (novos.email) return emailRef.current?.focus();

    const linhas = [
      "Olá! Quero solicitar o Diagnóstico Gratuito de Site.",
      "",
      `Nome: ${nome.trim()}`,
      `Site: ${site.trim()}`,
      `WhatsApp: ${whats.trim()}`,
      `E-mail: ${email.trim()}`,
      ...(segmento ? [`Segmento: ${segmento}`] : []),
      "",
      "Vim pela página de diagnóstico do site da Aruanã.",
    ];

    trackEvent("generate_lead", { origem: "diagnostico" });
    trackEvent("click_whatsapp", { placement: "diagnostico_form" });

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(linhas.join("\n"))}`,
      "_blank",
      "noopener",
    );
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 aria-[invalid=true]:border-destructive";

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#formulario"
        onClick={irParaAncora("formulario")}
        className="absolute -left-[9999px] top-0 z-50 rounded-b-lg bg-brand-navy-deep px-5 py-3 font-bold text-white focus:left-0"
      >
        Pular para o formulário de diagnóstico
      </a>

      {/* HERO + FORMULÁRIO */}
      <section className="relative overflow-hidden bg-hero-gradient text-white">
        <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:py-20 lg:px-8">
          <div className="animate-fade-up">
            <a href="/" aria-label="Aruanã Digital — Início" className="inline-flex">
              <AruanaLogo size="sm" />
            </a>
            <p className="mt-8 inline-block rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-semibold">
              Gratuito · resposta em até 48 horas
            </p>
            <h1 className="mt-5 font-display text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Descubra por que o site da sua empresa{" "}
              <span className="text-gradient-brand">não está trazendo cliente</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
              Analisamos o seu site em quatro frentes e devolvemos um relatório de duas páginas com
              as três prioridades — em linguagem de negócio, não de programador.
            </p>
            <ul className="mt-7 space-y-3">
              {FRENTES.map(([t, d]) => (
                <li key={t} className="flex items-start gap-3 text-white/90">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                  <span>
                    <b>{t}</b> — {d}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-7 max-w-xl rounded-2xl border border-brand-green/40 bg-brand-green/10 p-5">
              <p className="font-display text-base font-bold text-white">
                Ainda não tem site? Essa proposta também é para você.
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">
                Preencha o formulário ao lado com seu e-mail e WhatsApp — a gente entra em
                contato e mostra por onde começar, sem custo.
              </p>
            </div>
            <p className="mt-7 max-w-xl border-l-2 border-brand-green pl-4 text-sm text-white/70">
              Sem custo, sem cadastro em ferramenta e sem proposta comercial junto. O relatório é
              seu mesmo que você nunca contrate nada com a gente.
            </p>
          </div>

          <div id="formulario" tabIndex={-1} className="scroll-mt-20 rounded-3xl bg-card p-7 text-foreground shadow-premium outline-none">
            <h2 className="font-display text-xl font-bold text-brand-navy-deep">
              Solicitar o diagnóstico
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Leva menos de um minuto. Você finaliza pelo WhatsApp.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="diag-nome" className="mb-1.5 block text-sm font-semibold">
                  Seu nome
                </label>
                <input
                  ref={nomeRef}
                  id="diag-nome"
                  type="text"
                  autoComplete="name"
                  placeholder="Como você quer ser chamada ou chamado"
                  className={inputClass}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  aria-invalid={erros.nome === true}
                  aria-describedby="diag-erro-nome"
                  required
                />
                {erros.nome && (
                  <p id="diag-erro-nome" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
                    Informe o seu nome para sabermos com quem falamos.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="diag-site" className="mb-1.5 block text-sm font-semibold">
                  Endereço do site que devemos analisar
                </label>
                <input
                  ref={siteRef}
                  id="diag-site"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="suaempresa.com.br"
                  className={inputClass}
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  aria-invalid={erros.site === true}
                  aria-describedby="diag-dica-site diag-erro-site"
                  required
                />
                <p id="diag-dica-site" className="mt-1.5 text-xs text-muted-foreground">
                  Ainda não tem site? Escreva <b>não tenho</b> — nesse caso analisamos a presença
                  digital da empresa.
                </p>
                {erros.site && (
                  <p id="diag-erro-site" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
                    Informe o endereço do site ou escreva "não tenho".
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="diag-whats" className="mb-1.5 block text-sm font-semibold">
                  WhatsApp <span className="font-normal text-muted-foreground">(com DDD)</span>
                </label>
                <input
                  ref={whatsRef}
                  id="diag-whats"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(34) 90000-0000"
                  className={inputClass}
                  value={whats}
                  onChange={(e) => setWhats(formatPhone(e.target.value))}
                  aria-invalid={erros.whats === true}
                  aria-describedby="diag-erro-whats"
                  required
                />
                {erros.whats && (
                  <p id="diag-erro-whats" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
                    Informe um número com DDD, no formato (34) 90000-0000.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="diag-email" className="mb-1.5 block text-sm font-semibold">
                  E-mail
                </label>
                <input
                  ref={emailRef}
                  id="diag-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="voce@suaempresa.com.br"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={erros.email === true}
                  aria-describedby="diag-erro-email"
                  required
                />
                {erros.email && (
                  <p id="diag-erro-email" role="alert" className="mt-1.5 text-sm font-semibold text-destructive">
                    Informe um e-mail válido — enviamos o relatório também por lá.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="diag-segmento" className="mb-1.5 block text-sm font-semibold">
                  Segmento da empresa{" "}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </label>
                <select
                  id="diag-segmento"
                  className={inputClass}
                  value={segmento}
                  onChange={(e) => setSegmento(e.target.value)}
                >
                  <option value="">Selecione, se quiser</option>
                  {SEGMENTOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-4 font-semibold text-white shadow-glow transition hover:scale-[1.02]"
              >
                <MessageCircle className="h-5 w-5" /> Enviar pelo WhatsApp
              </button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Ao enviar, o WhatsApp abre com a mensagem já escrita. Você só confere e aperta
                enviar.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* PROVA VERIFICÁVEL */}
      <section className="bg-brand-cloud py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl font-black text-brand-navy-deep sm:text-3xl">
              Antes de confiar o seu site a alguém, veja o que essa gente constrói.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Não vamos te mostrar depoimento. Construímos estes projetos para demonstrar o que é
              possível — empresa fictícia, software real — e todos estão no ar. Abra, agende,
              converse com o chatbot. É a mesma prova que você vai receber sobre o seu site.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PROVA.map((p) => (
              <article key={p.nome} className="flex flex-col rounded-3xl bg-card p-6 shadow-card">
                <span className="self-start rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-green-text">
                  Projeto de demonstração
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{p.nome}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir e testar ao vivo: ${p.nome}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-green-text transition hover:gap-3"
                >
                  Abrir e testar ao vivo <ExternalLink className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* O QUE VOCÊ RECEBE */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-brand-navy-deep sm:text-3xl">
            O que você recebe
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Um PDF de duas páginas. Não é um relatório automático de ferramenta — é análise feita
            por especialistas da nossa equipe, escrita para quem toca o negócio.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {ENTREGAS.map((e) => (
              <div key={e.title} className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-cloud text-brand-green-deep">
                  <e.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{e.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="bg-muted py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-brand-navy-deep sm:text-3xl">
            Como funciona
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Quatro passos, nenhuma reunião obrigatória.
          </p>
          <ol className="mt-10 max-w-3xl space-y-7">
            {PASSOS.map((p, i) => (
              <li key={p.title} className="flex gap-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-gradient font-display font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold">{p.title}</h3>
                  <p className="mt-1 text-muted-foreground">{p.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* POR QUE ACESSIBILIDADE */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Accessibility className="h-8 w-8 text-brand-green-deep" />
            <h2 className="font-display text-2xl font-black text-brand-navy-deep sm:text-3xl">
              Por que a acessibilidade entra no diagnóstico
            </h2>
          </div>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-foreground/85">
            <p>
              O Censo 2022 do IBGE contou <b>14,4 milhões de brasileiros com alguma deficiência</b>.
              Entre pessoas com 70 anos ou mais, a proporção passa de <b>uma a cada quatro</b> — e
              quase metade de todas as pessoas com deficiência no país tem 60 anos ou mais. É
              exatamente o público que mais cresce como consumidor.
            </p>
            <p>
              Do lado legal, o <b>artigo 63 da Lei 13.146/2015</b> torna a acessibilidade
              obrigatória em sites de empresas com sede ou representação comercial no Brasil. E
              desde <b>11 de março de 2025</b> existe norma técnica brasileira dizendo o que isso
              significa na prática: a <b>ABNT NBR 17225</b>, alinhada ao WCAG 2.2.
            </p>
            <p>
              Quase nenhuma agência inclui isso numa análise de site. Nós incluímos porque, além de
              ser lei, é receita que a empresa está perdendo sem perceber — ninguém escreve para
              reclamar de um formulário que não funciona. A pessoa só desiste.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-brand-navy-deep sm:text-3xl">
            Perguntas frequentes
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">As quatro que sempre aparecem.</p>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-hero-gradient py-16 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black sm:text-3xl">
            Trinta segundos agora, quarenta e oito horas para a resposta.
          </h2>
          <p className="mt-3 text-white/80">Sem custo, sem cadastro e sem proposta comercial junto.</p>
          <a
            href="#formulario"
            onClick={irParaAncora("formulario")}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-8 py-4 text-base font-semibold text-white shadow-glow transition hover:scale-105"
          >
            <Search className="h-5 w-5" />
            Solicitar o meu diagnóstico
          </a>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/60">
            <Rocket className="h-4 w-4" />
            Resposta em até 48 horas
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
