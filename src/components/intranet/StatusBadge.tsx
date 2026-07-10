import { cn } from "@/lib/utils";

const COLOR_CLASSES = {
  gray: "bg-muted text-muted-foreground border-transparent",
  blue: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-950 dark:text-blue-300",
  green: "bg-green-100 text-green-800 border-transparent dark:bg-green-950 dark:text-green-300",
  amber: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-300",
} as const;

export type StatusColor = keyof typeof COLOR_CLASSES;

export function StatusBadge({ label, color }: { label: string; color: StatusColor }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
        COLOR_CLASSES[color],
      )}
    >
      {label}
    </span>
  );
}
