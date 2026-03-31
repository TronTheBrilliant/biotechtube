"use client";

import Link from "next/link";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { FundingRound, Company } from "@/lib/types";
import { formatCurrency, formatRelativeTime } from "@/lib/formatting";
import { CompanyAvatar } from "./CompanyAvatar";

const roundColors: Record<string, { bg: string; text: string }> = {
  "Series C": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series A": { bg: "#f5f3ff", text: "#5b21b6" },
  Seed: { bg: "#ecfdf5", text: "#064e3b" },
  Grant: { bg: "#fef3e2", text: "#b45309" },
  Public: { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)" },
  "Follow-on": { bg: "var(--color-bg-secondary)", text: "var(--color-text-secondary)" },
};

const roundEmoji: Record<string, string> = {
  Seed: "🌱", "Series A": "🅰️", "Series B": "🅱️", "Series C": "🚀",
  Grant: "🏛️", Public: "📈", "Follow-on": "📈",
};

interface RecentlyFundedProps {
  funding: FundingRound[];
  companies: Company[];
}

export function RecentlyFunded({ funding, companies }: RecentlyFundedProps) {
  const getCompany = (slug: string) => companies.find((c) => c.slug === slug);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} style={{ color: "var(--color-accent)" }} />
          <div className="live-dot" />
          <span className="text-12 uppercase tracking-[0.5px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Recently Funded
          </span>
        </div>
        <Link href="/funding" className="flex items-center gap-1 text-12 font-medium" style={{ color: "var(--color-accent)" }}>
          View all <ArrowUpRight size={11} />
        </Link>
      </div>

      {/* Funding rounds */}
      {funding.map((round, i) => {
        const rc = roundColors[round.type] || roundColors.Seed;
        const company = getCompany(round.companySlug);
        return (
          <Link
            key={i}
            href={company ? `/company/${round.companySlug}` : "#"}
            className="flex items-start gap-2.5 px-3.5 py-3 border-b transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            {/* Company avatar */}
            <CompanyAvatar
              name={company?.name || round.companySlug}
              logoUrl={company?.logoUrl}
              website={company?.website}
              size={32}
            />
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <span className="text-13 font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  {company?.name || round.companySlug}
                </span>
                <span className="text-13 font-medium flex-shrink-0 ml-2" style={{ color: "var(--color-accent)" }}>
                  {formatCurrency(round.amount, round.currency)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm text-11 font-medium whitespace-nowrap"
                  style={{ background: rc.bg, color: rc.text }}
                >
                  {roundEmoji[round.type] || "💰"} {round.type}
                </span>
                {round.leadInvestor && (
                  <span className="text-12 truncate" style={{ color: "var(--color-text-tertiary)" }}>
                    {round.leadInvestor}
                  </span>
                )}
              </div>
              <div className="text-12 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                {formatRelativeTime(round.daysAgo || 0)} · {company?.city || ""}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
