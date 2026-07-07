import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, PageHero } from "@/components/PageLayout";
import { Shield, Lock, Eye, FileText, UserCheck, Cookie } from "lucide-react";
import heroFish from "@/assets/hero-fish.jpg";

export const Route = createFileRoute("/privacidade")({
  component: PrivacidadePage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Aruanã Digital" },
      {
        name: "description",
        content:
          "Política de Privacidade da Aruanã Digital: como protegemos seus dados pessoais em conformidade com a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — Aruanã Digital" },
      {
        property: "og:description",
        content:
          "Como a Aruanã Digital coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
      },
      { property: "og:url", content: "https://aruanadigital.com/privacidade" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://aruanadigital.com${heroFish}` },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/privacidade" }],
  }),
});

function PrivacidadePage() {
  const sections = [
    {
      icon: Shield,
      title: "Compromisso com a Privacidade",
      text: "A Aruanã Digital valoriza a privacidade de seus usuários e está comprometida em proteger os dados pessoais coletados em nossos canais digitais. Esta política explica como coletamos, usamos, armazenamos e protegemos suas informações, em total conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).",
    },
    {
      icon: Eye,
      title: "Dados que Coletamos",
      text: "Coletamos apenas os dados estritamente necessários para prestarmos nossos serviços e melhorarmos sua experiência. Isso pode incluir: nome, e-mail, telefone, dados da empresa e informações técnicas de navegação (IP, cookies, localização aproximada). Todos os dados são coletados de forma transparente, com seu consentimento livre e informado.",
    },
    {
      icon: Lock,
      title: "Segurança dos Dados",
      text: "Utilizamos medidas técnicas e administrativas adequadas para proteger seus dados pessoais contra acessos não autorizados, vazamentos, alterações indevidas ou destruição. Nossos servidores contam com criptografia, firewalls e monitoramento contínuo. A segurança da sua informação é prioridade em todos os nossos processos.",
    },
    {
      icon: FileText,
      title: "Uso das Informações",
      text: "Os dados coletados são utilizados exclusivamente para: responder às suas solicitações, prestar os serviços contratados, enviar comunicações sobre novidades (quando autorizado), cumprir obrigações legais e aprimorar nossos produtos e serviços. Nunca vendemos seus dados pessoais a terceiros.",
    },
    {
      icon: UserCheck,
      title: "Seus Direitos como Titular",
      text: "De acordo com a LGPD, você tem direito a: confirmar a existência de tratamento, acessar seus dados, corrigir informações incompletas ou desatualizadas, anonimizar ou eliminar dados desnecessários, portar dados para outro serviço, revogar consentimento e ser informado sobre compartilhamentos. Para exercer seus direitos, envie um e-mail para aruanadigital@aruanadigital.com.",
    },
    {
      icon: Cookie,
      title: "Cookies e Tecnologias Similares",
      text: "Utilizamos cookies para melhorar a navegação, personalizar conteúdo, analisar tráfego e entender como nossos visitantes interagem com o site. Você pode gerenciar suas preferências de cookies diretamente no navegador. Nossos cookies não coletam dados pessoais sensíveis sem sua autorização expressa.",
    },
  ];

  return (
    <PageLayout>
      <PageHero
        eyebrow="Segurança e Transparência"
        title="Política de Privacidade"
        subtitle="Entenda como protegemos seus dados pessoais e respeitamos sua privacidade em conformidade com a LGPD."
      />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {sections.map((section) => (
            <article key={section.title} className="flex gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                <section.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-brand-navy mb-3">{section.title}</h2>
                <p className="text-sm leading-relaxed text-foreground/80">{section.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-8">
          <h2 className="text-xl font-bold text-brand-navy mb-4">Dúvidas sobre a LGPD?</h2>
          <p className="text-sm leading-relaxed text-foreground/80 mb-6">
            Se você tiver qualquer dúvida sobre nossa Política de Privacidade ou desejar exercer
            seus direitos como titular de dados pessoais, entre em contato conosco. Nosso time de
            DPO (Encarregado de Dados) está à disposição para ajudar.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:aruanadigital@aruanadigital.com"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-green/90"
            >
              <Lock className="h-4 w-4" />
              Falar com o DPO
            </a>
            <a
              href="https://wa.me/5534992086611"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-brand-green/30 px-6 py-3 text-sm font-semibold text-brand-green transition hover:bg-brand-green/10"
            >
              Contato via WhatsApp
            </a>
          </div>
        </div>

        <p className="mt-12 text-center text-xs text-foreground/50">
          Última atualização:{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </section>
    </PageLayout>
  );
}
