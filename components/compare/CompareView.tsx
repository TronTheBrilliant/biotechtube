"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { formatMarketCap } from "@/lib/market-utils";
import { AddCompanyInput } from "./AddCompanyInput";

interface ComparedCompany {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  city: string | null;
  founded: number | null;
  description: string | null;
  domain: string | null;
  logo_url: string | null;
  valuation: number | null;
  total_raised: number | null;
  employee_range: string | null;
  stage: string | null;
  company_type: string | null;
  categories: string[] | null;
}

const STAGE_RANK: Record<string, number> = {
  Approved: 7,
  "Phase 3": 6,
  "Phase 2/3": 5,
  "Phase 2": 4,
  "Phase 1/2": 3,
  "Phase 1": 2,
  Preclinical: 1,
  "Pre-clinical": 1,
  Discovery: 0,
};

function fmtFunding(n: number | null): string {
  if (n == null || n === 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export function CompareView({ companies }: { companies: ComparedCompany[] }) {
  const router = useRouter();

  function removeCompany(slug: string) {
    const remaining = companies.filter((c) => c.slug !== slug).map((c) => c.slug);
    if (remaining.length === 0) {
      router.replace("/compare");
    } else {
      router.replace(`/compare?slugs=${remaining.join(",")}`);
    }
  }

  function addCompany(slug: string) {
    if (companies.some((c) => c.slug === slug)) return;
    if (companies.length >= 3) return;
    const next = [...companies.map((c) => c.slug), slug].slice(0, 3);
    router.replace(`/compare?slugs=${next.join(",")}`);
  }

  const colCount = Math.min(companies.length, 3);
  const slots = Array.from({ length: 3 }, (_, i) => companies[i] ?? null);

  // Leader detection — only highlight when one company is unambiguously higher.
  function leaderIndex(values: (number | null | undefined)[]): number | null {
    const present = values
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v != null && (x.v as number) > 0);
    if (present.length < 2) return null;
    const max = present.reduce((acc, x) => ((x.v as number) > (acc.v as number) ? x : acc), present[0]);
    const tieCount = present.filter((p) => p.v === max.v).length;
    if (tieCount > 1) return null;
    return max.i;
  }

  function stageRankOf(s: string | null): number | null {
    if (!s) return null;
    return STAGE_RANK[s] ?? null;
  }

  const valuationLeader = leaderIndex(slots.map((c) => c?.valuation ?? null));
  const fundingLeader = leaderIndex(slots.map((c) => c?.total_raised ?? null));
  const stageLeader = leaderIndex(slots.map((c) => stageRankOf(c?.stage ?? null)));

  return (
    <div>
      {/* ─── Column header strip — logo + name + ticker per company ─── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `180px repeat(3, minmax(0, 1fr))`,
          gap: 0,
          background: "var(--color-bg-primary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderRadius: "10px 10px 0 0",
          overflow: "hidden",
        }}
      >
        <div
          className="px-4 py-4 text-[11px] font-semibold uppercase"
          style={{
            color: "var(--color-text-tertiary)",
            letterSpacing: "0.5px",
            background: "var(--color-bg-secondary)",
            borderRight: "0.5px solid var(--color-border-subtle)",
            borderBottom: "0.5px solid var(--color-border-medium)",
          }}
        >
          Company
        </div>
        {slots.map((c, i) => (
          <div
            key={c ? c.slug : `slot-${i}`}
            className="px-4 py-4"
            style={{
              borderRight: i < 2 ? "0.5px solid var(--color-border-subtle)" : "none",
              borderBottom: "0.5px solid var(--color-border-medium)",
            }}
          >
            {c ? (
              <div className="flex items-start gap-3">
                <CompanyAvatar
                  name={c.name}
                  logoUrl={c.logo_url ?? undefined}
                  website={c.domain ?? undefined}
                  size={36}
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/company/${c.slug}`}
                    className="block font-semibold leading-tight hover:underline"
                    style={{ color: "var(--color-text-primary)", fontSize: 15 }}
                  >
                    {c.name}
                  </Link>
                  {c.ticker && (
                    <span
                      className="inline-block mt-1"
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {c.ticker}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeCompany(c.slug)}
                  aria-label={`Remove ${c.name}`}
                  className="rounded-sm transition-opacity hover:opacity-100"
                  style={{
                    width: 18,
                    height: 18,
                    color: "var(--color-text-tertiary)",
                    opacity: 0.5,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={12} strokeWidth={2.25} />
                </button>
              </div>
            ) : colCount < 3 ? (
              <AddCompanyInput onAdd={addCompany} />
            ) : null}
          </div>
        ))}
      </div>

      {/* ─── Comparison rows ─── */}
      <div
        style={{
          background: "var(--color-bg-primary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          overflow: "hidden",
        }}
      >
        <Row
          label="Country"
          values={slots.map((c) => (c ? c.country ?? "—" : ""))}
          mono={false}
        />
        <Row
          label="Founded"
          values={slots.map((c) => (c ? (c.founded ? String(c.founded) : "—") : ""))}
          mono
          alignRight
        />
        <Row
          label="Type"
          values={slots.map((c) => (c ? c.company_type ?? "—" : ""))}
        />

        <SectionDivider label="Market" />

        <Row
          label="Market cap"
          values={slots.map((c) => (c ? formatMarketCap(c.valuation ?? 0) || "—" : ""))}
          mono
          alignRight
          leaderIndex={valuationLeader}
        />

        <SectionDivider label="Funding" />

        <Row
          label="Total raised"
          values={slots.map((c) => (c ? fmtFunding(c.total_raised) : ""))}
          mono
          alignRight
          leaderIndex={fundingLeader}
        />

        <SectionDivider label="Pipeline" />

        <Row
          label="Stage"
          values={slots.map((c) => (c ? c.stage ?? "—" : ""))}
          leaderIndex={stageLeader}
          renderValue={(v, i) =>
            v && v !== "—" ? <StageChip stage={v} highlight={i === stageLeader} /> : <span>—</span>
          }
          allowReact
        />

        <SectionDivider label="Team" />

        <Row
          label="Employees"
          values={slots.map((c) => (c ? c.employee_range ?? "—" : ""))}
          mono
          alignRight
        />

        <SectionDivider label="Focus" />

        <Row
          label="Categories"
          values={slots.map((c) => (c ? renderCategories(c.categories) : ""))}
          allowReact
          dense
        />

        <SectionDivider label="About" />

        <Row
          label="Description"
          values={slots.map((c) => (c ? c.description ?? "—" : ""))}
          dense
          tall
        />

        <Row
          label="Website"
          values={slots.map((c) => (c ? renderWebsite(c.domain) : ""))}
          allowReact
        />
      </div>

      <p className="text-[12px] mt-4" style={{ color: "var(--color-text-tertiary)" }}>
        Data sourced from public filings, company websites, and BiotechTube&apos;s
        own enrichment. Share this view by copying the URL.
      </p>
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `180px 1fr 1fr 1fr`,
        background: "var(--color-bg-secondary)",
        borderTop: "0.5px solid var(--color-border-medium)",
        borderBottom: "0.5px solid var(--color-border-subtle)",
      }}
    >
      <div
        className="px-4 py-2 text-[10px] font-semibold uppercase"
        style={{ color: "var(--color-text-tertiary)", letterSpacing: "0.6px" }}
      >
        {label}
      </div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}

