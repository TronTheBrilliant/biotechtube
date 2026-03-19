"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { FundingRound, Company } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/formatting";

const roundColors: Record<string, { bg: string; text: string }> = {
  "Series C": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series A": { bg: "#f5f3ff", text: "#5b21b6" },
  Seed: { bg: "#e8f5f0", text: "#0a3d2e" },
  Grant: { bg: "#fef3e2", text: "#b45309" },
  Public: { bg: "#f7f7f6", text: "#6b6b65" },
  "Follow-on": { bg: "#f7f7f6", text: "#6b6b65" },
};

interface RecentlyFundedProps {
  funding: FundingRound[];
  companies: Company[];
}

export function RecentlyFunded({ funding, companies }: RecentlyFundedProps) {
  const getCompany = (slug: string) => companies.find((c) => c.slug === slug);
  const getCompanyName = (slug: string) => getCompany(slug)?.name || slug;
  const getCompanyCity = (slug: string) => getCompany(slug)?.city || "";

  return (
    <div>
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} style={{ color: "var(--color-text-secondary)" }} />
          <div className="live-dot" />
          <span
            className="text-12 uppercase tracking-[0.5px] font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            RECENTLY FUNDED
          </span>
        </div>
        <Link
          href="/funding"
          className="text-12"
          style={{ color: "var(--color-accent)" }}
        >
          View all →
        </Link>
      </div>
      {funding.map((round, i) => {
        const rc = roundColors[round.type] || roundColors.Seed;
        const companyExists = !!getCompany(round.companySlug);
        return (
          <Link
            key={i}
            href={companyExists ? `/company/${round.companySlug}` : "#"}
            className="block px-3.5 py-[9px] border-b transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <div className="flex justify-between items-baseline mb-[2px]">
              <span
                className="text-14 font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                {getCompanyName(round.companySlug)}
              </span>
              <span
                className="text-14 font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                {formatCurrency(round.amount, round.currency)}
              </span>
            </div>
            <div className="text-12 mb-[2px]" style={{ color: "var(--color-text-secondary)" }}>
              <span
                className="inline-block px-1.5 py-[1px] rounded-sm mr-1 text-[9px]"
                style={{
                  background: rc.bg,
                  color: rc.text,
                  border: `0.5px solid ${rc.bg}`,
                }}
              >
                {round.type}
              </span>
              {round.leadInvestor && <>Led by {round.leadInvestor}</>}
            </div>
            <div className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
              {formatRelativeTime(round.daysAgo || 0)} · {getCompanyCity(round.companySlug)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
