import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Top 100 Science Papers in Biotech — BiotechTube",
  description:
    "The most impactful biotech research papers of all time, ranked by citations and real-world impact.",
};

const features = [
  {
    emoji: "\uD83D\uDD2C",
    title: "Citation Rankings",
    description:
      "Papers ranked by total citations across PubMed, Scopus, and Google Scholar.",
  },
  {
    emoji: "\uD83D\uDC8A",
    title: "Real-world Impact",
    description:
      "Discoveries that led to approved drugs, therapies, and diagnostic tools.",
  },
  {
    emoji: "\uD83E\uDDEC",
    title: "All Biotech Fields",
    description:
      "Covering oncology, immunology, gene therapy, CRISPR, mRNA, and more.",
  },
];

export default function PapersPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <span
            className="text-11 font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Papers
          </span>
          <h1
            className="text-[32px] font-medium mt-2 mb-3 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Top 100 Science Papers
          </h1>
          <p
            className="text-13 leading-relaxed max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            We&apos;re curating the most impactful biotech research papers of all
            time — ranked by citations, real-world impact, and industry
            influence.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <div className="text-xl mb-3">{f.emoji}</div>
              <h3
                className="text-13 font-medium mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                {f.title}
              </h3>
              <p
                className="text-12 leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="rounded-lg p-6 text-center"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <p
            className="text-13 font-medium mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Get notified when it launches
          </p>
          <Link
            href="/signup"
            className="inline-block text-13 font-medium px-4 py-2 rounded text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Notify me
          </Link>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-13 font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            &larr; Back to home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