function Row({
  label,
  values,
  mono = false,
  alignRight = false,
  leaderIndex,
  renderValue,
  allowReact = false,
  dense = false,
  tall = false,
}: {
  label: string;
  values: (string | React.ReactNode)[];
  mono?: boolean;
  alignRight?: boolean;
  leaderIndex?: number | null;
  renderValue?: (v: string, i: number) => React.ReactNode;
  allowReact?: boolean;
  dense?: boolean;
  tall?: boolean;
}) {
  const alignClass = alignRight ? "text-right" : "text-left";
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `180px repeat(3, minmax(0, 1fr))`,
        borderBottom: "0.5px solid var(--color-border-subtle)",
      }}
    >
      <div
        className={`px-4 ${dense ? "py-3" : "py-4"} text-[12px] font-medium`}
        style={{
          color: "var(--color-text-tertiary)",
          background: "var(--color-bg-secondary)",
          borderRight: "0.5px solid var(--color-border-subtle)",
        }}
      >
        {label}
      </div>
      {values.map((v, i) => {
        const isLeader = leaderIndex === i;
        const baseColor = isLeader ? "var(--color-accent)" : "var(--color-text-primary)";
        return (
          <div
            key={i}
            className={`px-4 ${dense ? "py-3" : "py-4"} ${alignClass}`}
            style={{
              fontSize: 13,
              color: baseColor,
              fontFamily: mono ? "var(--font-geist-mono), monospace" : undefined,
              fontVariantNumeric: mono ? "tabular-nums" : undefined,
              fontWeight: isLeader ? 600 : 400,
              borderRight: i < 2 ? "0.5px solid var(--color-border-subtle)" : "none",
              maxHeight: tall ? undefined : undefined,
              lineHeight: 1.5,
            }}
          >
            {renderValue && typeof v === "string"
              ? renderValue(v, i)
              : allowReact
              ? v
              : (v as string)}
          </div>
        );
      })}
    </div>
  );
}

function StageChip({ stage, highlight }: { stage: string; highlight: boolean }) {
  if (highlight) {
    return (
      <span
        className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-sm uppercase"
        style={{
          background: "var(--color-accent-subtle)",
          color: "var(--color-accent-dark, var(--color-accent))",
          border: "0.5px solid var(--color-accent)",
          letterSpacing: "0.3px",
        }}
      >
        {stage}
      </span>
    );
  }
  return (
    <span
      className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase"
      style={{
        background: "var(--color-bg-secondary)",
        color: "var(--color-text-secondary)",
        border: "0.5px solid var(--color-border-subtle)",
        letterSpacing: "0.3px",
      }}
    >
      {stage}
    </span>
  );
}

function renderCategories(cats: string[] | null) {
  if (!cats || cats.length === 0) return <span>—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {cats.slice(0, 6).map((c) => (
        <span
          key={c}
          className="text-[10px] px-1.5 py-0.5 rounded-sm"
          style={{
            background: "var(--color-bg-tertiary)",
            color: "var(--color-text-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function renderWebsite(domain: string | null) {
  if (!domain) return <span>—</span>;
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 hover:underline"
      style={{ color: "var(--color-accent)", fontSize: 12 }}
    >
      {domain.replace(/^https?:\/\//, "")}
      <ExternalLink size={11} strokeWidth={2} />
    </a>
  );
}
