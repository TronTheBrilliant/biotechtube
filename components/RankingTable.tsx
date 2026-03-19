"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Company, FundingRound } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { CompanyAvatar } from "@/components/CompanyAvatar";

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  Approved: { bg: "#e8f5f0", text: "#0a3d2e", border: "#5DCAA5" },
  "Phase 3": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 2": { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  "Phase 1/2": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Phase 1": { bg: "#f5f3ff", text: "#5b21b6", border: "#c4b5fd" },
  "Pre-clinical": { bg: "#f7f7f6", text: "#6b6b65", border: "rgba(0,0,0,0.14)" },
};

const stageEmoji: Record<string, string> = {
  "Pre-clinical": "🔬",
  "Phase 1": "1️⃣",
  "Phase 1/2": "🔄",
  "Phase 2": "2️⃣",
  "Phase 3": "3️⃣",
  Approved: "✅",
};

const roundBadgeColors: Record<string, { bg: string; text: string }> = {
  Seed: { bg: "#f0fdf4", text: "#166534" },
  "Series A": { bg: "#eff6ff", text: "#1d4ed8" },
  "Series B": { bg: "#f5f3ff", text: "#5b21b6" },
  "Series C": { bg: "#fef3e2", text: "#b45309" },
  Grant: { bg: "#e8f5f0", text: "#0a3d2e" },
};

const roundEmoji: Record<string, string> = {
  Seed: "🌱", "Series A": "🅰️", "Series B": "🅱️", "Series C": "🚀", Grant: "🏛️",
};

const rankChanges: Record<string, number> = {
  oncoinvent: 2, "nykode-therapeutics": -1, "pci-biotech": 0,
  photocure: 1, "lytix-biopharma": -2, "caedo-oncology": 0,
  "domore-diagnostics": 3, "zelluna-immunotherapy": -1,
};

