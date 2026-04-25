import { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Building2, Megaphone, Code, FileText } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pricing — BiotechTube",
  description:
    "Simple, transparent pricing for biotech intelligence. Free explorer access, Pro for investors and analysts, Enterprise for institutions.",
  alternates: {
    canonical: "https://biotechtube.io/pricing",
  },
};

const tiers = [
  {
    name: "Explorer",
    price: "Free",
    period: "",
    description: "Get started with biotech intelligence",
    features: [
      "Browse 14,000+ company profiles",
      "Pipeline and market data",
      "Basic company search",
      "Therapeutic area overviews",
      "1 watchlist (up to 10 items)",
      "100 API requests/day",
    ],
    cta: "Get Started",
    ctaHref: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For investors, analysts, and BD professionals",
    features: [
      "Everything in Explorer",
      "Unlimited watchlists & alerts",
      "Product email alerts",
      "Full intelligence reports",
      "Full AI-powered company reports",
      "10,000 API requests/day",
      "Export data (CSV)",
      "People & investor intelligence",
      "Priority access to new features",
    ],
    cta: "Upgrade",
    ctaHref: "/signup",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/mo",
    description: "For funds, institutions, and pharma teams",
    features: [
      "Everything in Pro",
      "Unlimited API access",
      "Bulk data export (CSV/JSON)",
      "Custom intelligence reports",
      "Webhook notifications",
      "Dedicated account manager",
      "Unlimited team seats",
      "SSO & compliance controls",
      "Priority support",
    ],
    cta: "Contact Us",
    ctaHref: "mailto:hello@biotechtube.io",
    highlighted: false,
  },
];

const faqItems: { q: string; a: string }[] = [
  {
    q: "Is BiotechTube free to use?",
    a: "Yes. The Explorer tier is free forever and gives you access to 14,000+ company profiles, drug pipeline data, market snapshots, and daily news. Pro and Enterprise tiers unlock additional features like unlimited API calls, CSV exports, and portfolio tracking.",
  },
  {
    q: "How many biotech companies does BiotechTube track?",
    a: "We currently track over 14,000 biotech and pharma companies globally, including 1,000+ public companies with daily stock prices, 54,000+ drug pipeline programs, and comprehensive funding and clinical trial data.",
  },
  {
    q: "Do you offer API access?",
    a: "Yes. The Explorer tier includes 100 API requests per day. Pro tier increases this to 10,000/day for $29/mo. Enterprise offers unlimited access with custom SLAs.",
  },
  {
    q: "How often is the data updated?",
    a: "Stock prices and market data are updated daily. Pipeline, funding round, and company profile data is updated continuously as new information becomes available from primary sources like SEC filings, ClinicalTrials.gov, and press releases.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. All paid subscriptions can be cancelled at any time directly from your account settings. You'll retain access through the end of your current billing period.",
  },
];

export default function PricingPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <span
            className="text-11 font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            Pricing
          </span>
          <h1
            className="text-[36px] font-medium mt-2 mb-3 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Simple, transparent pricing
          </h1>
          <p
            className="text-15 max-w-xl mx-auto"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
          >
            Whether you&apos;re exploring the biotech landscape or running a fund,
            we have a plan that fits. Start free, upgrade when you need more.
          </p>
        </div>

        {/* Pricing tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "var(--color-bg-primary)",
                border: tier.highlighted
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-border-subtle)",
                position: "relative",
              }}
            >
              {tier.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-medium text-white px-3 py-0.5 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                >
                  Most popular
                </div>
              )}

              <div className="mb-5">
                <h3
                  className="text-[14px] font-medium mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[36px] font-semibold tracking-tight"
                    style={{ color: "var(--color-text-primary)", letterSpacing: "-1px" }}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {tier.period}
                    </span>
                  )}
                </div>
                <p className="text-[13px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                  {tier.description}
                </p>
              </div>

              <ul className="flex-1 flex flex-col gap-2.5 mb-6">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px]"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Check
                      size={15}
                      className="shrink-0 mt-0.5"
                      style={{ color: "var(--color-accent)" }}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-medium transition-opacity duration-150"
                style={{
                  background: tier.highlighted ? "var(--color-accent)" : "var(--color-bg-secondary)",
                  color: tier.highlighted ? "#fff" : "var(--color-text-primary)",
                  border: tier.highlighted ? "none" : "1px solid var(--color-border-subtle)",
                }}
              >
                {tier.cta}
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        {/* For Companies */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2
              className="text-[24px] font-medium tracking-tight"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}
            >
              For Companies
            </h2>
            <p className="text-14 mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Get more from your BiotechTube profile
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Claim profile */}
            <div
              className="rounded-xl p-6"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--color-bg-tertiary)" }}
                >
                  <Building2 size={20} style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <h3
                    className="text-[15px] font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Claim your profile
                  </h3>
                  <span
                    className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
                  >
                    From $299/mo
                  </span>
                </div>
              </div>
              <p
                className="text-[13px] mb-4"
                style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
              >
                Verify ownership of your company profile, update your pipeline data,
                add team members, and respond to investor inquiries directly through BiotechTube.
              </p>
              <Link
                href="/claim"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg text-white"
                style={{ background: "var(--color-accent)" }}
              >
                Claim Profile <ArrowRight size={13} />
              </Link>
            </div>

            {/* Sponsored listing */}
            <div
              className="rounded-xl p-6"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--color-bg-tertiary)" }}
                >
                  <Megaphone size={20} style={{ color: "var(--color-accent)" }} />
                </div>
                <div>
                  <h3
                    className="text-[15px] font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Product Sponsorship
                  </h3>
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    From $499/mo
                  </span>
                </div>
              </div>
              <p
                className="text-[13px] mb-4"
                style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
              >
                Get featured placement for your products in search results, product pages,
                and pipeline listings. Drive visibility with a subtle &ldquo;Sponsored&rdquo; badge.
              </p>
              <Link
                href="/sponsor-product"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                Learn more <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Products */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2
              className="text-[24px] font-medium tracking-tight"
              style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}
            >
              Additional Products
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Intelligence Reports */}
            <div
              className="rounded-xl p-6"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                  <FileText size={20} style={{ color: "#6366f1" }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                    Intelligence Reports
                  </h3>
                  <span className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    Included in Pro
                  </span>
                </div>
              </div>
              <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                AI-generated competitive landscape reports for every major therapeutic area.
                Phase distribution, funding trends, and company analysis.
              </p>
              <Link href="/reports" className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#6366f1" }}>
                Browse reports <ArrowRight size={13} />
              </Link>
            </div>

            {/* API Access */}
            <div
              className="rounded-xl p-6"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                  <Code size={20} style={{ color: "#6366f1" }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                    API Access
                  </h3>
                  <span className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    From Free to $499/mo
                  </span>
                </div>
              </div>
              <p className="text-[13px] mb-4" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                Programmatic access to biotech market data. Build dashboards and integrate
                company, pipeline, funding, and market data into your tools.
              </p>
              <Link href="/api-docs" className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#6366f1" }}>
                API documentation <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ — visible content matching the FAQPage JSON-LD schema */}
        <section className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-[24px] md:text-[28px] font-semibold mb-6 text-center" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}>
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-4">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="rounded-xl p-5 group"
                style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
              >
                <summary
                  className="cursor-pointer text-[15px] font-medium list-none flex items-center justify-between"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <span>{item.q}</span>
                  <span className="ml-4 text-[13px] group-open:rotate-45 transition-transform" style={{ color: "var(--color-text-tertiary)" }}>+</span>
                </summary>
                <p className="text-[14px] mt-3 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
