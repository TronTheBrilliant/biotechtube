/**
 * Generate a full monochromatic palette from a single brand hex color.
 * Returns CSS variable values for both light and dark modes.
 */

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface TemplatePalette {
  brand: string;
  brand50: string;
  brand100: string;
  brand200: string;
  brand300: string;
  brand400: string;
  brand500: string;
  brand600: string;
  brand700: string;
  brand800: string;
  brand900: string;
  brand950: string;
}

export function generatePalette(brandHex: string): TemplatePalette {
  const { h, s } = hexToHSL(brandHex);

  return {
    brand: brandHex,
    brand50: hslToHex(h, Math.min(s, 30), 97),
    brand100: hslToHex(h, Math.min(s, 35), 93),
    brand200: hslToHex(h, Math.min(s, 40), 85),
    brand300: hslToHex(h, Math.min(s, 50), 72),
    brand400: hslToHex(h, Math.min(s, 60), 58),
    brand500: hslToHex(h, s, 45),
    brand600: hslToHex(h, s, 38),
    brand700: hslToHex(h, s, 30),
    brand800: hslToHex(h, s, 22),
    brand900: hslToHex(h, s, 15),
    brand950: hslToHex(h, s, 8),
  };
}

export interface TemplateThemeVars {
  "--t-bg": string;
  "--t-bg-secondary": string;
  "--t-bg-tertiary": string;
  "--t-text": string;
  "--t-text-secondary": string;
  "--t-text-tertiary": string;
  "--t-brand": string;
  "--t-brand-light": string;
  "--t-brand-subtle": string;
  "--t-border": string;
  "--t-border-medium": string;
}

export function getThemeVars(
  palette: TemplatePalette,
  mode: "light" | "dark"
): TemplateThemeVars {
  if (mode === "light") {
    return {
      "--t-bg": "#ffffff",
      "--t-bg-secondary": "#fafafa",
      "--t-bg-tertiary": palette.brand50,
      "--t-text": "#111111",
      "--t-text-secondary": "#555555",
      "--t-text-tertiary": "#999999",
      "--t-brand": palette.brand,
      "--t-brand-light": palette.brand300,
      "--t-brand-subtle": palette.brand50,
      "--t-border": "rgba(0,0,0,0.08)",
      "--t-border-medium": "rgba(0,0,0,0.14)",
    };
  }

  return {
    "--t-bg": "#0a0a0a",
    "--t-bg-secondary": "#141414",
    "--t-bg-tertiary": "#1a1a1a",
    "--t-text": "#f0f0f0",
    "--t-text-secondary": "#a0a0a0",
    "--t-text-tertiary": "#666666",
    "--t-brand": palette.brand300,
    "--t-brand-light": palette.brand200,
    "--t-brand-subtle": `${palette.brand}15`,
    "--t-border": "rgba(255,255,255,0.08)",
    "--t-border-medium": "rgba(255,255,255,0.14)",
  };
}
