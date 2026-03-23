import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Biotech Job Board — BiotechTube",
  description:
    "Track open positions across 700+ biotech companies worldwide. Filter by role, therapeutic area, location, and company stage.",
};

const features = [
  {
    emoji: "\uD83C\uDFE2",
    title: "700+ Companies",
    description:
      "Positions from startups to large-cap pharma across 30+ countries.",
  },
  {
    emoji: "\uD83C\uDFAF",
    title: "Role Matching",
    description:
      "Filter by role type, therapeutic area, location, and company stage.",
  },
  {
    emoji: "\uD83D\uDD14",
    title: "Job Alerts",
    description:
      "Get notified when new positions match your profile and interests.",
  },
];

export default function JobsPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <span
            className="text-11 font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Jobs
          </span>
          <h1
            className="text-[32px] font-medium mt-2 mb-3 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Biotech Job Board
          </h1>
          <p
            className="text-13 leading-relaxed max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Track open positions across 700+ biotech companies worldwide.
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
