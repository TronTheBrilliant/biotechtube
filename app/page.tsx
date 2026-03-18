import { Nav } from "@/components/Nav";
import { TickerBar } from "@/components/TickerBar";
import { IndexCards } from "@/components/IndexCards";
import { SponsorBar } from "@/components/SponsorBar";
import { SearchBar } from "@/components/SearchBar";
import { FilterPills } from "@/components/FilterPills";
import { InvestmentChart } from "@/components/InvestmentChart";
import { RankingTable } from "@/components/RankingTable";
import { RecentlyFunded } from "@/components/RecentlyFunded";
import { PaywallCard } from "@/components/PaywallCard";
import { UpcomingEvents } from "@/components/UpcomingEvents";
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

      {/* Hero / Index Cards */}
      <IndexCards />

      <SponsorBar />

      {/* Search + Filters */}
      <div className="px-5 py-3">
        <SearchBar />
        <FilterPills />
      </div>

      {/* Two Column Layout */}
      <div
        className="grid border-t"
        style={{
          gridTemplateColumns: "1fr 260px",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Main Content */}
        <div
          className="px-5 min-w-0 border-r"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <InvestmentChart />

          <div className="border-t pt-3 pb-4" style={{ borderColor: "var(--color-border-subtle)" }}>
            <h2
              className="text-10 uppercase tracking-[0.5px] font-medium mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              GLOBAL BIOTECH RANKING
            </h2>
            <RankingTable companies={companies} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[260px]">
          <RecentlyFunded funding={funding} companies={companies} />
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
