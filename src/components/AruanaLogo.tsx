import logoSrc from "@/assets/aruana-logo.webp";

// O símbolo é sempre o arquivo master (nunca regenerado por IA — ver BRAND.md).
// O nome fica em texto real: acessível, indexável e legível em qualquer tamanho.
// Todos os usos atuais ficam sobre fundo escuro (header/footers navy).
interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

// O halo é mais intenso nos tamanhos pequenos (header), onde o símbolo tem menos
// área para se destacar; no lg (footer) a versão suave já basta.
const SIZES = {
  sm: {
    img: "h-9",
    name: "text-base",
    tag: "text-[9px]",
    halo: "bg-[radial-gradient(circle_at_center,rgba(127,211,190,0.60)_0%,rgba(127,211,190,0.24)_45%,transparent_72%)]",
  },
  md: {
    img: "h-11 sm:h-12",
    name: "text-lg sm:text-xl",
    tag: "text-[10px]",
    halo: "bg-[radial-gradient(circle_at_center,rgba(127,211,190,0.60)_0%,rgba(127,211,190,0.24)_45%,transparent_72%)]",
  },
  lg: {
    img: "h-16 sm:h-20",
    name: "text-2xl",
    tag: "text-xs",
    halo: "bg-[radial-gradient(circle_at_center,rgba(127,211,190,0.38)_0%,rgba(127,211,190,0.14)_45%,transparent_72%)]",
  },
} as const;

export function AruanaLogo({ className = "", size = "md" }: Props) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative inline-flex">
        {/* Halo radial discreto atrás do símbolo: o corpo do peixe é azul-marinho
            e some sobre os fundos navy do header/footer sem este contraste. */}
        <span
          aria-hidden="true"
          className={`absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full ${s.halo}`}
        />
        <img
          src={logoSrc}
          alt=""
          aria-hidden="true"
          className={`${s.img} relative w-auto object-contain`}
          width={289}
          height={256}
          loading="eager"
          decoding="async"
        />
      </span>
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
