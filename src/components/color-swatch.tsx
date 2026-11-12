import { colorName } from "@/lib/colors";

// Small colour chip next to a material name. Renders nothing for items without a colour.
export function ColorSwatch({ color, className = "" }: { color: string | null | undefined; className?: string }) {
  if (!color) return null;
  const name = colorName(color);
  return (
    <span
      role="img"
      aria-label={`צבע: ${name}`}
      title={name ?? undefined}
      className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-inset ring-slate-400/70 ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
