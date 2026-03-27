import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";

export const metadata: Metadata = {
  title: "Newsletter — BiotechTube",
  description:
    "Get weekly biotech market insights, funding round alerts, and FDA decision updates delivered free to your inbox.",
  alternates: {
    canonical: "https://biotechtube.io/newsletter",
  },
};

const features = [
  {
    icon: "📊",
    title: "Weekly Market Recap",
    description:
      "A concise summary of biotech market movements, top gainers and losers, and sector performance across 30+ countries.",
  },
  {
    icon: "💰",
    title: "Funding Round Alerts",
    description:
      "Be the first to know about major Series A through IPO funding rounds, with deal size, lead investors, and company context.",
  },
  {
    icon: "🏥",
    title: "FDA Decision Updates",
    description:
      "Track approvals, rejections, and advisory committee meetings that move biotech stocks and shape the industry.",
  },
  {
    icon: "🔬",
    title: "Company Spotlight Features",
    description:
      "Deep dives into noteworthy biotech companies — from early-stage disruptors to large-cap pharma making strategic moves.",
  },
];

export default function NewsletterPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-[680px] mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <span
            className="text-11 font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Newsletter
          </span>
          <h1
            className="text-[28px] md:text-[36px] font-semibold mt-2 mb-3 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Stay Ahead in Biotech
          </h1>
          <p
            className="text-[15px] max-w-[480px] mx-auto"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            Join thousands of biotech professionals who get our free weekly newsletter.
            No noise, just the data and insights that matter.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <div className="text-[20px] mb-2">{f.icon}</div>
              <h3
                className="text-[14px] font-semibold mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                {f.title}
              </h3>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Subscribe section */}
        <NewsletterSignup source="newsletter-page" />

        {/* Trust line */}
        <p
          className="text-center text-[12px] mt-6"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          We&apos;ll never spam you. Unsubscribe anytime.
        </p>
      </main>

      <Footer />
    </div>
  );
}
