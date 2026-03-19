import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PaywallCard } from "@/components/PaywallCard";

export const metadata: Metadata = {
  title: "About — BiotechTube",
  description:
    "Learn about BiotechTube, the leading platform for biotech company intelligence, funding data, and investor tools.",
};

const pillars = [
  {
    title: "For Investors",
    description:
      "Screen 14,000+ biotech companies, track funding rounds in real time, and get AI-powered investment insights to stay ahead of the market.",
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
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <span
              className="text-11 font-medium uppercase tracking-wider"
              style={{ color: "var(--color-accent)" }}
            >
              About
            </span>
            <h1
              className="text-[32px] font-medium mt-2 mb-6 tracking-tight"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
            >
              Built for the biotech community
            </h1>

            <p
              className="text-13 leading-relaxed mb-4"
              style={{ color: "var(--color-text-secondary)" }}
            >
              BiotechTube is the definitive intelligence platform for the global
              biotechnology industry. We track over 14,000 companies across
              every therapeutic area, stage, and geography, giving investors,
              executives, and researchers the data they need to make informed
              decisions. Our mission is to make biotech market intelligence
              accessible, transparent, and actionable.
            </p>
            <p
              className="text-13 leading-relaxed mb-10"
              style={{ color: "var(--color-text-secondary)" }}
            >
              From early-stage startups to large-cap pharma, BiotechTube
              provides comprehensive company profiles, real-time funding data,
              pipeline tracking, and AI-powered analytics. Whether you are
              sourcing deals, monitoring competitors, or exploring the
              therapeutic landscape, our platform delivers the depth and breadth
              of coverage the biotech ecosystem demands.
            </p>

            {/* Pillar cards */}
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
                    className="text-13 font-medium mb-2"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {p.title}
                  </h3>
                  <p
                    className="text-12 leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {p.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div
              className="rounded-lg p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <h2
                className="text-15 font-medium mb-3"
                style={{ color: "var(--color-text-primary)" }}
              >
                Contact us
              </h2>
              <p
                className="text-13 mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                General inquiries:{" "}
                <span style={{ color: "var(--color-accent)" }}>
                  hello@biotechtube.com
                </span>
              </p>
              <p
                className="text-13 mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Press:{" "}
                <span style={{ color: "var(--color-accent)" }}>
                  press@biotechtube.com
                </span>
              </p>
              <p
                className="text-13"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Partnerships:{" "}
                <span style={{ color: "var(--color-accent)" }}>
                  partners@biotechtube.com
                </span>
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[260px] shrink-0">
            <PaywallCard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
