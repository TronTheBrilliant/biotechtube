"use client";

import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BarChart3 } from "lucide-react";
import {
  formatMarketCap,
  formatPercent,
} from "@/lib/market-utils";

interface SectorWithMarketData {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  company_count: number | null;
  public_company_count: number | null;
  combined_market_cap: number | null;
  total_volume: number | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
}

interface Props {
  sectors: SectorWithMarketData[];
}

function pctColor(val: number | null): string {
  if (val === null || val === 0) return "var(--color-text-tertiary)";
  return val > 0 ? "var(--color-accent)" : "#c0392b";
}

export default function SectorsPageClient({ sectors }: Props) {
  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      {/* Hero */}
      <div
        className="px-5 pt-6 pb-4"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={16} style={{ color: "var(--color-accent)" }} />
          <span
            className="text-10 uppercase tracking-[0.5px] font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            SECTORS
          </span>
        </div>
        <h1
          className="text-[32px] font-medium tracking-tight mb-1"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          Biotech Sectors
        </h1>
        <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
          Market performance across {sectors.length} biotech sectors
        </p>
      </div>

      {/* Sector Grid */}
      <div className="px-5 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sectors.map((s) => (
            <Link
              key={s.id}
              href={`/sectors/${s.slug}`}
              className="block rounded-lg border p-4 transition-all duration-150"
              style={{
                background: "var(--color-bg-secondary)",
                borderColor: "var(--color-border-subtle)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-text-tertiary)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Sector name */}
              <div
                className="text-13 font-semibold mb-2 leading-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {s.name}
              </div>

              {/* Market cap */}
              {s.combined_market_cap != null && (
                <div
                  className="text-12 font-medium mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {formatMarketCap(s.combined_market_cap)}
                </div>
              )}

              {/* Change percentages */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <span
                    className="text-10"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    1D
                  </span>
                  <span
                    className="text-11 font-medium"
                    style={{ color: pctColor(s.change_1d_pct) }}
                  >
                    {formatPercent(s.change_1d_pct)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="text-10"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    7D
                  </span>
                  <span
                    className="text-11 font-medium"
                    style={{ color: pctColor(s.change_7d_pct) }}
                  >
                    {formatPercent(s.change_7d_pct)}
                  </span>
                </div>
              </div>

              {/* Company counts */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span
                    className="text-10"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Public
                  </span>
                  <span
                    className="text-11"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {s.public_company_count ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="text-10"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Total
                  </span>
                  <span
                    className="text-11"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {s.company_count ?? "—"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
