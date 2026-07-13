import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import heroFish from "@/assets/hero-fish.jpg";
import { getBlogPost } from "@/content/blog-posts";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getBlogPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const post = loaderData;
    const url = `https://aruanadigital.com/blog/${post.slug}`;
    return {
      meta: [
        { title: post.metaTitle },
        { name: "description", content: post.metaDescription },
        { name: "keywords", content: post.keywords },
        { property: "og:title", content: post.metaTitle },
        { property: "og:description", content: post.metaDescription },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:image", content: `https://aruanadigital.com${heroFish}` },
        { property: "article:published_time", content: post.date },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.metaTitle },
        { name: "twitter:image", content: `https://aruanadigital.com${heroFish}` },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.metaDescription,
            image: `https://aruanadigital.com${heroFish}`,
            datePublished: post.date,
            url,
            author: { "@type": "Organization", name: "Aruanã Digital" },
            publisher: {
              "@type": "Organization",
              name: "Aruanã Digital",
              logo: "https://aruanadigital.com/logo512.png",
            },
          }),
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  const related = post.relatedSlugs
    .map((slug) => getBlogPost(slug))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <PageLayout>
      <article className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-green-deep"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o blog
          </Link>

          <div className="mt-6">
            <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-green">
              {post.tag}
            </span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {post.dateLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {post.readTime} de leitura
            </span>
          </div>

          <div className="prose prose-neutral mt-10 max-w-none prose-headings:font-display prose-headings:font-black prose-a:text-brand-green prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-img:rounded-2xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          </div>

          {related.length > 0 && (
            <div className="mt-16 border-t border-border pt-10">
              <h2 className="font-display text-xl font-bold">Artigos relacionados</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    to="/blog/$slug"
                    params={{ slug: r.slug }}
                    className="rounded-2xl border border-border bg-card p-4 text-sm font-semibold transition hover:border-brand-green hover:text-brand-green"
                  >
                    {r.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-16 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-8 text-center">
            <h2 className="font-display text-xl font-bold">Pronto para começar?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Converse com nossa equipe e receba um diagnóstico gratuito para o seu projeto.
            </p>
            <Link
              to="/contato"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:scale-105"
            >
              Solicitar orçamento
            </Link>
          </div>
        </div>
      </article>
    </PageLayout>
  );
}
