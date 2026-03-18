import Link from "next/link";
import { Nav } from "@/components/Nav";
import { IndexCards } from "@/components/IndexCards";
import { SponsorBar } from "@/components/SponsorBar";
import { Footer } from "@/components/Footer";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { HomePageClient } from "@/components/HomePageClient";
import { Company, FundingRound, BiotechEvent } from "@/lib/types";

import companiesData from "@/data/companies.json";
import fundingData from "@/data/funding.json";
import eventsData from "@/data/events.json";

export default function HomePage() {
  const companies = companiesData as Company[];
  const funding = fundingData as FundingRound[];
  const events = eventsData as BiotechEvent[];

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      {/* Hero */}
      <section
        className="px-5 pt-6 pb-5"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        <div className="max-w-[600px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="live-dot" />
            <span
              className="text-10 uppercase tracking-[0.5px] font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              Live biotech intelligence
            </span>
          </div>
          <h1
            className="text-[26px] md:text-[32px] font-medium tracking-tight mb-2"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.6px", lineHeight: 1.15 }}
          >
            Track every biotech company, pipeline, and funding round
          </h1>
          <p
            className="text-13 md:text-14 mb-4"
            style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
          >
            14,000+ companies across 58 countries. Real-time funding data,
            clinical trial tracking, and investment intelligence — built for
            investors and biotech professionals.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/signup"
              className="text-12 font-medium px-4 py-2 rounded text-white"
              style={{ background: "var(--color-accent)" }}
            >
              Start free trial
            </Link>
            <Link
              href="/companies"
              className="text-12 font-medium px-4 py-2 rounded border"
              style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
            >
              Browse companies
            </Link>
          </div>
        </div>
      </section>

      {/* Index Cards */}
      <IndexCards />

      {/* Sponsors bar */}
      <SponsorBar />

      {/* Two Column Layout */}
      <div
        className="flex flex-col lg:grid"
        style={{ gridTemplateColumns: "1fr 260px" }}
      >
        {/* Main Content — Tabs + Filters + Ranking */}
        <div
          className="min-w-0 lg:border-r"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <HomePageClient companies={companies} funding={funding} />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[260px] border-t lg:border-t-0">
          <RecentlyFunded funding={funding} companies={companies} />
          <div className="p-3.5">
            <PaywallCard />
          </div>
          <UpcomingEvents events={events} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
