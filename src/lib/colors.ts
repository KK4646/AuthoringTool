export const HUES = [
  { name: "red", label: "レッド", hex: "#a63030" },
  { name: "orange", label: "オレンジ", hex: "#a66b30" },
  { name: "yellow", label: "イエロー", hex: "#a69230" },
  { name: "green", label: "グリーン", hex: "#30a630" },
  { name: "cyan", label: "シアン", hex: "#3092a6" },
  { name: "blue", label: "ブルー", hex: "#3057a6" },
  { name: "purple", label: "パープル", hex: "#6b30a6" },
  { name: "pink", label: "ピンク", hex: "#a6306b" },
] as const;

export const APPROVED_COLORS = HUES.map((h) => h.hex);

export type ApprovedColor = (typeof HUES)[number]["hex"];

export const DEFAULT_ACCENT_COLOR: ApprovedColor = "#3057a6";

export function isApprovedColor(value: string): value is ApprovedColor {
  return (APPROVED_COLORS as readonly string[]).includes(value);
}
