// Common material colours offered as one-tap swatches. Any other #RRGGBB can be
// picked with the custom colour input.
export const MATERIAL_COLOR_PRESETS: { hex: string; name: string }[] = [
  { hex: "#000000", name: "שחור" },
  { hex: "#ffffff", name: "לבן" },
  { hex: "#8e9089", name: "אפור" },
  { hex: "#c12e1f", name: "אדום" },
  { hex: "#ff6a13", name: "כתום" },
  { hex: "#f4ee2a", name: "צהוב" },
  { hex: "#00ae42", name: "ירוק" },
  { hex: "#0a2989", name: "כחול" },
  { hex: "#5e43b7", name: "סגול" },
  { hex: "#f55a74", name: "ורוד" },
  { hex: "#7d6556", name: "חום" },
  { hex: "#e8dbb7", name: "טבעי / בז'" },
];

export const COLOR_PATTERN = /^#[0-9a-f]{6}$/;

export function colorName(hex: string | null | undefined) {
  if (!hex) return null;
  return MATERIAL_COLOR_PRESETS.find((c) => c.hex === hex)?.name ?? hex;
}
