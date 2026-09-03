import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft, Box, Rotate3d, ShieldCheck } from "lucide-react";

// O visualizador carrega three.js e o modelo. Fora do bundle das outras rotas.
const Visualizador3D = lazy(() =>
  import("@/components/Visualizador3D").then((m) => ({ default: m.Visualizador3D })),
);

export const Route = createFileRoute("/experiencias/produto-3d")({
  head: () => ({
    meta: [
      { title: "Visualizador de produto 3D — Aruanã Digital" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProdutoTresDPage,
});

function ProdutoTresDPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green-text hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </a>

        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-brand-green-text">
          Protótipo interno
        </p>
        <h1 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">
          Visualizador de Produto 3D
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          O mesmo componente aceita qualquer arquivo <code className="text-foreground">.glb</code> —
          de banco gratuito, comprado, feito no Spline ou reconstruído por fotogrametria a partir do
          produto real do cliente. Trocar a peça é trocar um arquivo.
        </p>

        <Suspense
          fallback={
            <div className="mt-10 grid h-[420px] place-items-center rounded-3xl bg-brand-navy-deep text-sm text-white/60">
              Carregando o visualizador…
            </div>
          }
        >
          <Visualizador3D
            modelo="/modelos/camera-cc0.glb"
            descricao="Câmera fotográfica analógica vista em três dimensões, com corpo escuro texturizado, lente cilíndrica frontal e alça lateral. O objeto gira sozinho e pode ser girado e aproximado pelo visitante."
            className="mt-10 h-[420px] sm:h-[520px]"
          />
        </Suspense>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Box,
              titulo: "816 KB, arquivo único",
              texto:
                "O original tinha 2,44 MB em 11 arquivos. Texturas em WebP e geometria em Draco, com o decodificador servido do próprio domínio.",
            },
            {
              icon: Rotate3d,
              titulo: "Carrega só aqui",
              texto:
                "O three.js e o modelo ficam num chunk próprio. Nenhuma outra página do site paga por esta.",
            },
            {
              icon: ShieldCheck,
              titulo: "Licença verificada",
              texto:
                "Modelo CC0 do Poly Haven: uso comercial livre, sem exigir crédito. No Sketchfab a licença varia por modelo — há muito CC-BY-NC, que proíbe uso comercial.",
            },
          ].map((c) => (
            <div key={c.titulo} className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-cloud text-brand-green-deep">
                <c.icon className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold">{c.titulo}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.texto}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
