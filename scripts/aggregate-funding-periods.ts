/**
 * Aggregate funding-historical.json (246 rounds) into weekly and monthly totals.
 * Outputs:
 *   data/funding-weekly.json   — { time: "YYYY-MM-DD", value: number }[]
 *   data/funding-monthly.json  — { time: "YYYY-MM-DD", value: number }[]
 *
 * Weekly: Monday of each ISO week.  Monthly: 1st of each month.
 * Values are in millions USD.
 */

import fs from "fs";
import path from "path";

interface Round {
  company: string;
  companySlug: string;
  type: string;
  amount: number;
  currency: string;
  date: string;
  leadInvestor: string;
  quarter: string;
}

interface TimeValue {
  time: string;
  value: number;
}

const DATA_DIR = path.join(__dirname, "..", "data");
const rounds: Round[] = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "funding-historical.json"), "utf-8")
);

console.log(`Loaded ${rounds.length} rounds`);

// ── Helpers ──────────────────────────────────────────────────────────

/** Get ISO Monday for a given date string */
function getISOMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // offset to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Get first of month for a given date string */
function getMonthStart(dateStr: string): string {
  return dateStr.slice(0, 7) + "-01";
}

function aggregate(keyFn: (date: string) => string): TimeValue[] {
  const map = new Map<string, number>();
  for (const r of rounds) {
    const key = keyFn(r.date);
    map.set(key, (map.get(key) || 0) + r.amount);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, value]) => ({ time, value }));
}

// ── Generate ─────────────────────────────────────────────────────────

const weekly = aggregate(getISOMonday);
const monthly = aggregate(getMonthStart);

fs.writeFileSync(
  path.join(DATA_DIR, "funding-weekly.json"),
  JSON.stringify(weekly, null, 2)
);
console.log(`Written funding-weekly.json (${weekly.length} weeks)`);

fs.writeFileSync(
  path.join(DATA_DIR, "funding-monthly.json"),
  JSON.stringify(monthly, null, 2)
);
console.log(`Written funding-monthly.json (${monthly.length} months)`);
