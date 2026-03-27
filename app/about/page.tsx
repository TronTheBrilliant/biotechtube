import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";

export const metadata: Metadata = {
  title: "About — BiotechTube",
  description:
    "Track $7.5T+ in biotech market cap. Company profiles, drug pipelines, funding data, and market analysis for 11,000+ biotech companies worldwide. Free.",
  alternates: {
    canonical: "https://biotechtube.io/about",
  },
};

const stats = [
  { value: "11,000+", label: "Companies tracked" },
  { value: "1,039", label: "Public companies" },
  { value: "200K+", label: "Data points" },
  { value: "30+", label: "Countries covered" },
];

const differentiators = [
  {
    title: "Free & Open",
    description:
      "No paywall for core data. Every biotech professional deserves access to market intelligence, regardless of budget.",
  },
  {
    title: "Comprehensive",
    description:
      "From pre-seed startups to trillion-dollar pharma. We track the full biotech ecosystem across every therapeutic area and geography.",
  },
  {
    title: "Data-Driven",
    description:
      "Real-time stock prices, historical market cap data, funding round tracking, and pipeline analytics updated daily.",
  },
];

const pillars = [
  {
    title: "For Investors",
    description:
      "Screen 11,000+ biotech companies, track funding rounds in real time, and analyze market trends to stay ahead of the market.",
  },
  {
    title: "For Companies",
    description:
      "Showcase your pipeline, attract investors, and benchmark against peers with detailed company profiles and competitive analytics.",
  },
  {
    title: "For Researchers",
    description:
      "Explore therapeutic landscapes, discover collaboration opportunities, and stay current on clinical trial progress across every indication.",
  },
];

export default function AboutPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-[800px] mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-10">
          <span
            className="text-11 font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            About
          </span>
          <h1
            className="text-[32px] md:text-[40px] font-semibold mt-2 mb-6 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            The Bloomberg Terminal for Biotech, but Free
          </h1>

          <p
            className="text-[15px] leading-relaxed mb-4"
            style={{ color: "var(--color-text-secondary)" }}
          >
            BiotechTube is the definitive intelligence platform for the global
            biotechnology industry. We track over 11,000 companies across every
            therapeutic area, development stage, and geography — giving investors,
            executives, and researchers the data they need to make informed decisions.
            Our mission is to democratize biotech market intelligence and make it
            accessible to everyone.
          </p>
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            From early-stage startups to large-cap pharma, BiotechTube provides
            comprehensive company profiles, real-time market data, drug pipeline
            tracking, funding round analytics, and FDA approval monitoring. Whether
            you are sourcing deals, monitoring competitors, or exploring the
            therapeutic landscape, our platform delivers the depth and breadth of
            coverage the biotech ecosystem demands — completely free.
          </p>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg p-5 text-center"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <div
                className="text-[24px] md:text-[28px] font-bold"
                style={{ color: "var(--color-accent)" }}
              >
                {s.value}
              </div>
              <div
                className="text-[12px] mt-1"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* What makes us different */}
        <h2
          className="text-[20px] font-semibold mb-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          What Makes Us Different
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {differentiators.map((d) => (
            <div
              key={d.title}
              className="rounded-lg p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <h3
                className="text-[14px] font-semibold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                {d.title}
              </h3>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {d.description}
              </p>
            </div>
          ))}
        </div>

        {/* Who it's for */}
        <h2
          className="text-[20px] font-semibold mb-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          Built For
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="rounded-lg p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <h3
                className="text-[14px] font-semibold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                {p.title}
              </h3>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {p.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div
          className="rounded-xl p-6 mb-10 relative overflow-hidden"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: "linear-gradient(90deg, var(--color-accent), #6366f1, #8b5cf6)",
            }}
          />
          <h2
            className="text-[18px] font-semibold mb-3"
            style={{ color: "var(--color-text-primary)" }}
          >
            Our Mission
          </h2>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            The biotech industry is shaping the future of human health, yet market
            intelligence remains fragmented and expensive. BiotechTube exists to
            change that. We believe that transparent, accessible data accelerates
            innovation — helping capital flow to the right companies, researchers find
            the right collaborators, and patients benefit from faster drug development.
          </p>
        </div>

        {/* Team */}
        <div
          className="rounded-lg p-6 mb-10"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <h2
            className="text-[18px] font-semibold mb-3"
            style={{ color: "var(--color-text-primary)" }}
          >
            The Team
          </h2>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Built by biotech enthusiasts who believe market intelligence should be
            free and accessible. We combine deep domain expertise in biotechnology
            with modern data engineering to deliver a platform the industry deserves.
          </p>
        </div>

        {/* Contact */}
        <div
          className="rounded-lg p-6"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <h2
            className="text-[18px] font-semibold mb-3"
            style={{ color: "var(--color-text-primary)" }}
          >
            Contact Us
          </h2>
          <p
            className="text-[13px] mb-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            General inquiries:{" "}
            <span style={{ color: "var(--color-accent)" }}>hello@biotechtube.com</span>
          </p>
          <p
            className="text-[13px] mb-1"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Press:{" "}
            <span style={{ color: "var(--color-accent)" }}>press@biotechtube.com</span>
          </p>
          <p
            className="text-[13px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Partnerships:{" "}
            <span style={{ color: "var(--color-accent)" }}>partners@biotechtube.com</span>
          </p>
        </div>

        {/* Newsletter */}
        <div className="mt-10">
          <NewsletterSignup source="about-page" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
