"use client";

import Link from "next/link";
import { Company } from "@/lib/types";
import { formatNumber } from "@/lib/formatting";
import { CompanyAvatar } from "@/components/CompanyAvatar";

interface TrendingStripProps {
  companies: Company[];
}

export function TrendingStrip({ companies }: TrendingStripProps) {
  const trending = companies
    .filter((c) => c.trending != null)
    .sort((a, b) => (a.trending ?? 99) - (b.trending ?? 99))
    .slice(0, 5);

  if (trending.length === 0) return null;

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="live-dot" />
        <span
          className="text-12 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          TRENDING
        </span>
      </div>
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {trending.map((company) => (
          <Link
            key={company.slug}
            href={`/company/${company.slug}`}
            className="flex items-center gap-2 px-3 py-2 rounded-md border whitespace-nowrap flex-shrink-0 cursor-pointer transition-all duration-150 hover:border-[var(--color-border-medium)]"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <span
              className="text-10 font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              #{company.trending}
            </span>
            <CompanyAvatar name={company.name} logoUrl={company.logoUrl} size={20} />
            <div>
              <div
                className="text-[15px] font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                {company.name}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                  {company.focus[0]}
                </span>
                <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                  · {formatNumber(company.profileViews || 0)} views
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