function generateSparkline() {
  return Array.from({ length: 12 }, (_, i) => ({ v: 50 + Math.random() * 50 + i * 3 }));
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

type Mode = "top" | "trending" | "funded" | "new";

interface RankingTableProps {
  companies: Company[];
  mode?: Mode;
  funding?: FundingRound[];
}

// Grid configs per mode
const gridConfigs: Record<Mode, { mobile: string; desktop: string }> = {
  top:      { mobile: "30px 1fr auto",       desktop: "32px 1fr 80px 70px 80px 90px 30px" },
  trending: { mobile: "30px 1fr auto",       desktop: "32px 1fr 90px 70px 80px 90px 30px" },
  funded:   { mobile: "30px 1fr auto",       desktop: "32px 1fr 80px 80px 1fr 80px 30px" },
  new:      { mobile: "30px 1fr auto",       desktop: "32px 1fr 70px 70px 1fr 30px" },
};

export function RankingTable({ companies, mode = "top", funding = [] }: RankingTableProps) {
  const m = mode;
  const paywallIndex = m === "trending" ? Math.max(companies.length, 5) : 5;
  const grid = gridConfigs[m];

  // Build funding lookup for "funded" mode
  const fundingMap = new Map<string, FundingRound>();
  for (const f of funding) {
    if (!fundingMap.has(f.companySlug)) fundingMap.set(f.companySlug, f);
  }

  return (
    <div>
      {/* Header */}
      <div
        className="ranking-grid grid items-center gap-2 py-2 border-b px-0 md:px-0"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        <style>{`
          .ranking-grid { grid-template-columns: ${grid.mobile}; }
          @media (min-width: 768px) { .ranking-grid { grid-template-columns: ${grid.desktop}; } }
        `}</style>
        <span className="text-11 uppercase tracking-[0.5px] text-center">#</span>
        <span className="text-11 uppercase tracking-[0.5px]">Company</span>

        {/* Mode-specific desktop headers */}
        {m === "top" && (
          <>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">Valuation</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right md:text-right">Stage</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">Raised</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">30d</span>
            <span className="hidden md:block" />
          </>
        )}
        {m === "trending" && (
          <>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">Views</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right md:text-right">Stage</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">Trend</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">30d</span>
            <span className="hidden md:block" />
          </>
        )}
        {m === "funded" && (
          <>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">Round</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">Amount</span>
            <span className="text-11 uppercase tracking-[0.5px] hidden md:block">Lead Investor</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">Date</span>
            <span className="hidden md:block" />
          </>
        )}
        {m === "new" && (
          <>
            <span className="text-11 uppercase tracking-[0.5px] text-right hidden md:block">Founded</span>
            <span className="text-11 uppercase tracking-[0.5px] text-right md:text-right">Stage</span>
            <span className="text-11 uppercase tracking-[0.5px] hidden md:block">About</span>
            <span className="hidden md:block" />
          </>
        )}
      </div>

      {/* Rows */}
      {companies.map((company, index) => {
        const isLocked = index >= paywallIndex;
        const sparkData = generateSparkline();
        const sc = stageColors[company.stage] || stageColors["Pre-clinical"];
        const isPublic = company.type === "Public";
        const fr = fundingMap.get(company.slug);

        return (
          <Link
            key={company.slug}
            href={`/company/${company.slug}`}
            className="ranking-grid grid items-center gap-2 py-2.5 cursor-pointer transition-colors duration-100 rounded-lg md:rounded-none mx-3 md:mx-0 mb-1.5 md:mb-0 border md:border-0 md:border-b px-3 md:px-0"
            style={{
              ...(isLocked ? { filter: "blur(2px)", opacity: 0.4, pointerEvents: "none", userSelect: "none" } : {}),
            }}
            onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
            onMouseLeave={(e) => { if (!isLocked) e.currentTarget.style.background = ""; }}
          >
            {/* Rank number + change */}
            <div className="flex flex-col items-center">
              <span className="text-[20px] font-medium" style={{ color: "var(--color-text-primary)" }}>{index + 1}</span>
              {(() => {
                const change = rankChanges[company.slug] || 0;
                if (change > 0) return <span className="text-[10px]" style={{ color: "#1a7a5e" }}>▲{change}</span>;
                if (change < 0) return <span className="text-[10px]" style={{ color: "#c0392b" }}>▼{Math.abs(change)}</span>;
                return null;
              })()}
            </div>

            {/* Company info — adapts per mode on mobile */}
            <div className="flex items-center gap-2 min-w-0">
              <CompanyAvatar name={company.name} logoUrl={company.logoUrl} website={company.website} size={28} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                    {company.name}
                  </span>
                  {company.ticker && (
                    <span
                      className="text-[9px] font-medium px-1 py-[1px] rounded-sm flex-shrink-0 hidden sm:inline md:hidden"
                      style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-tertiary)", border: "0.5px solid var(--color-border-subtle)" }}
                    >
                      {company.ticker}
                    </span>
                  )}
                </div>

                {/* Mobile secondary info — varies by mode */}
                <div className="flex items-center gap-1.5 mt-[1px] md:hidden">
                  {m === "top" && (
                    <>
                      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>{company.city}, {company.country}</span>
                      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>·</span>
                      <span className="text-12 font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(company.totalRaised)}</span>
                    </>
                  )}
                  {m === "trending" && (
                    <>
                      <span className="text-12" style={{ color: "var(--color-accent)" }}>🔥 #{company.trending}</span>
                      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>·</span>
                      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>{company.profileViews} views</span>
                    </>
                  )}
                  {m === "funded" && fr && (
                    <>
                      <span className="text-11 px-1.5 py-[1px] rounded-sm" style={{ background: (roundBadgeColors[fr.type] || roundBadgeColors.Seed).bg, color: (roundBadgeColors[fr.type] || roundBadgeColors.Seed).text }}>
                        {roundEmoji[fr.type] || ""} {fr.type}
                      </span>
                      <span className="text-12 font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(fr.amount, fr.currency)}</span>
                    </>
                  )}
                  {m === "funded" && !fr && (
                    <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>{company.city}, {company.country}</span>
                  )}
                  {m === "new" && (
                    <>
                      <span className="text-12 font-medium" style={{ color: "var(--color-text-primary)" }}>Est. {company.founded}</span>
                      {company.founded >= 2023 && (
                        <span className="text-[9px] px-1.5 py-[1px] rounded-sm font-medium" style={{ background: "#e8f5f0", color: "#0a3d2e" }}>New</span>
                      )}
                    </>
                  )}
                </div>

                {/* Desktop secondary: location (hidden on mobile) */}
                <div className="hidden md:flex items-center gap-1.5 mt-[1px]">
                  <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>{company.city}, {company.country}</span>
                </div>

                {/* Mobile focus tags (top mode only) */}
                {m === "top" && (
                  <div className="flex items-center gap-1 mt-[2px] md:hidden">
                    {company.focus.slice(0, 2).map((f) => (
                      <span key={f} className="text-[9px] px-1.5 py-[1px] rounded-sm" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Mobile description snippet (new mode) */}
                {m === "new" && (
                  <div className="text-11 mt-[2px] md:hidden truncate" style={{ color: "var(--color-text-tertiary)", maxWidth: "220px" }}>
                    {company.description.slice(0, 60)}...
                  </div>
                )}
              </div>
            </div>

            {/* === MODE-SPECIFIC DESKTOP COLUMNS === */}

            {/* TOP MODE: Valuation | Stage | Raised | Sparkline | Star */}
            {m === "top" && (
              <>
                <div className="text-right hidden md:block">
                  {company.valuation ? (
                    <span className="text-14 font-medium" style={{ color: isPublic ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
                      {company.isEstimated && <span style={{ color: "var(--color-text-tertiary)" }}>est. </span>}
                      {formatCurrency(company.valuation)}
                    </span>
                  ) : (
                    <span className="text-14 font-medium" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <span className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                    {stageEmoji[company.stage] ? `${stageEmoji[company.stage]} ${company.stage}` : company.stage}
                  </span>
                </div>
                <div className="text-right hidden md:block">
                  <span className="text-14 font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(company.totalRaised)}</span>
                </div>
                <div className="hidden md:flex justify-end">
                  <div className="w-[80px] h-[28px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkData}>
                        <Line type="monotone" dataKey="v" stroke={isPublic ? "#1a7a5e" : "#9e9e96"} strokeWidth={1.5} strokeDasharray={isPublic ? undefined : "3 2"} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="hidden md:flex justify-center">
                  <Star size={14} className="cursor-pointer transition-colors duration-150" style={{ color: "var(--color-text-tertiary)" }} />
                </div>
              </>
            )}

            {/* TRENDING MODE: Views | Stage | Trend fire | Sparkline | Star */}
            {m === "trending" && (
              <>
                <div className="text-right hidden md:block">
                  <span className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {company.profileViews?.toLocaleString() || "—"}
                  </span>
                  <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>views</div>
                </div>
                <div className="flex justify-end">
                  <span className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                    {stageEmoji[company.stage] ? `${stageEmoji[company.stage]} ${company.stage}` : company.stage}
                  </span>
                </div>
                <div className="text-right hidden md:block">
                  <span className="text-14">
                    {company.trending && company.trending <= 2 ? "🔥🔥🔥" : company.trending && company.trending <= 4 ? "🔥🔥" : "🔥"}
                  </span>
                </div>
                <div className="hidden md:flex justify-end">
                  <div className="w-[80px] h-[28px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkData}>
                        <Line type="monotone" dataKey="v" stroke="#1a7a5e" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="hidden md:flex justify-center">
                  <Star size={14} className="cursor-pointer transition-colors duration-150" style={{ color: "var(--color-text-tertiary)" }} />
                </div>
              </>
            )}

            {/* FUNDED MODE: Round | Amount | Lead Investor | Date | Star */}
            {m === "funded" && (
              <>
                <div className="text-right hidden md:block">
                  {fr ? (
                    <span className="text-11 px-[8px] py-[3px] rounded-sm inline-block whitespace-nowrap" style={{ background: (roundBadgeColors[fr.type] || roundBadgeColors.Seed).bg, color: (roundBadgeColors[fr.type] || roundBadgeColors.Seed).text }}>
                      {roundEmoji[fr.type] || ""} {fr.type}
                    </span>
                  ) : (
                    <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                  )}
                </div>
                <div className="text-right hidden md:block">
                  {fr ? (
                    <span className="text-14 font-medium" style={{ color: "var(--color-accent)" }}>{formatCurrency(fr.amount, fr.currency)}</span>
                  ) : (
                    <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                  )}
                </div>
                <div className="hidden md:block truncate">
                  <span className="text-12" style={{ color: "var(--color-text-secondary)" }}>{fr?.leadInvestor || "—"}</span>
                </div>
                <div className="text-right hidden md:block">
                  <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>{fr ? relativeDate(fr.date) : "—"}</span>
                </div>
                <div className="hidden md:flex justify-center">
                  <Star size={14} className="cursor-pointer transition-colors duration-150" style={{ color: "var(--color-text-tertiary)" }} />
                </div>
              </>
            )}

            {/* NEW MODE: Founded | Stage | Description | Star */}
            {m === "new" && (
              <>
                <div className="text-right hidden md:block">
                  <span className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>{company.founded}</span>
                  {company.founded >= 2023 && (
                    <div className="text-[9px] mt-0.5 px-1.5 py-[1px] rounded-sm inline-block font-medium" style={{ background: "#e8f5f0", color: "#0a3d2e" }}>New</div>
                  )}
                </div>
                <div className="flex justify-end">
                  <span className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                    {stageEmoji[company.stage] ? `${stageEmoji[company.stage]} ${company.stage}` : company.stage}
                  </span>
                </div>
                <div className="hidden md:block truncate">
                  <span className="text-12" style={{ color: "var(--color-text-secondary)" }}>
                    {company.description.length > 55 ? company.description.slice(0, 55) + "..." : company.description}
                  </span>
                </div>
                <div className="hidden md:flex justify-center">
                  <Star size={14} className="cursor-pointer transition-colors duration-150" style={{ color: "var(--color-text-tertiary)" }} />
                </div>
              </>
            )}

            {/* Mobile: stage badge (funded mode shows round badge instead) */}
            {m === "funded" && (
              <div className="flex justify-end md:hidden">
                {fr ? (
                  <span className="text-11 px-[8px] py-[3px] rounded-sm whitespace-nowrap" style={{ background: (roundBadgeColors[fr.type] || roundBadgeColors.Seed).bg, color: (roundBadgeColors[fr.type] || roundBadgeColors.Seed).text }}>
                    {roundEmoji[fr.type] || ""} {fr.type}
                  </span>
                ) : (
                  <span className="text-11 px-[8px] py-[3px] rounded-sm border whitespace-nowrap" style={{ background: sc.bg, color: sc.text, borderColor: sc.border, borderWidth: "0.5px" }}>
                    {stageEmoji[company.stage] ? `${stageEmoji[company.stage]} ${company.stage}` : company.stage}
                  </span>
                )}
              </div>
            )}
          </Link>
        );
      })}

      {/* Paywall overlay */}
      {companies.length > paywallIndex && (
        <div
          className="flex items-center gap-2.5 py-3.5 px-3"
          style={{ background: `linear-gradient(to bottom, transparent, var(--color-bg-primary))` }}
        >
          <span className="text-14">🔒</span>
          <span className="text-12" style={{ color: "var(--color-text-secondary)" }}>
            Sign up to see all 14,000+ companies
          </span>
          <Link href="/signup" className="text-12" style={{ color: "var(--color-accent)" }}>
            Create free account →
          </Link>
        </div>
      )}
    </div>
  );
}
