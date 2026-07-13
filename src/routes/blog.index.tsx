import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, PageHero } from "@/components/PageLayout";
import { Calendar, Clock } from "lucide-react";
import heroFish from "@/assets/hero-fish.jpg";
import { getBlogPostsSorted } from "@/content/blog-posts";

const POSTS = getBlogPostsSorted();

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog: Criação de Sites, SEO, IA e Acessibilidade | Aruanã" },
      {
        name: "description",
        content:
          "Conteúdos sobre criação de sites, SEO, IA e acessibilidade digital. Estratégias práticas de marketing para empresas que querem crescer online. Leia os artigos.",
      },
      {
        name: "keywords",
        content:
          "blog Aruanã Digital, SEO para sites institucionais, IA para empresas, acessibilidade digital, VLibras, WCAG",
      },
      { property: "og:title", content: "Blog: Criação de Sites, SEO, IA e Acessibilidade | Aruanã" },
      {
        property: "og:description",
        content:
          "Conteúdos sobre criação de sites, SEO, IA e acessibilidade digital para empresas que querem crescer online.",
      },
      { property: "og:url", content: "https://aruanadigital.com/blog" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://aruanadigital.com${heroFish}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://aruanadigital.com${heroFish}` },
    ],
    links: [{ rel: "canonical", href: "https://aruanadigital.com/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Blog Aruanã Digital",
          description: "Conteúdos sobre criação de sites, SEO, IA e acessibilidade digital.",
          url: "https://aruanadigital.com/blog",
          publisher: {
            "@type": "Organization",
            name: "Aruanã Digital",
            logo: "https://aruanadigital.com/logo512.png",
          },
          blogPost: POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.excerpt,
            datePublished: p.date,
            url: `https://aruanadigital.com/blog/${p.slug}`,
          })),
        }),
      },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <PageLayout>
      <PageHero
        eyebrow="Blog"
        title="Ideias que conectam tecnologia, educação e propósito."
        subtitle="Conteúdos práticos sobre criação de sites, SEO e transformação digital."
      />

      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((p) => (
              <Link
                key={p.slug}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-premium"
              >
                <div className="aspect-video bg-hero-gradient relative overflow-hidden">
                  <div className="absolute inset-0 grid-pattern opacity-30" />
                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-full bg-brand-green px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                      {p.tag}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {p.dateLabel}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {p.readTime}
                    </span>
                  </p>
                  <h2 className="mt-3 font-display text-lg font-bold leading-snug transition group-hover:text-brand-green">
                    {p.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
