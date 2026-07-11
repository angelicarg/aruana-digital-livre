import { Link } from "@tanstack/react-router";
import { Mail, MessageCircle, MapPin, Instagram, Linkedin, Clock, Shield, Lock } from "lucide-react";
import { AruanaLogo } from "./AruanaLogo";

export function SiteFooter() {
  return (
    <footer className="bg-brand-navy-deep text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <AruanaLogo size="lg" />
          <p className="mt-6 max-w-md text-sm leading-relaxed">
            Transformando tecnologia em crescimento, inclusão e resultados. Desenvolvemos
            ecossistemas digitais acessíveis para empresas e instituições.
          </p>

          <div className="mt-6 flex gap-3">
            <a
              href="https://instagram.com/aruanadigital"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/5 transition hover:bg-brand-green hover:text-white"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://www.linkedin.com/in/aruan%C3%A3-digital-956442421/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/5 transition hover:bg-brand-green hover:text-white"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a
              href="https://wa.me/5534992086611"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/5 transition hover:bg-brand-green hover:text-white"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
            <a
              href="mailto:aruanadigital@aruanadigital.com"
              aria-label="E-mail"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/5 transition hover:bg-brand-green hover:text-white"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Navegação</h3>
          <ul className="space-y-2 text-sm">
            {[
              ["/", "Início"],
              ["/servicos", "Serviços"],
              ["/sobre", "Sobre"],
              ["/cases", "Cases"],
              ["/blog", "Blog"],
              ["/contato", "Contato"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="transition hover:text-brand-green">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Contato</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 shrink-0 text-brand-green mt-0.5" /> (34) 99208-6611
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 shrink-0 text-brand-green mt-0.5" /> aruanadigital@aruanadigital.com
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand-green mt-0.5" /> Uberlândia / MG
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 text-brand-green mt-0.5" /> Seg–Sex · 08h às 17h
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/privacidade" className="transition hover:text-brand-green">
                Política de Privacidade
              </Link>
            </li>
            <li className="flex items-start gap-2 pt-1 text-white/60">
              <Shield className="h-4 w-4 shrink-0 text-brand-green mt-0.5" />
              <span>Em conformidade com a Lei nº 13.709/2018 (LGPD)</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-white/60 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Aruanã Digital. Todos os direitos reservados.</p>
          <p>CNPJ 67.876.737/0001-43</p>
          <p>Tecnologia • Educação • Resultados</p>
          <Link to="/intranet" className="flex items-center gap-1.5 transition hover:text-brand-green">
            <Lock className="h-3.5 w-3.5" />
            Acesso da equipe
          </Link>
        </div>
      </div>
    </footer>
  );
}
