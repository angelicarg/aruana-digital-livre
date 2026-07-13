const markdownModules = import.meta.glob("./blog/*.md", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

function getBody(slug: string): string {
  const body = markdownModules[`./blog/${slug}.md`];
  if (!body) throw new Error(`Blog post markdown not found for slug: ${slug}`);
  return body;
}

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  tag: string;
  readTime: string;
  date: string; // ISO (yyyy-mm-dd)
  dateLabel: string; // pt-BR display label
  excerpt: string;
  relatedSlugs: string[];
  body: string;
}

const RAW_POSTS: Omit<BlogPost, "body">[] = [
  {
    slug: "quanto-custa-criar-site",
    title: "Quanto Custa Criar um Site Profissional em 2026?",
    metaTitle: "Quanto Custa um Site em 2026? Preços Reais | Aruanã",
    metaDescription:
      "Descubra quanto custa criar um site profissional em 2026. Preços reais, pacotes e o que está incluso. Guia completo com exemplos da Aruanã Digital.",
    keywords: "quanto custa site, preço criação de sites, valor de site",
    tag: "Criação de Sites",
    readTime: "8 min",
    date: "2026-07-11",
    dateLabel: "11 Jul 2026",
    excerpt:
      "Preços reais de R$1.500 a R$40 mil: entenda o que está incluso em cada faixa e como escolher o pacote certo.",
    relatedSlugs: ["5-erros-ao-criar-site", "como-escolher-agencia-web", "seo-sites-novos"],
  },
  {
    slug: "5-erros-ao-criar-site",
    title: "5 Erros que Empresas Cometem ao Criar um Website",
    metaTitle: "5 Erros ao Criar um Website | Aruanã Digital",
    metaDescription:
      "Descubra os 5 erros mais comuns que empresas cometem ao criar um website. Como evitá-los e não jogar dinheiro fora. Guia prático.",
    keywords: "erros ao criar site, website, como criar site",
    tag: "Criação de Sites",
    readTime: "7 min",
    date: "2026-07-11",
    dateLabel: "11 Jul 2026",
    excerpt:
      "Os erros mais comuns — e mais caros — que empresas cometem ao criar um site, e como evitar cada um deles.",
    relatedSlugs: ["quanto-custa-criar-site", "como-escolher-agencia-web", "seo-sites-novos"],
  },
  {
    slug: "como-escolher-agencia-web",
    title: "Como Escolher uma Agência para Criar um Site",
    metaTitle: "Como Escolher uma Agência Web | Aruanã Digital",
    metaDescription:
      "Como escolher a agência certa para criar seu site? 7 critérios profissionais que evitam desperdício. Guia prático e direto ao ponto.",
    keywords: "como escolher agência web, agência de criação de sites, escolher desenvolvedor",
    tag: "Criação de Sites",
    readTime: "8 min",
    date: "2026-07-11",
    dateLabel: "11 Jul 2026",
    excerpt:
      "7 critérios profissionais para avaliar portfólio, comunicação, preço e tecnologia antes de contratar uma agência.",
    relatedSlugs: ["quanto-custa-criar-site", "5-erros-ao-criar-site", "seo-sites-novos"],
  },
  {
    slug: "seo-sites-novos",
    title: "SEO Para Novos Sites: Guia Prático Sem Jargão Técnico",
    metaTitle: "SEO Para Novos Sites: Guia Prático | Aruanã",
    metaDescription:
      "Guia prático de SEO para novos sites. Aprenda os passos reais que aumentam tráfego do Google. Sem jargão técnico, só resultados práticos.",
    keywords: "SEO para novos sites, como fazer SEO, otimizar site no Google",
    tag: "SEO",
    readTime: "9 min",
    date: "2026-07-12",
    dateLabel: "12 Jul 2026",
    excerpt:
      "Passo a passo prático de SEO para sites novos: pesquisa de palavras-chave, conteúdo, backlinks e monitoramento.",
    relatedSlugs: ["quanto-custa-criar-site", "5-erros-ao-criar-site", "site-vs-landing-vs-ecommerce"],
  },
  {
    slug: "site-vs-landing-vs-ecommerce",
    title: "Site Institucional vs Landing Page vs E-commerce: Qual Sua Empresa Precisa?",
    metaTitle: "Site vs Landing Page vs E-commerce | Aruanã",
    metaDescription:
      "Diferença entre site institucional, landing page e e-commerce. Qual sua empresa precisa? Guia completo com exemplos práticos.",
    keywords: "diferença entre site e landing page, tipos de site, e-commerce",
    tag: "Criação de Sites",
    readTime: "7 min",
    date: "2026-07-12",
    dateLabel: "12 Jul 2026",
    excerpt:
      "Site institucional, landing page ou e-commerce: entenda as diferenças e descubra o que sua empresa realmente precisa.",
    relatedSlugs: ["quanto-custa-criar-site", "seo-sites-novos", "como-ganhar-dinheiro-com-site"],
  },
  {
    slug: "como-ganhar-dinheiro-com-site",
    title: "Como Ganhar Dinheiro com Seu Site: 7 Estratégias Práticas",
    metaTitle: "Como Ganhar Dinheiro com Seu Site | Aruanã",
    metaDescription:
      "Como ganhar dinheiro com seu site? 7 estratégias práticas + exemplos reais. Descubra o ROI real de um site profissional.",
    keywords: "como ganhar dinheiro com site, ROI site, monetizar site",
    tag: "Marketing Digital",
    readTime: "8 min",
    date: "2026-07-13",
    dateLabel: "13 Jul 2026",
    excerpt:
      "7 estratégias reais para gerar receita com um site, do cálculo de ROI aos modelos que mais funcionam.",
    relatedSlugs: ["quanto-custa-criar-site", "seo-sites-novos", "como-escolher-agencia-web"],
  },
];

export const BLOG_POSTS: BlogPost[] = RAW_POSTS.map((post) => ({ ...post, body: getBody(post.slug) }));

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getBlogPostsSorted(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}
