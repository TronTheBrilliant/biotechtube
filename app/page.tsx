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

      {/* Hero — compact strip */}
      <section
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 px-5 py-3 max-h-none md:max-h-[80px]"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="live-dot" />
            <span
              className="text-10 uppercase tracking-[0.5px] font-medium whitespace-nowrap"
              style={{ color: "var(--color-accent)" }}
            >
              Live biotech intelligence
            </span>
          </div>
          <h1
            className="text-[18px] font-medium tracking-tight line-clamp-2 md:line-clamp-1"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.3px", lineHeight: 1.3 }}
          >
            Track every biotech company, pipeline, and funding round
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/signup"
            className="text-12 font-medium px-4 py-2 rounded text-white whitespace-nowrap"
            style={{ background: "var(--color-accent)" }}
          >
            Start free trial
          </Link>
          <Link
            href="/companies"
            className="text-12 font-medium whitespace-nowrap"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Browse companies
          </Link>
        </div>
      </section>

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
