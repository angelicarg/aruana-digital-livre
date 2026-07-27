import logoSrc from "@/assets/aruana-logo.png";

// O símbolo é sempre o arquivo master (nunca regenerado por IA — ver BRAND.md).
// O nome fica em texto real: acessível, indexável e legível em qualquer tamanho.
// Todos os usos atuais ficam sobre fundo escuro (header/footers navy).
interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { img: "h-9", name: "text-base", tag: "text-[9px]" },
  md: { img: "h-11 sm:h-12", name: "text-lg sm:text-xl", tag: "text-[10px]" },
  lg: { img: "h-16 sm:h-20", name: "text-2xl", tag: "text-xs" },
} as const;

export function AruanaLogo({ className = "", size = "md" }: Props) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={logoSrc}
        alt=""
        aria-hidden="true"
        className={`${s.img} w-auto object-contain`}
        loading="eager"
        decoding="async"
      />
      <span className="flex flex-col gap-1 leading-none">
        <span className={`font-display font-black tracking-tight text-white ${s.name}`}>
          Aruanã
        </span>
        <span className={`font-semibold uppercase tracking-[0.3em] text-brand-green ${s.tag}`}>
          Digital
        </span>
      </span>
    </span>
  );
}
