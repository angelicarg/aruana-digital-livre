import { useState } from "react";
import { Mail, MessageCircle, User, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { submitLead } from "@/lib/api/leads.functions";

export function LeadCaptureForm() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.telefone) return;

    setLoading(true);
    trackEvent("form_submit", {
      form_type: "lead_capture_home",
      nome: formData.nome,
    });

    try {
      await submitLead({
        data: {
          nome: formData.nome.trim(),
          email: formData.email.trim(),
          whatsapp: formData.telefone.trim(),
          tipoNegocio: "Não especificado",
          precisaAgendamento: false,
          interesseAvancado: "nenhum",
          temSite: null,
          pacoteSugerido: "essencial",
          origem: "home_lead_form",
        },
      });
      setSubmitted(true);
      setTimeout(() => {
        setFormData({ nome: "", email: "", telefone: "" });
        setStep(0);
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Lead submission failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return formData.nome.trim().length > 0;
    if (step === 1) return formData.email.trim().includes("@");
    if (step === 2) return formData.telefone.trim().length >= 10;
    return false;
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-green/10">
            <MessageCircle className="h-8 w-8 text-brand-green" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-foreground">Obrigado, {formData.nome}!</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Você receberá uma mensagem no WhatsApp em breve
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {step === 0 && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Como você se chama?</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Seu nome"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              onFocus={() => trackEvent("form_field_focus", { field: "nome" })}
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Seu e-mail</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <input
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onFocus={() => trackEvent("form_field_focus", { field: "email" })}
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Seu WhatsApp</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <input
              type="tel"
              placeholder="(34) 99208-6611"
              value={formData.telefone}
              onChange={(e) => handleChange("telefone", e.target.value.replace(/\D/g, "").slice(0, 11))}
              onFocus={() => trackEvent("form_field_focus", { field: "telefone" })}
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex-1 rounded-full border border-border bg-muted px-4 py-3 font-semibold text-foreground transition hover:bg-muted/80"
          >
            Voltar
          </button>
        )}
        {step < 2 && (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-3 font-semibold text-white shadow-glow transition disabled:opacity-50 hover:scale-105 disabled:hover:scale-100"
          >
            Próximo <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {step === 2 && (
          <button
            type="submit"
            disabled={!canNext() || loading}
            className="flex-1 rounded-full bg-brand-gradient px-4 py-3 font-semibold text-white shadow-glow transition disabled:opacity-50 hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? "Enviando..." : "Receber Diagnóstico"}
          </button>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {step === 0 && "Começamos por aqui"}
        {step === 1 && "Para contato por e-mail"}
        {step === 2 && "Preferimos WhatsApp 😊"}
      </p>
    </form>
  );
}
