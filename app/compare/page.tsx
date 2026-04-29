import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompareView } from "@/components/compare/CompareView";
import { CompareEmptyState } from "@/components/compare/CompareEmptyState";

export const revalidate = 600; // 10 min

export const metadata: Metadata = {
  title: "Compare biotech companies side by side — BiotechTube",
  description:
    "Compare up to three biotech companies side by side: market cap, daily change, stage, total raised, employees, sector focus. Free, no login.",
  alternates: { canonical: "https://biotechtube.io/compare" },
};

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

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function fetchCompanies(slugs: string[]): Promise<ComparedCompany[]> {
  if (slugs.length === 0) return [];
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("companies")
    .select(
      "slug, name, ticker, country, city, founded, description, domain, logo_url, valuation, total_raised, employee_range, stage, company_type, categories"
    )
    .in("slug", slugs);
  if (error || !data) return [];

  // Preserve URL-order so the user-chosen left-to-right sequence is honored.
  const order = new Map(slugs.map((s, i) => [s, i]));
  return (data as ComparedCompany[])
    .slice()
    .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { slugs?: string };
}) {
  const requestedSlugs = (searchParams.slugs ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const companies = await fetchCompanies(requestedSlugs);

  return (
    <div
      className="page-content"
      style={{ minHeight: "100vh", background: "var(--color-bg-secondary)" }}
    >
      <Nav />
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 pt-8 md:pt-10 pb-16">
        <header className="mb-6 md:mb-8">
          <span
            className="block mb-2 font-semibold uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.5px",
              color: "var(--color-text-tertiary)",
            }}
          >
            Compare
          </span>
          <h1
            className="text-display-sm"
            style={{ color: "var(--color-text-primary)", margin: 0 }}
          >
            Side-by-side biotech comparison.
          </h1>
          <p
            className="mt-2 max-w-[640px]"
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              lineHeight: 1.55,
            }}
          >
            Pull two or three companies into the same view. Market cap, stage,
            funding, country, focus. Share the URL with a colleague.
          </p>
        </header>

        {companies.length === 0 ? (
          <CompareEmptyState />
        ) : (
          <CompareView companies={companies} />
        )}
      </main>
      <Footer />
    </div>
  );
}
