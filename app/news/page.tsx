import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";
import { NewsClient } from "./NewsClient";

export const metadata: Metadata = {
  title: "News — BiotechTube",
  description:
    "AI-curated biotech news: FDA decisions, funding rounds, acquisitions, and pipeline updates.",
};

export default async function NewsPage() {
  const supabase = createServerClient();

  const { data: items, error } = await supabase
    .from("news_items")
    .select(
      "id, title, source_name, source_url, published_date, summary, companies_mentioned, category, scraped_at"
    )
    .order("scraped_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to fetch news_items:", error.message);
  }

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-accent)",
              display: "block",
              marginBottom: 8,
            }}
          >
            News
          </span>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.5px",
              color: "var(--color-text-primary)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Biotech intelligence feed
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-text-secondary)",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            {items?.length ?? 0} stories — FDA decisions, funding rounds, acquisitions, and
            pipeline updates.
          </p>
        </div>

        {/* News feed with filter tabs */}
        <NewsClient items={items ?? []} />
      </main>

      <Footer />
    </div>
  );
}
