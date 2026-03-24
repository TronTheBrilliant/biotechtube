import { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Megaphone, TrendingUp, Eye, BarChart3, Zap } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Sponsor a Product — BiotechTube",
  description:
    "Get premium placement for your biotech product on BiotechTube. Reach investors, analysts, and industry professionals with sponsored listings.",
};

const benefits = [
  {
    icon: Eye,
    title: "Premium Placement",
    description:
      "Your product appears at the top of product listings and pipeline pages, ahead of organic results.",
  },
  {
    icon: TrendingUp,
    title: "Increased Visibility",
    description:
      "Highlighted badge draws attention from investors, analysts, and potential partners actively researching the space.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track impressions, click-through rates, and engagement metrics for your sponsored listing.",
  },
  {
    icon: Zap,
    title: "Targeted Reach",
    description:
      "Your product is shown to users browsing relevant therapeutic areas, stages, and competitor products.",
  },
];

const plans = [
  {
    name: "Basic",
    price: "$499",
    period: "/mo",
    description: "Essential visibility for pipeline products",
    features: [
      "Sponsored badge on product listings",
      "Top placement on /products page",
      "Top placement on /pipelines page",
      "Monthly performance report",
      "Cancel anytime",
    ],
    highlighted: false,
  },
  {
    name: "Premium",
    price: "$999",
    period: "/mo",
    description: "Maximum exposure and premium positioning",
    features: [
      "Everything in Basic",
      "Highlighted card with gradient border",
      "Featured on therapeutic area pages",
      "Featured on product detail pages",
      "Weekly performance reports",
      "Dedicated account manager",
      "Custom badge messaging",
    ],
    highlighted: true,
  },
];

const faqs = [
  {
    q: "How does the Sponsored badge look?",
    a: "A subtle, clearly labeled badge appears next to your product. It is designed to be visible but not intrusive, similar to how Google Ads labels sponsored results.",
  },
  {
    q: "Can I sponsor multiple products?",
    a: "Yes. Each product requires its own sponsorship plan. Volume discounts are available for 3+ products.",
  },
  {
    q: "What metrics do I get?",
    a: "You will receive impression counts, click-through rates, unique viewers, and engagement data segmented by user type (investor, analyst, BD professional).",
  },
  {
    q: "How quickly does it go live?",
    a: "Sponsorships are activated within 24 hours of payment confirmation. Your product will immediately appear in premium positions.",
  },
  {
    q: "Can I pause or cancel?",
    a: "Yes. You can pause or cancel your sponsorship at any time. Billing is monthly with no long-term commitment required.",
  },
];

export default function SponsorProductPage() {
  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium mb-4"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
          >
            <Megaphone size={14} />
            Product Sponsorship
          </div>
          <h1
            className="text-[36px] md:text-[48px] font-bold tracking-tight mb-3"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-1px" }}
          >
            Put your product in front of
            <br />
            biotech decision-makers
          </h1>
          <p
            className="text-[16px] max-w-2xl mx-auto"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
          >
            BiotechTube is where investors, analysts, and BD professionals discover
            new drugs, devices, and therapies. Sponsored listings give your product
            premium placement across the platform.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-14">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="rounded-xl p-5"
                style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "rgba(99,102,241,0.1)" }}
                >
                  <Icon size={20} style={{ color: "#6366f1" }} />
                </div>
                <h3
                  className="text-[15px] font-semibold mb-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {b.title}
                </h3>
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  {b.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Pricing */}
        <div className="text-center mb-8">
          <h2
            className="text-[28px] font-bold tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Simple pricing
          </h2>
          <p className="text-[14px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
            No setup fees. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto mb-14">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "var(--color-bg-primary)",
                border: plan.highlighted
                  ? "2px solid #6366f1"
                  : "1px solid var(--color-border-subtle)",
                position: "relative",
              }}
            >
              {plan.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-medium text-white px-3 py-0.5 rounded-full"
                  style={{ background: "#6366f1" }}
                >
                  Recommended
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-[14px] font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[36px] font-semibold tracking-tight"
                    style={{ color: "var(--color-text-primary)", letterSpacing: "-1px" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-[14px]" style={{ color: "var(--color-text-tertiary)" }}>
                    {plan.period}
                  </span>
                </div>
                <p className="text-[13px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                  {plan.description}
                </p>
              </div>

              <ul className="flex-1 flex flex-col gap-2.5 mb-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px]"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Check size={15} className="shrink-0 mt-0.5" style={{ color: "#6366f1" }} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="mailto:hello@biotechtube.com?subject=Product Sponsorship Inquiry"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-medium transition-opacity"
                style={{
                  background: plan.highlighted ? "#6366f1" : "var(--color-bg-secondary)",
                  color: plan.highlighted ? "#fff" : "var(--color-text-primary)",
                  border: plan.highlighted ? "none" : "1px solid var(--color-border-subtle)",
                }}
              >
                Get started <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mb-14">
          <h2 className="text-[24px] font-bold tracking-tight text-center mb-8" style={{ color: "var(--color-text-primary)" }}>
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { step: "1", title: "Choose a plan", desc: "Select Basic or Premium based on the visibility you need." },
              { step: "2", title: "Submit your product", desc: "Tell us which product to sponsor and we handle the rest." },
              { step: "3", title: "Go live", desc: "Your product appears in premium positions within 24 hours." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-[16px] font-bold"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}
                >
                  {s.step}
                </div>
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                  {s.title}
                </h3>
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto mb-14">
          <h2 className="text-[24px] font-bold tracking-tight text-center mb-8" style={{ color: "var(--color-text-primary)" }}>
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-lg p-4"
                style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-subtle)" }}
              >
                <h3 className="text-[14px] font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                  {faq.q}
                </h3>
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))", border: "1px solid rgba(99,102,241,0.2)" }}
        >
          <h2 className="text-[24px] font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Ready to sponsor your product?
          </h2>
          <p className="text-[14px] mb-5" style={{ color: "var(--color-text-secondary)" }}>
            Contact us to get started. We will help you choose the right plan and set up your listing.
          </p>
          <Link
            href="mailto:hello@biotechtube.com?subject=Product Sponsorship Inquiry"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-[14px] font-medium text-white transition-opacity"
            style={{ background: "#6366f1" }}
          >
            Contact us <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
