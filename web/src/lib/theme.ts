// Mirrors the color tokens in globals.css - kept here too since components
// often need the raw hex value (SVG stroke, inline style) rather than a
// Tailwind class.
export const COST_COLORS: Record<number, string> = {
  1: "#8B96A6",
  2: "#3FA65C",
  3: "#3E8FD0",
  4: "#B15FE0",
  5: "#C89B3C",
  6: "#E24B4A",
};

export const CYAN = "#0AC8B9";
export const GOLD = "#C89B3C";

export function costColor(cost: number): string {
  return COST_COLORS[cost] ?? "#6B7488";
}
