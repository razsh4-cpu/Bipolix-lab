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

// The wider palette behind "צבע אחר": common shades of filament colours.
export const MORE_MATERIAL_COLORS: { hex: string; name: string }[] = [
  { hex: "#545454", name: "אפור כהה" },
  { hex: "#c8c8c8", name: "אפור בהיר" },
  { hex: "#a6a9aa", name: "כסוף" },
  { hex: "#e4bd68", name: "זהב" },
  { hex: "#9d432c", name: "נחושת" },
  { hex: "#8e1b2f", name: "בורדו" },
  { hex: "#ff8f8f", name: "אדום בהיר" },
  { hex: "#f99963", name: "אפרסק" },
  { hex: "#fec600", name: "צהוב חרדל" },
  { hex: "#fff7a6", name: "צהוב בהיר" },
  { hex: "#c2e189", name: "ירוק ליים" },
  { hex: "#164b35", name: "ירוק כהה" },
  { hex: "#68724d", name: "ירוק זית" },
  { hex: "#00bfa5", name: "טורקיז" },
  { hex: "#56b7e6", name: "תכלת" },
  { hex: "#0086d6", name: "כחול בהיר" },
  { hex: "#042f56", name: "כחול כהה" },
  { hex: "#b39ddb", name: "לילך" },
  { hex: "#3d1f5c", name: "סגול כהה" },
  { hex: "#ec008c", name: "מג'נטה" },
  { hex: "#ffc0cb", name: "ורוד בהיר" },
  { hex: "#4d3324", name: "חום כהה" },
  { hex: "#c6a37a", name: "עץ" },
  { hex: "#fdf6e3", name: "שמנת" },
];

export const COLOR_PATTERN = /^#[0-9a-f]{6}$/;

export function colorName(hex: string | null | undefined) {
  if (!hex) return null;
  return [...MATERIAL_COLOR_PRESETS, ...MORE_MATERIAL_COLORS].find((c) => c.hex === hex)?.name ?? hex;
}
