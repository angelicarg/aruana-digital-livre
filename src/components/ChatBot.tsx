import { useState, useEffect, useRef } from "react";
import mascotAru from "#/assets/mascot-face.png";
import { sendChatMessage } from "#/lib/api/chat.functions";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const FALLBACK_MESSAGES = {
  rate_limited:
    "Estou com muitas conversas ao mesmo tempo agora! Me chama direto no WhatsApp: **(34) 99236-9831** que te atendo na hora 😊",
  unavailable:
    "Ops, tive um problema aqui! Me chama no WhatsApp: **(34) 99236-9831** 😊",
} as const;

// ─── WHATSAPP HANDOFF ─────────────────────────────────────────────────────────
// Builds a wa.me link with the conversation so far pre-filled, so whoever
// picks it up on WhatsApp already has context instead of a blank chat.

const WHATSAPP_NUMBER = "5534992369831";
const HANDOFF_MAX_MESSAGES = 6;
const HANDOFF_MAX_LENGTH = 1500;

function buildWhatsAppHandoffUrl(messages: Message[]) {
  const transcript = messages
    .filter((m) => m.id !== "welcome")
    .slice(-HANDOFF_MAX_MESSAGES)
    .map((m) => `${m.role === "user" ? "Cliente" : "Aru"}: ${m.content.replace(/\*\*/g, "*")}`)
    .join("\n");

  const body = transcript
    ? `Olá! Vim do chat do site e conversei com a Aru:\n\n${transcript}\n\nGostaria de continuar por aqui.`
    : "Olá! Vim do chat do site da Aruanã Digital.";

  const trimmed =
    body.length > HANDOFF_MAX_LENGTH ? `${body.slice(0, HANDOFF_MAX_LENGTH)}…` : body;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(trimmed)}`;
}

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
        "Olá! Sou a **Aru**, assistente da Aruanã Digital 👋\n\nPosso te ajudar a entender como transformamos pequenos negócios com sites profissionais, chatbots e automações. O que você gostaria de saber?",
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
      const result = await sendChatMessage({
        data: {
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      const reply = result.reply ?? FALLBACK_MESSAGES[result.error ?? "unavailable"];

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
            "Algo deu errado na conexão. Me chama no WhatsApp: **(34) 99236-9831** e te atendo na hora! 😊",
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
        aria-label={open ? "Fechar chat" : "Abrir chat com Aru"}
        className="fixed bottom-[var(--fab-tier-2)] right-[var(--fab-edge-gap)] z-[var(--fab-z)] w-[var(--fab-size)] h-[var(--fab-size)] rounded-full border-0 cursor-pointer flex items-center justify-center bg-brand-gradient shadow-glow transition-transform duration-200 hover:scale-105 active:scale-95 overflow-hidden"
      >
        {open ? (
          <span className="text-2xl select-none text-white font-bold">✕</span>
        ) : (
          <img
            src={mascotAru}
            alt="Aru"
            className="w-full h-full object-cover"
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
          className="fixed bottom-[var(--fab-tier-3)] right-[var(--fab-edge-gap)] z-[var(--fab-z)] flex flex-col rounded-2xl overflow-hidden shadow-premium border border-border"
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
                alt="Aru"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white font-display">
                Aru
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
                        alt="Aru"
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
                  <img src={mascotAru} alt="Aru" className="w-full h-full object-cover" />
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
              href={buildWhatsAppHandoffUrl(messages)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold px-2 py-1 rounded-md transition-opacity hover:opacity-80"
              style={{ background: "#25D366", color: "white" }}
            >
              📱 Falar com atendente
            </a>
          </div>
        </div>
      )}
    </>
  );
}