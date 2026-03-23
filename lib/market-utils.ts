const TRILLION = 1_000_000_000_000;
const BILLION = 1_000_000_000;
const MILLION = 1_000_000;
const THOUSAND = 1_000;

function compactFormat(value: number): { digits: string; suffix: string } {
  if (value >= TRILLION) {
    const v = value / TRILLION;
    return { digits: v >= 10 ? v.toFixed(1) : v.toFixed(1), suffix: "T" };
  }
  if (value >= BILLION) {
    const v = value / BILLION;
    return { digits: v >= 10 ? v.toFixed(1) : v.toFixed(1), suffix: "B" };
  }
  if (value >= MILLION) {
    const v = value / MILLION;
    return { digits: v >= 10 ? v.toFixed(1) : v.toFixed(1), suffix: "M" };
  }
  if (value >= THOUSAND) {
    const v = value / THOUSAND;
    return { digits: v >= 10 ? v.toFixed(1) : v.toFixed(1), suffix: "K" };
  }
  return { digits: String(Math.round(value)), suffix: "" };
}

export function formatMarketCap(value: number): string {
  if (value <= 0) {
    return value === 0 ? "$0" : `-$${Math.abs(value)}`;
  }
  const { digits, suffix } = compactFormat(value);
  return `$${digits}${suffix}`;
}

export function formatVolume(value: number): string {
  if (value <= 0) {
    return value === 0 ? "0" : String(value);
  }
  const { digits, suffix } = compactFormat(value);
  return `${digits}${suffix}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "0.00%";
  const sign = value > 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

export function formatCompactNumber(value: number): string {
  if (value <= 0) {
    return value === 0 ? "0" : String(value);
  }
  const { digits, suffix } = compactFormat(value);
  return `${digits}${suffix}`;
}

/** Returns CSS color for positive/negative percentage values */
export function pctColor(val: number | null): string {
  if (val === null) return "var(--color-text-secondary)";
  return val >= 0 ? "var(--color-accent)" : "#c0392b";
}

/** Format a date for chart X-axis based on total point count */
export function formatChartDate(dateStr: string, totalPoints: number): string {
  const d = new Date(dateStr);
  if (totalPoints > 1500) {
    return d.toLocaleDateString("en-US", { year: "2-digit" });
  } else if (totalPoints > 500) {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  } else {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}
