import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, MessageCircle } from "lucide-react";
import { AruanaLogo } from "./AruanaLogo";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/servicos", label: "Serviços" },
  { to: "/sobre", label: "Sobre" },
  { to: "/cases", label: "Cases" },
  { to: "/blog", label: "Blog" },
  { to: "/contato", label: "Contato" },
];

const WHATSAPP =
  "https://wa.me/5534992086611?text=Ol%C3%A1%2C+quero+falar+com+um+especialista+da+Aruan%C3%A3+Digital.";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-navy-deep/90 backdrop-blur-lg">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Aruanã Digital — Início" className="flex items-center">
          <AruanaLogo size="md" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white"
              activeProps={{ className: "text-brand-green font-semibold" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:scale-105"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com Especialista
          </a>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="grid h-11 w-11 place-items-center rounded-lg text-white lg:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav
          className="border-t border-white/10 bg-brand-navy-deep px-4 py-4 lg:hidden"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-white/90 hover:bg-white/10"
                activeProps={{ className: "bg-white/10 text-brand-green" }}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-5 py-3 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Falar com Especialista
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
