import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { pctColor, formatMarketCap } from "@/lib/market-utils";

interface TrendingCompany {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  logo_url: string | null;
  website?: string | null;
  change30d: number;
  marketCap: number;
}

interface TrendingCompaniesProps {
  companies: TrendingCompany[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatChange(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

export function TrendingCompanies({ companies }: TrendingCompaniesProps) {
  return (
    <div>
      {companies.map((company, i) => (
        <Link
          key={company.slug}
          href={`/company/${company.slug}`}
          className="px-4 py-2.5 flex items-center gap-3 transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
          style={
            i < companies.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          {/* Rank */}
          <span
            className="text-12 font-medium w-5 text-center flex-shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {i + 1}
          </span>

          {/* Logo */}
          <CompanyAvatar name={company.name} logoUrl={company.logo_url ?? undefined} website={company.website ?? undefined} size={24} />

          {/* Name + ticker */}
          <div className="min-w-0">
            <div
              className="text-13 font-medium truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {company.name}
            </div>
            {company.ticker && (
              <div
                className="text-11"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {company.ticker}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* 30D change */}
          <span
            className="text-13 font-semibold flex-shrink-0"
            style={{ color: pctColor(company.change30d) }}
          >
            {formatChange(company.change30d)}
          </span>

          {/* Market cap */}
          <span
            className="text-12 flex-shrink-0"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {formatMarketCap(company.marketCap)}
          </span>
        </Link>
      ))}
    </div>
  );
}
