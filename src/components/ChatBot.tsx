import { useState, useEffect, useRef } from "react";
import mascotAru from "#/assets/mascot-face.png";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é a Ara, assistente virtual da Aruanã Digital — uma agência especializada em presença digital e soluções com inteligência artificial para pequenos negócios.

SOBRE A ARUANÃ DIGITAL:
- Agência focada em transformar pequenos negócios com tecnologia acessível
- Especialidade: sites profissionais, landing pages, chatbots com IA e automações
- Diferenciais: entrega rápida, preço justo, suporte próximo e personalizado
- Cada projeto é único — não usamos templates genéricos
- Atendemos negócios de todos os segmentos: clínicas, restaurantes, prestadores de serviço, comércios, profissionais liberais e muito mais

SERVIÇOS OFERECIDOS:
1. **Sites e Landing Pages** — Sites modernos, responsivos e otimizados para conversão. Do design à publicação.
2. **Chatbots com IA** — Atendimento automático inteligente 24h. O bot aprende sobre o negócio e responde como um atendente humano.
3. **Chatbots de Fluxo Guiado** — Atendimento estruturado com menus e opções, ideal para triagem e agendamentos. Inclui transferência para WhatsApp.
4. **Agendamento Online** — Sistema de agenda integrado ao site, com seleção de profissional, data e horário.
5. **Automações** — Integrações com WhatsApp, e-mail e sistemas para automatizar processos do negócio.
6. **Consultoria Digital** — Diagnóstico da presença digital e plano de ação personalizado.

PORTFÓLIO DE DEMONSTRAÇÃO:
- **Clínica Dente Vivo** — Site completo com agendamento por dentista e chatbot de atendimento
- **Carlos Pinto Pintor** — Landing page com sistema de orçamento online automático
- **Forno 81 Pizzaria** — Site com cardápio interativo, carrinho e chatbot com IA

PROCESSO DE TRABALHO:
1. Conversa inicial para entender o negócio e objetivos
2. Proposta personalizada com escopo e valor
3. Desenvolvimento e aprovações em etapas
4. Publicação e treinamento do cliente
5. Suporte contínuo após entrega

FORMAS DE CONTATO:
- WhatsApp: (62) 99999-0000
- E-mail: contato@aruanadigital.com.br
- Site: aruanadigital.com.br

INSTRUÇÕES DE COMPORTAMENTO:
- Responda SEMPRE em português brasileiro
- Seja consultiva, inteligente e direta — fale como especialista em negócios digitais, não como robô
- Respostas objetivas — máximo 3 parágrafos curtos
- Use markdown simples (negrito com **) para destacar pontos importantes
- Se o cliente demonstrar interesse em algum serviço, incentive-o a entrar em contato pelo WhatsApp para uma conversa sem compromisso
- Se não souber algo específico sobre a empresa, seja honesta e passe o contato do WhatsApp
- Nunca invente preços específicos — diga que os valores são personalizados e oriente a entrar em contato
- Quando mencionar o WhatsApp, use sempre: (62) 99999-0000`;

// ─── QUICK REPLIES ────────────────────────────────────────────────────────────

const QUICK_REPLIES = [
  "O que é a Aruanã Digital? 🌐",
  "Quais serviços vocês oferecem? 💡",
  "Quanto custa um site? 💰",
  "Ver portfólio de projetos 🗂️",
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou a **Ara**, assistente da Aruanã Digital 👋\n\nPosso te ajudar a entender como transformamos pequenos negócios com sites profissionais, chatbots e automações. O que você gostaria de saber?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(1);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        80
      );
    }
  }, [messages, open]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");
    setShowQuick(false);

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const reply =
        data.content?.[0]?.text ??
        "Ops, tive um problema aqui! Me chama no WhatsApp: (62) 99999-0000 😊";

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Algo deu errado na conexão. Me chama no WhatsApp: **(62) 99999-0000** e te atendo na hora! 😊",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function renderContent(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <>
      {/* ── BUBBLE ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar chat" : "Abrir chat com Ara"}
        className="fixed bottom-20 right-6 z-50 w-16 h-16 rounded-full border-0 cursor-pointer flex items-center justify-center shadow-glow transition-transform duration-200 hover:scale-105 active:scale-95 overflow-hidden"
        style={{ background: "var(--gradient-brand)" }}
      >
        {open ? (
          <span className="text-2xl select-none text-white font-bold">✕</span>
        ) : (
          <img
            src={mascotAru}
            alt="Ara"
            className="w-16 h-16 object-cover"
          />
        )}
        {!open && unread > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: "var(--brand-navy-deep)",
              color: "var(--brand-green)",
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {/* ── PANEL ── */}
      {open && (
        <div
          className="fixed bottom-40 right-6 z-40 flex flex-col rounded-2xl overflow-hidden shadow-premium border border-border"
          style={{
            width: "min(380px, calc(100vw - 24px))",
            maxHeight: "70vh",
            background: "var(--color-background)",
            animation: "fade-up 0.25s ease both",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: "var(--gradient-hero)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
              style={{ background: "white" }}
            >
              <img
                src={mascotAru}
                alt="Ara"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white font-display">
                Ara
              </div>
              <div className="text-xs" style={{ color: "oklch(0.85 0.08 156)" }}>
                Assistente · Aruanã Digital
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--brand-green)",
                  boxShadow: "0 0 6px var(--brand-green)",
                }}
              />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                online
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isUser && (
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden"
                      style={{ background: "white" }}
                    >
                      <img
                        src={mascotAru}
                        alt="Ara"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div
                    className="max-w-[80%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                    style={
                      isUser
                        ? {
                            background: "var(--gradient-brand)",
                            color: "white",
                            borderRadius: "16px 4px 16px 16px",
                          }
                        : {
                            background: "var(--color-muted)",
                            color: "var(--color-foreground)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "4px 16px 16px 16px",
                          }
                    }
                  >
                    {renderContent(msg.content)}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-end gap-2">
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden"
                  style={{ background: "white" }}
                >
                  <img src={mascotAru} alt="Ara" className="w-full h-full object-cover" />
                </div>
                <div
                  className="px-4 py-3 flex gap-1 items-center"
                  style={{
                    background: "var(--color-muted)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px 16px 16px 16px",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "var(--brand-green)",
                        animation: `pulse-glow 1s ${i * 0.2}s ease-in-out infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick replies */}
            {showQuick && messages.length <= 1 && (
              <div className="flex flex-col gap-2 mt-1">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-xs font-medium px-3 py-2 rounded-xl border cursor-pointer transition-all duration-150 hover:border-[--brand-green] hover:text-[--brand-green]"
                    style={{
                      background: "var(--color-muted)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="flex gap-2 items-end p-3 flex-shrink-0 border-t border-border"
            style={{ background: "var(--color-background)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[--brand-green] transition-colors"
              style={{ maxHeight: 96, overflowY: "auto" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-0 cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                background:
                  input.trim() && !loading
                    ? "var(--gradient-brand)"
                    : "var(--color-muted)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={input.trim() && !loading ? "white" : "var(--muted-foreground)"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-3 py-2 flex-shrink-0"
            style={{
              background: "var(--color-muted)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Aruanã Digital · IA assistente
            </span>
            <a
              href="https://wa.me/5562999990000"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold px-2 py-1 rounded-md transition-opacity hover:opacity-80"
              style={{ background: "#25D366", color: "white" }}
            >
              📱 WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}