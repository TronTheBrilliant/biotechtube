// biotechtube/lib/stripe/prices.ts
import type { Tier } from "@/lib/reports/types";

export function getReportPriceId(tier: Tier): string | null {
  switch (tier) {
    case "snapshot":      return process.env.STRIPE_PRICE_REPORT_SNAPSHOT ?? null;
    case "living":        return process.env.STRIPE_PRICE_REPORT_LIVING ?? null;
    case "institutional": return process.env.STRIPE_PRICE_REPORT_INST ?? null;
  }
}

export function getReportAmountCents(tier: Tier): number {
  switch (tier) {
    case "snapshot":      return 9900;
    case "living":        return 29900;
    case "institutional": return 299900;
  }
}
