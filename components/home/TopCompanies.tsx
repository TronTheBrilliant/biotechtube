import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { formatMarketCap } from "@/lib/market-utils";

interface Company {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  valuation: number | null;
  logo_url: string | null;
  website?: string | null;
}

export default function TopCompanies({ companies }: { companies: Company[] }) {
  return (
    <div>
      {companies.slice(0, 5).map((c, i) => (
        <Link
          key={c.slug}
          href={`/company/${c.slug}`}
          className={`px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] no-underline${
            i < companies.length - 1 && i < 4 ? "" : ""
          }`}
          style={
            i < 4 && i < companies.length - 1
              ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          {/* Rank */}
          <span
            className="text-center font-medium"
            style={{
              fontSize: 12,
              width: 20,
              color: "var(--color-text-tertiary)",
            }}
          >
            {i + 1}
          </span>

          {/* Logo */}
          <CompanyAvatar name={c.name} logoUrl={c.logo_url ?? undefined} website={c.website ?? undefined} size={24} />

          {/* Name + Ticker */}
          <div className="flex flex-col">
            <span
              className="font-medium"
              style={{ fontSize: 13, color: "var(--color-text-primary)" }}
            >
              {c.name}
            </span>
            {c.ticker && (
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                {c.ticker}
              </span>
            )}
          </div>

          {/* Spacer */}
          <span className="flex-1" />

          {/* Market Cap */}
          <span
            className="font-medium text-right"
            style={{ fontSize: 13, color: "var(--color-text-primary)" }}
          >
            {c.valuation != null ? formatMarketCap(c.valuation) : "—"}
          </span>
        </Link>
      ))}
    </div>
  );
}
