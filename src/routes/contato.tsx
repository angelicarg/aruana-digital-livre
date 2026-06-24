import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import emailjs from "@emailjs/browser";
import { PageLayout, PageHero } from "@/components/PageLayout";
import { MessageCircle, Mail, MapPin, Clock, Instagram, Send, CheckCircle } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Orçamento de Site Institucional | Aruanã Digital" },
      {
        name: "description",
        content:
          "Solicite um orçamento de site institucional para sua empresa. Fale com a Aruanã Digital por WhatsApp, e-mail ou formulário.",
      },
      { property: "og:title", content: "Contato — Orçamento de Site Institucional | Aruanã Digital" },
      { property: "og:description", content: "Vamos conversar sobre o site institucional da sua empresa." },
      { property: "og:url", content: "https://aruanadigital.com/contato" },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/contato" }],
  }),
  component: ContatoPage,
});

// ─── SUBSTITUA OS VALORES ABAIXO PELOS SEUS IDs DO EMAILJS ───────────────────
const EMAILJS_SERVICE_ID = "service_g33bufp";
const EMAILJS_TEMPLATE_ID = "template_tg8f898";
const EMAILJS_PUBLIC_KEY = "IO1-1Oi-X7AWPXNI8";
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(8, "Telefone inválido").max(20),
  message: z.string().trim().min(10, "Conte um pouco mais").max(1000),
});

function ContatoPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd) as Record<string, string>;

    const res = schema.safeParse(data);
    if (!res.success) {
      const errs: Record<string, string> = {};
      res.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      return;
    }

    setErrors({});
    setSending(true);
    setSendError("");

    try {
      await emailjs.sendForm(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        formRef.current!,
        { publicKey: EMAILJS_PUBLIC_KEY }
      );
      setSent(true);
      formRef.current?.reset();
    } catch (err) {
      setSendError("Erro ao enviar. Tente novamente ou entre em contato pelo WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout>
      <PageHero
        eyebrow="Contato"
        title="Vamos transformar tecnologia em resultado."
        subtitle="Fale com um especialista e receba um diagnóstico gratuito para o seu projeto."
      />

      <section className="py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card lg:p-10">
            <h2 className="text-2xl font-black">Envie sua mensagem</h2>
            <p className="mt-2 text-muted-foreground">Respondemos em até 1 dia útil.</p>

            {sent ? (
              <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl bg-brand-green/10 p-8 text-center">
                <CheckCircle className="h-12 w-12 text-brand-green-deep" />
                <p className="font-display text-lg font-bold">Mensagem enviada com sucesso!</p>
                <p className="text-sm text-muted-foreground">
                  Recebemos sua mensagem e retornaremos em até 1 dia útil.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-2 text-sm underline text-muted-foreground hover:text-brand-green-deep"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
                {[
                  { id: "name", label: "Nome completo", type: "text", placeholder: "Seu nome" },
                  { id: "email", label: "E-mail", type: "email", placeholder: "voce@empresa.com" },
                  { id: "phone", label: "WhatsApp", type: "tel", placeholder: "(00) 00000-0000" },
                ].map((f) => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="text-sm font-semibold">
                      {f.label}
                    </label>
                    <input
                      id={f.id}
                      name={f.id}
                      type={f.type}
                      placeholder={f.placeholder}
                      required
                      maxLength={255}
                      aria-invalid={!!errors[f.id]}
                      className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
                    />
                    {errors[f.id] && (
                      <p className="mt-1 text-xs text-destructive">{errors[f.id]}</p>
                    )}
                  </div>
                ))}
                <div>
                  <label htmlFor="message" className="text-sm font-semibold">
                    Como podemos ajudar?
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    maxLength={1000}
                    required
                    placeholder="Conte um pouco sobre seu projeto..."
                    className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
                  />
                  {errors.message && (
                    <p className="mt-1 text-xs text-destructive">{errors.message}</p>
                  )}
                </div>

                {sendError && (
                  <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {sendError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 font-semibold text-white shadow-glow transition hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Enviando..." : "Enviar mensagem"}
                </button>
              </form>
            )}
          </div>

          <aside className="space-y-4">
            {[
              {
                icon: MessageCircle,
                t: "WhatsApp",
                v: "(34) 99236-9831",
                href: "https://wa.me/5534992369831",
              },
              {
                icon: Mail,
                t: "E-mail institucional",
                v: "aruanadigital@aruanadigital.com",
                href: "mailto:aruanadigital@aruanadigital.com",
              },
              {
                icon: Mail,
                t: "E-mail alternativo",
                v: "aruanadigital@gmail.com",
                href: "mailto:aruanadigital@gmail.com",
              },
              {
                icon: Instagram,
                t: "Instagram",
                v: "@aruanadigital",
                href: "https://instagram.com/aruanadigital",
              },
              { icon: MapPin, t: "Localização", v: "Iturama / MG" },
              { icon: Clock, t: "Horário", v: "Segunda a Sexta — 08h às 17h" },
            ].map((c) => {
              const Inner = (
                <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-brand-green">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {c.t}
                    </p>
                    <p className="mt-1 font-semibold break-words">{c.v}</p>
                  </div>
                </div>
              );
              return c.href ? (
                <a
                  key={c.t}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {Inner}
                </a>
              ) : (
                <div key={c.t}>{Inner}</div>
              );
            })}
          </aside>
        </div>
      </section>
    </PageLayout>
  );
}
