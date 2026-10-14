import { useState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { submitLead } from "@/lib/api/leads.functions";

// Lista de espera da Toca da Madalena. Reaproveita `leads` com origem própria; o aceite é
// obrigatório porque o único uso da inscrição é avisar sobre a Toca (LGPD).
// `layout` só muda a disposição: coluna (padrão), duas (nome e WhatsApp lado a lado), linha ou
// compacta (dois campos por linha e o botão ao lado do e-mail, para caber numa tela só).
export function ListaEsperaToca({
  layout = "coluna",
  rotuloBotao = "Entrar na lista de espera",
}: {
  layout?: "coluna" | "duas" | "linha" | "compacta";
  rotuloBotao?: string;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [aceita, setAceita] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estado, setEstado] = useState<"form" | "ok" | "erro">("form");

  const pronto =
    nome.trim().length > 0 && email.includes("@") && whatsapp.length >= 10 && aceita && !loading;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!pronto) return;
    setLoading(true);
    trackEvent("form_submit", { form_type: "lista_espera_toca" });
    try {
      const r = await submitLead({
        data: {
          nome: nome.trim(),
          email: email.trim(),
          whatsapp,
          tipoNegocio: "Lista de espera da Toca da Madalena",
          precisaAgendamento: null,
          interesseAvancado: null,
          temSite: null,
          pacoteSugerido: null,
          origem: "toca_lista_espera",
          aceitaNovidades: true,
        },
      });
      setEstado(r.saved ? "ok" : "erro");
    } catch {
      setEstado("erro");
    } finally {
      setLoading(false);
    }
  }

  if (estado === "ok") {
    return (
      <div role="status" className="py-4 text-center text-brand-navy-deep">
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand-green-text" aria-hidden="true" />
        <h3 className="mt-3 font-display text-xl font-bold">Anotado, {nome.trim()}.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pronto. Quando houver novidade, o Aru te avisa.
        </p>
      </div>
    );
  }

  const campo =
    "w-full rounded-xl border border-[#E1E6EC] bg-white px-4 py-2.5 text-brand-navy-deep outline-none placeholder:text-[#6B7684] focus-visible:ring-2 focus-visible:ring-brand-green";
  const rotulo = "text-sm font-semibold text-brand-navy-deep";

  const fNome = (
    <div key="nome">
      <label htmlFor="toca-nome" className={rotulo}>Seu nome</label>
      <input id="toca-nome" name="nome" autoComplete="name" className={`${campo} mt-1`}
        value={nome} onChange={(e) => setNome(e.target.value)} />
    </div>
  );
  const fEmail = (
    <div key="email" className={layout === "duas" ? "sm:col-span-2" : undefined}>
      <label htmlFor="toca-email" className={rotulo}>Seu e-mail</label>
      <input id="toca-email" name="email" type="email" autoComplete="email" className={`${campo} mt-1`}
        value={email} onChange={(e) => setEmail(e.target.value)} />
    </div>
  );
  const fWhats = (
    <div key="whats">
      <label htmlFor="toca-whatsapp" className={rotulo}>Seu WhatsApp</label>
      <input id="toca-whatsapp" name="whatsapp" type="tel" inputMode="numeric" autoComplete="tel"
        placeholder="(34) 99999-9999" className={`${campo} mt-1`} value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 11))} />
    </div>
  );

  const botao = (
    <button type="submit" disabled={!pronto}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-6 py-3.5 font-bold text-brand-navy-deep shadow-card transition enabled:hover:-translate-y-0.5 disabled:opacity-50">
      <BellRing className="h-5 w-5" aria-hidden="true" />
      {loading ? "Enviando..." : rotuloBotao}
    </button>
  );

  const aceite = (
    <label htmlFor="toca-aceite" className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-[#4B5768]">
      <input id="toca-aceite" type="checkbox" checked={aceita} onChange={(e) => setAceita(e.target.checked)}
        className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-brand-green" />
      <span>
        Quero receber avisos sobre a Toca da Madalena por e-mail e WhatsApp. Posso sair da lista
        quando quiser.
      </span>
    </label>
  );

  const menores = (
    <p className="text-xs text-[#5B6675]">
      Menor de 18 anos? Peça para um responsável fazer o cadastro com o e-mail dele.
    </p>
  );

  const erro = estado === "erro" && (
    <p role="alert" className="text-sm font-semibold text-destructive">
      Não consegui registrar agora. Tente de novo em instantes.
    </p>
  );

  if (layout === "linha") {
    return (
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          {fNome}{fEmail}{fWhats}
          <div className="md:w-56">{botao}</div>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-1">{aceite}{menores}</div>
        </div>
        {erro}
      </form>
    );
  }

  if (layout === "compacta") {
    return (
      <form onSubmit={enviar} className="space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2 sm:items-end">
          {fNome}{fWhats}{fEmail}<div>{botao}</div>
        </div>
        {aceite}
        {erro}
        {menores}
      </form>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      {layout === "duas" ? (
        <div className="grid gap-3 sm:grid-cols-2">{fNome}{fWhats}{fEmail}</div>
      ) : (
        <div className="space-y-4">{fNome}{fEmail}{fWhats}</div>
      )}
      {aceite}
      {erro}
      {botao}
      {menores}
    </form>
  );
}
