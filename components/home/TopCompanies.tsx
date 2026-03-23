import Link from "next/link";
import { formatMarketCap } from "@/lib/market-utils";

interface Company {
  slug: string;
  name: string;
  ticker: string | null;
  country: string | null;
  valuation: number | null;
  logo_url: string | null;
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
          {c.logo_url ? (
            <img
              src={c.logo_url}
              alt={c.name}
              width={24}
              height={24}
              className="rounded-full"
              style={{ width: 24, height: 24, objectFit: "cover" }}
            />
          ) : (
            <span
              className="rounded-full flex items-center justify-center font-medium"
              style={{
                width: 24,
                height: 24,
                fontSize: 11,
                backgroundColor: "var(--color-bg-tertiary)",
                color: "var(--color-text-secondary)",
              }}
            >
              {c.name.charAt(0)}
            </span>
          )}

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
