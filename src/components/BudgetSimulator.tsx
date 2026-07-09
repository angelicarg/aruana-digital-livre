import { useState } from "react";
import { X, ArrowRight, ArrowLeft, MessageCircle } from "lucide-react";
import { submitLead } from "@/lib/api/leads.functions";
import { PACOTES, precoSetup, precoMensal, isPromoActive, PROMO, type PacoteId, type FaixaPreco } from "@/lib/pricing";
import { markSimulatorCompleted } from "@/lib/lead-storage";

const WHATSAPP_NUMBER = "5534992086611";

const TIPOS_NEGOCIO = [
  "Restaurante / Comércio",
  "Clínica / Consultório",
  "Prestador de serviço",
  "Escritório / Profissional liberal",
];

type InteresseAvancado = "nenhum" | "loja" | "loja_ia" | "sob_medida";

const OPCOES_INTERESSE: { value: InteresseAvancado; label: string }[] = [
  { value: "nenhum", label: "Só preciso de um site, sem loja online" },
  { value: "loja", label: "Quero vender produtos ou serviços online (loja virtual)" },
  { value: "loja_ia", label: "Loja virtual + um chatbot com inteligência artificial" },
  { value: "sob_medida", label: "Algo bem específico — múltiplos perfis de acesso ou sistema sob medida" },
];

function matchPacote(interesse: InteresseAvancado, precisaAgendamento: boolean): PacoteId {
  if (interesse === "sob_medida") return "sob_medida";
  if (interesse === "loja" || interesse === "loja_ia") return "avancado";
  if (precisaAgendamento) return "profissional";
  return "essencial";
}

interface FormState {
  tipoNegocio: string;
  precisaAgendamento: boolean | null;
  interesseAvancado: InteresseAvancado | null;
  temSite: boolean | null;
  nome: string;
  whatsapp: string;
  email: string;
}

const INITIAL_FORM: FormState = {
  tipoNegocio: "",
  precisaAgendamento: null,
  interesseAvancado: null,
  temSite: null,
  nome: "",
  whatsapp: "",
  email: "",
};

const TOTAL_STEPS = 5;

