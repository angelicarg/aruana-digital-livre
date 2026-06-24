import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { AccessibilityBar } from "./AccessibilityBar";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-brand-green focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <AccessibilityBar />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-hero-gradient text-white">
      <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        {eyebrow && (
          <p className="mb-4 inline-block rounded-full border border-brand-green/40 bg-brand-green/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-green">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && <p className="mt-6 max-w-2xl text-lg text-white/80">{subtitle}</p>}
      </div>
    </section>
  );
}
