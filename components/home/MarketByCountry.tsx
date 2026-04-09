import Link from "next/link";
import { formatMarketCap, formatPercent, pctColor, capPercent } from "@/lib/market-utils";

const FLAGS: Record<string, string> = {
  "United States": "\u{1F1FA}\u{1F1F8}",
  "United Kingdom": "\u{1F1EC}\u{1F1E7}",
  Switzerland: "\u{1F1E8}\u{1F1ED}",
  Japan: "\u{1F1EF}\u{1F1F5}",
  China: "\u{1F1E8}\u{1F1F3}",
  Denmark: "\u{1F1E9}\u{1F1F0}",
  India: "\u{1F1EE}\u{1F1F3}",
  France: "\u{1F1EB}\u{1F1F7}",
  "South Korea": "\u{1F1F0}\u{1F1F7}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  Belgium: "\u{1F1E7}\u{1F1EA}",
  "South Africa": "\u{1F1FF}\u{1F1E6}",
  Netherlands: "\u{1F1F3}\u{1F1F1}",
  Australia: "\u{1F1E6}\u{1F1FA}",
  Ireland: "\u{1F1EE}\u{1F1EA}",
  Israel: "\u{1F1EE}\u{1F1F1}",
  Canada: "\u{1F1E8}\u{1F1E6}",
  Norway: "\u{1F1F3}\u{1F1F4}",
  Sweden: "\u{1F1F8}\u{1F1EA}",
  "Hong Kong": "\u{1F1ED}\u{1F1F0}",
  Singapore: "\u{1F1F8}\u{1F1EC}",
  Spain: "\u{1F1EA}\u{1F1F8}",
  Italy: "\u{1F1EE}\u{1F1F9}",
  Brazil: "\u{1F1E7}\u{1F1F7}",
  Austria: "\u{1F1E6}\u{1F1F9}",
  Finland: "\u{1F1EB}\u{1F1EE}",
  Taiwan: "\u{1F1F9}\u{1F1FC}",
  Hungary: "\u{1F1ED}\u{1F1FA}",
  "New Zealand": "\u{1F1F3}\u{1F1FF}",
  Poland: "\u{1F1F5}\u{1F1F1}",
  "Saudi Arabia": "\u{1F1F8}\u{1F1E6}",
};

interface Country {
  country: string;
  combinedMarketCap: number | null;
  change1d: number | null;
  publicCompanyCount: number | null;
}

export default function MarketByCountry({
  countries,
}: {
  countries: Country[];
}) {
  return (
    <div>
      {countries.slice(0, 8).map((c, i) => {
        const countrySlug = c.country.toLowerCase().replace(/\s+/g, "-");
        const flag = FLAGS[c.country] ?? "\u{1F3F3}\u{FE0F}";

        return (
          <Link
            key={c.country}
            href={`/countries/${countrySlug}`}
            className="px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] no-underline transition-colors duration-100"
            style={
              i < 7 && i < countries.length - 1
                ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
                : undefined
            }
          >
            {/* Flag + Country Name + Company Count */}
            <div className="flex flex-col min-w-0">
              <span
                className="font-medium"
                style={{ fontSize: 13, color: "var(--color-text-primary)" }}
              >
                {flag} {c.country}
              </span>
              {c.publicCompanyCount != null && (
                <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                  {c.publicCompanyCount} companies
                </span>
              )}
            </div>

            {/* Spacer */}
            <span className="flex-1" />

            {/* 1D Change */}
            <span
              className="font-medium"
              style={{ fontSize: 12, color: pctColor(capPercent(c.change1d, "1d")) }}
            >
              {formatPercent(capPercent(c.change1d, "1d"))}
            </span>

            {/* Market Cap */}
            <span
              className="font-medium text-right"
              style={{
                fontSize: 13,
                color: "var(--color-text-primary)",
                minWidth: 56,
              }}
            >
              {c.combinedMarketCap != null
                ? formatMarketCap(c.combinedMarketCap)
                : "—"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
