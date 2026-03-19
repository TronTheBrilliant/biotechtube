import Link from "next/link";
import { Nav } from "@/components/Nav";
import { TickerBar } from "@/components/TickerBar";
import { IndexCards } from "@/components/IndexCards";
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
      <TickerBar />

      {/* Hero — headline + company CTA */}
      <div className="px-5 py-3">
        <h1
          className="text-[26px] font-medium tracking-tight"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Track the biotech market, science, and funding rounds.
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <Link
            href="/companies"
            className="text-13"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            14,000+ companies tracked
          </Link>
          <span className="text-11" style={{ color: "var(--color-border-medium)" }}>·</span>
          <Link
            href="/claim/oncoinvent"
            className="flex items-center gap-1.5 text-13 font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            🏢 Is your company listed? Claim your profile →
          </Link>
        </div>
      </div>

      {/* Index Cards */}
      <IndexCards />

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
