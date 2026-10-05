import { ExternalLink } from "lucide-react";

/** Janela de navegador com a captura real do demo. O link é só para quem usa
 *  mouse: o card já tem o seu link de texto, e repeti-lo aqui para leitor de
 *  tela e teclado seria uma entrada duplicada na lista de links. */
export function CasePreview({ nome, url, print }: { nome: string; url: string; print: string }) {
  const host = new URL(url).host;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={-1}
      aria-hidden="true"
      className="group/preview block overflow-hidden border-b border-border bg-brand-navy-deep"
    >
      <div className="flex items-center gap-3 border-b border-white/10 bg-[#0A2540] px-4 py-2.5">
        <span className="flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <i className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <i className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-black/25 px-3 py-1 font-mono text-[11px] text-white/60">
          {host}
        </span>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={print}
          alt={`Prévia do site de demonstração ${nome}`}
          width={960}
          height={600}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top transition duration-700 group-hover/preview:scale-[1.04]"
        />
        <span className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-brand-navy-deep/70 via-transparent to-transparent p-4 opacity-0 transition group-hover/preview:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-green px-4 py-2 text-xs font-bold text-brand-navy-deep">
            Abrir ao vivo <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </span>
      </div>
    </a>
  );
}
