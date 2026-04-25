import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page not found · 404 | BiotechTube",
  description: "The page you're looking for doesn't exist or has been moved. Browse companies, drugs, sectors, or news on BiotechTube.",
  robots: { index: false, follow: true },
};

const POPULAR_DESTINATIONS: { href: string; label: string; hint: string }[] = [
  { href: "/top-companies", label: "Top Biotech Companies", hint: "Ranked by market cap" },
  { href: "/pipelines", label: "Drug Pipeline", hint: "54K+ drugs in development" },
  { href: "/funding", label: "Funding Intelligence", hint: "Recent deal flow" },
  { href: "/news", label: "Latest News", hint: "AI-powered analysis" },
  { href: "/sectors", label: "Sectors", hint: "20+ therapeutic areas" },
  { href: "/countries", label: "Countries", hint: "Global biotech landscape" },
];

export default function NotFound() {
  return (
    <>
      <Nav />
      <main
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "5rem 1rem 4rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--color-accent)",
              margin: "0 0 8px",
            }}
          >
            404
          </p>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: "0 0 12px",
              letterSpacing: "-0.5px",
            }}
          >
            This page doesn&apos;t exist
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--color-text-secondary)",
              margin: "0 auto 32px",
              maxWidth: 560,
              lineHeight: 1.6,
            }}
          >
            The link may be broken, the page may have moved, or the entity may have been
            consolidated. Try one of the popular destinations below, or search for what
            you need.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 48 }}>
            <Link
              href="/"
              style={{
                padding: "10px 20px",
                background: "var(--color-accent)",
                color: "white",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go home
            </Link>
            <Link
              href="/top-companies"
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid var(--color-border-subtle)",
                color: "var(--color-text-secondary)",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Browse companies
            </Link>
          </div>
        </div>

        {/* Popular destinations — helps users + gives crawlers anchor text */}
        <section>
          <h2
            style={{
              fontSize: 13,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--color-text-tertiary)",
              margin: "0 0 14px",
              textAlign: "center",
            }}
          >
            Popular destinations
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {POPULAR_DESTINATIONS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                  textDecoration: "none",
                  transition: "transform 0.1s",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  {item.hint}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
