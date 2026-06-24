import logoSrc from "@/assets/aruana-logo.png";

interface Props {
  className?: string;
  variant?: "light" | "dark";
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AruanaLogo({ className = "", size = "md" }: Props) {
  const heights = {
    sm: "h-10",
    md: "h-12 sm:h-14",
    lg: "h-20 sm:h-24",
  } as const;

  return (
    <img
      src={logoSrc}
      alt="Aruanã Digital — Tecnologia, Educação e Resultados"
      className={`${heights[size]} w-auto object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