export function BudgetSimulator({
  open,
  onClose,
  origem,
}: {
  open: boolean;
  onClose: () => void;
  origem: "banner" | "simulador";
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [outroNegocio, setOutroNegocio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  function reset() {
    setStep(0);
    setForm(INITIAL_FORM);
    setOutroNegocio("");
    setSaved(false);
  }

  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  const pacoteId =
    form.interesseAvancado !== null && form.precisaAgendamento !== null
      ? matchPacote(form.interesseAvancado, form.precisaAgendamento)
      : null;
  const pacote = pacoteId ? PACOTES[pacoteId] : null;

  async function goToResult() {
    setStep(TOTAL_STEPS);
    markSimulatorCompleted();
    if (saving || saved || !pacoteId) return;
    setSaving(true);
    try {
      const result = await submitLead({
        data: {
          nome: form.nome.trim(),
          whatsapp: form.whatsapp.trim(),
          email: form.email.trim() || null,
          tipoNegocio: form.tipoNegocio,
          precisaAgendamento: form.precisaAgendamento!,
          interesseAvancado: form.interesseAvancado!,
          temSite: form.temSite,
          pacoteSugerido: pacoteId,
          origem,
        },
      });
      setSaved(result.saved);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  function whatsappUrl() {
    if (!pacote) return `https://wa.me/${WHATSAPP_NUMBER}`;
    const setup = precoSetup(pacote);
    const mensal = precoMensal(pacote);
    const linhas = [
      "Olá! Fiz o simulador de orçamento no site da Aruanã Digital.",
      "",
      `Nome: ${form.nome}`,
      ...(form.email.trim() ? [`E-mail: ${form.email.trim()}`] : []),
      `Negócio: ${form.tipoNegocio}`,
      `Pacote sugerido: ${pacote.nome}`,
      `Implantação: ${setup.comDesconto ? `${setup.comDesconto} (de ${setup.original})` : setup.original}`,
      `Mensalidade: ${mensal.comDesconto ? `${mensal.comDesconto} (de ${mensal.original})` : mensal.original}`,
      "",
      "Gostaria de saber mais!",
    ];
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(linhas.join("\n"))}`;
  }

  const canStep0 = form.tipoNegocio.trim().length > 0;
  const canStep3 = form.nome.trim().length > 0 && form.whatsapp.trim().length >= 8;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Simulador de orçamento"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-card shadow-premium">
        <button
          onClick={handleClose}
          aria-label="Fechar simulador"
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-y-auto p-6 sm:p-8">
          {step < TOTAL_STEPS && (
            <div className="mb-6 flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-brand-green" : "bg-muted"}`}
                />
              ))}
            </div>
          )}

          {step === 0 && (
            <div>
              <h3 className="font-display text-xl font-bold">Qual é o seu negócio?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Vamos te dar uma estimativa personalizada em 1 minuto.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                {TIPOS_NEGOCIO.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setForm((f) => ({ ...f, tipoNegocio: t }));
                      setOutroNegocio("");
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      form.tipoNegocio === t
                        ? "border-brand-green bg-brand-green/10 text-brand-green-deep"
                        : "border-border hover:border-brand-green/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Outro — descreva seu negócio"
                  value={outroNegocio}
                  onChange={(e) => {
                    setOutroNegocio(e.target.value);
                    setForm((f) => ({ ...f, tipoNegocio: e.target.value }));
                  }}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-green"
                />
              </div>
              <button
                disabled={!canStep0}
                onClick={() => setStep(1)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <BackButton onClick={() => setStep(0)} />
              <h3 className="font-display text-xl font-bold">Precisa de agendamento online?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ou cadastro/histórico de clientes.
              </p>
              <div className="mt-6 flex gap-3">
                {[
                  { value: true, label: "Sim" },
                  { value: false, label: "Não" },
                ].map((o) => (
                  <button
                    key={String(o.value)}
                    onClick={() => {
                      setForm((f) => ({ ...f, precisaAgendamento: o.value }));
                      setStep(2);
                    }}
                    className={`flex-1 rounded-xl border px-4 py-4 text-sm font-semibold transition ${
                      form.precisaAgendamento === o.value
                        ? "border-brand-green bg-brand-green/10 text-brand-green-deep"
                        : "border-border hover:border-brand-green/50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <BackButton onClick={() => setStep(1)} />
              <h3 className="font-display text-xl font-bold">O que mais você precisa?</h3>
              <div className="mt-6 flex flex-col gap-2">
                {OPCOES_INTERESSE.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => {
                      setForm((f) => ({ ...f, interesseAvancado: o.value }));
                      setStep(3);
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      form.interesseAvancado === o.value
                        ? "border-brand-green bg-brand-green/10 text-brand-green-deep"
                        : "border-border hover:border-brand-green/50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <BackButton onClick={() => setStep(2)} />
              <h3 className="font-display text-xl font-bold">Já tem um site hoje?</h3>
              <p className="mt-1 text-sm text-muted-foreground">Opcional — nos ajuda a entender o ponto de partida.</p>
              <div className="mt-6 flex gap-3">
                {[
                  { value: true, label: "Sim" },
                  { value: false, label: "Não" },
                ].map((o) => (
                  <button
                    key={String(o.value)}
                    onClick={() => {
                      setForm((f) => ({ ...f, temSite: o.value }));
                      setStep(4);
                    }}
                    className={`flex-1 rounded-xl border px-4 py-4 text-sm font-semibold transition ${
                      form.temSite === o.value
                        ? "border-brand-green bg-brand-green/10 text-brand-green-deep"
                        : "border-border hover:border-brand-green/50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(4)}
                className="mt-4 w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Pular esta pergunta
              </button>
            </div>
          )}

          {step === 4 && (
            <div>
              <BackButton onClick={() => setStep(3)} />
              <h3 className="font-display text-xl font-bold">Seus dados de contato</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Só usamos isso para te enviar a estimativa pelo WhatsApp.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nome</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Seu nome"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-green"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">WhatsApp</label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="(34) 90000-0000"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-green"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    E-mail <span className="font-normal text-muted-foreground">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-green"
                  />
                </div>
              </div>
              <button
                disabled={!canStep3}
                onClick={goToResult}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ver minha estimativa <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === TOTAL_STEPS && pacote && (
            <div className="text-center">
              <div className="mb-2 text-4xl">🎉</div>
              <h3 className="font-display text-xl font-bold">
                Pacote {pacote.nome} é o ideal pra você
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{pacote.descricao}</p>

              <div className="mt-6 rounded-2xl border border-border bg-muted p-5 text-left">
                <Row label="Implantação" preco={precoSetup(pacote)} highlight />
                <Row label="Mensalidade" preco={precoMensal(pacote)} />
                {isPromoActive() && pacote.setupMax !== null && (
                  <p className="mt-3 text-xs font-medium text-brand-green-deep">
                    ✨ Condição de lançamento: {PROMO.setupDiscountPct}% off na implantação e{" "}
                    {PROMO.monthlyDiscountPct}% off nos primeiros {PROMO.monthlyDiscountMonths} meses.
                  </p>
                )}
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                {form.nome}, entraremos em contato pelo <strong>{form.whatsapp}</strong> em breve.
              </p>

              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-glow transition hover:scale-[1.02]"
                style={{ background: "#25D366" }}
              >
                <MessageCircle className="h-4 w-4" /> Continuar no WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-3 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Voltar
    </button>
  );
}

function Row({ label, preco, highlight }: { label: string; preco: FaixaPreco; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        {preco.comDesconto && (
          <span className="text-xs text-muted-foreground line-through">{preco.original}</span>
        )}
        <span className={`text-sm font-bold ${highlight ? "text-brand-green-deep" : "text-foreground"}`}>
          {preco.comDesconto ?? preco.original}
        </span>
      </span>
    </div>
  );
}
