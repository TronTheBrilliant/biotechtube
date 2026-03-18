import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { PaywallCard } from "@/components/PaywallCard";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { BiotechEvent } from "@/lib/types";
import { Check } from "lucide-react";

import eventsData from "@/data/events.json";

export const metadata: Metadata = {
  title: "Sponsors — BiotechTube",
  description: "Sponsor BiotechTube and reach the global biotech investment community.",
};

const events = eventsData as BiotechEvent[];

const audienceStats = [
  { value: "25K+", label: "Monthly visitors" },
  { value: "68%", label: "Investors & analysts" },
  { value: "58", label: "Countries" },
  { value: "42%", label: "Email open rate" },
];

const tiers = [
  {
    name: "Standard",
    price: "$500",
    period: "/month",
    headerBg: "var(--color-bg-secondary)",
    headerText: "var(--color-text-primary)",
    priceText: "var(--color-text-primary)",
    borderAccent: false,
    ctaBg: "transparent",
    ctaText: "var(--color-text-primary)",
    ctaBorder: "var(--color-border-medium)",
    features: [
      "Logo in sponsor bar",
      "Sponsors page listing",
      "Monthly newsletter mention",
      "Site link",
    ],
  },
  {
    name: "Partner",
    price: "$1,500",
    period: "/month",
    headerBg: "#0a3d2e",
    headerText: "#5DCAA5",
    priceText: "#5DCAA5",
    borderAccent: true,
    ctaBg: "var(--color-accent)",
    ctaText: "white",
    ctaBorder: "var(--color-accent)",
    featured: true,
    features: [
      "Everything in Standard",
      "Homepage feature",
      "Weekly newsletter sponsorship",
      "Co-branded funding report",
      "Category page sponsorship",
    ],
  },
  {
    name: "Platinum",
    price: "$4,000",
    period: "/month",
    headerBg: "#412402",
    headerText: "#EF9F27",
    priceText: "#EF9F27",
    borderAccent: false,
    goldBorder: true,
    ctaBg: "transparent",
    ctaText: "var(--color-text-primary)",
    ctaBorder: "var(--color-border-medium)",
    features: [
      "Everything in Partner",
      "Exclusive category sponsorship",
      "Quarterly industry report",
      "Banner ads",
      "Custom audience data report",
    ],
  },
];

const currentSponsors = [
  { name: "Investinor", type: "Partner" },
  { name: "Nordic Biotech Fund", type: "Standard" },
  { name: "Oslo Cancer Cluster", type: "Standard" },
];

const faqs = [
  {
    q: "Who is your audience?",
    a: "Our audience is 68% investors and analysts, 22% biotech professionals, and 10% biotech companies. Most are based in the Nordics, UK, and US.",
  },
  {
    q: "Can I sponsor a specific category?",
    a: "Yes. Partner and Platinum sponsors can choose a therapeutic category (e.g., Oncology, Immunotherapy) for exclusive or priority placement on that category page.",
  },
  {
    q: "What is the minimum contract length?",
    a: "Standard and Partner tiers are month-to-month with no minimum commitment. Platinum requires a 3-month minimum to allow time for report generation and campaign setup.",
  },
];

export default function SponsorsPage() {
  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* Hero */}
      <div className="px-5 pt-7 pb-5 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
        <span
          className="text-10 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-accent)" }}
        >
          SPONSORSHIP
        </span>
        <h1
          className="text-[24px] font-medium tracking-tight mt-1"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.4px" }}
        >
          Reach the biotech investment community
        </h1>
        <p className="text-13 mt-1" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
          Put your brand in front of 25,000+ monthly visitors — investors, analysts, and biotech professionals actively tracking funding and pipeline data.
        </p>
      </div>

      {/* Two Column Layout */}
      <div
        className="flex flex-col lg:grid border-t"
        style={{
          gridTemplateColumns: "1fr 260px",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Main Content */}
        <div className="px-5 py-4 min-w-0 lg:border-r" style={{ borderColor: "var(--color-border-subtle)" }}>

          {/* Audience Stats */}
          <section className="mb-6">
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              OUR AUDIENCE
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {audienceStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-md px-3 py-3 border text-center"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                >
                  <div
                    className="text-[20px] font-medium tracking-tight mb-[2px]"
                    style={{ color: "var(--color-accent)", letterSpacing: "-0.5px" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-10" style={{ color: "var(--color-text-secondary)" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sponsorship Tiers */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              SPONSORSHIP TIERS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-lg overflow-hidden border"
                  style={{
                    borderColor: tier.borderAccent
                      ? "var(--color-accent)"
                      : tier.goldBorder
                      ? "#EF9F27"
                      : "var(--color-border-subtle)",
                  }}
                >
                  {/* Header */}
                  <div className="px-4 py-3.5" style={{ background: tier.headerBg }}>
                    <div
                      className="text-13 font-medium"
                      style={{ color: tier.headerText }}
                    >
                      {tier.name}
                    </div>
                    <div className="mt-1">
                      <span
                        className="text-[20px] font-medium tracking-tight"
                        style={{ color: tier.priceText, letterSpacing: "-0.5px" }}
                      >
                        {tier.price}
                      </span>
                      <span
                        className="text-11 ml-0.5"
                        style={{ color: tier.headerBg === "var(--color-bg-secondary)" ? "var(--color-text-secondary)" : "rgba(255,255,255,0.6)" }}
                      >
                        {tier.period}
                      </span>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="px-4 py-3.5" style={{ background: "var(--color-bg-primary)" }}>
                    <div className="flex flex-col">
                      {tier.features.map((f) => (
                        <div
                          key={f}
                          className="flex items-center gap-1.5 py-1 border-b text-11"
                          style={{
                            color: "var(--color-text-secondary)",
                            borderColor: "var(--color-border-subtle)",
                          }}
                        >
                          <Check size={12} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                          {f}
                        </div>
                      ))}
                    </div>
                    <button
                      className="w-full mt-3 py-2 rounded text-12 font-medium border transition-colors duration-150"
                      style={{
                        background: tier.ctaBg,
                        color: tier.ctaText,
                        borderColor: tier.ctaBorder,
                        borderWidth: "0.5px",
                      }}
                    >
                      Get started
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Current Sponsors */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              CURRENT SPONSORS
            </h2>
            <div className="flex flex-wrap gap-2">
              {currentSponsors.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border"
                  style={{
                    borderColor: s.type === "Partner" ? "var(--color-accent)" : "var(--color-border-subtle)",
                    background: "var(--color-bg-secondary)",
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-medium"
                    style={{
                      background: s.type === "Partner" ? "#0a3d2e" : "var(--color-bg-tertiary)",
                      color: s.type === "Partner" ? "#5DCAA5" : "var(--color-text-secondary)",
                    }}
                  >
                    {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-11 font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {s.name}
                    </div>
                    <div className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                      {s.type} sponsor
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-6 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <div className="flex flex-col gap-3">
              {faqs.map((faq) => (
                <div key={faq.q} className="border-b pb-3" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <div
                    className="text-13 font-medium mb-1"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {faq.q}
                  </div>
                  <p className="text-12" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          <div className="p-3.5">
            <PaywallCard />
          </div>
          <UpcomingEvents events={events} />
        </div>
      </div>

      {/* Footer */}
      <footer
        className="flex items-center justify-center h-10 border-t text-10"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        BiotechTube &copy; 2026 &middot; Global Biotech Intelligence
      </footer>
    </div>
  );
}
