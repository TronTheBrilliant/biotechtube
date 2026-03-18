import { Nav } from "@/components/Nav";
import { TickerBar } from "@/components/TickerBar";
import { IndexCards } from "@/components/IndexCards";
import { SponsorBar } from "@/components/SponsorBar";
import { SearchBar } from "@/components/SearchBar";
import { FilterPills } from "@/components/FilterPills";
import { TrendingStrip } from "@/components/TrendingStrip";
import { RankingTable } from "@/components/RankingTable";
import { Footer } from "@/components/Footer";
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

      {/* Trending — right below the ticker */}
      <div className="px-5 pt-2 pb-1">
        <TrendingStrip companies={companies} />
      </div>

      {/* Index Cards */}
      <IndexCards />

      {/* Search + Filters */}
      <div className="px-5 py-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
        <SearchBar />
        <FilterPills />
      </div>

      {/* Sponsors bar — above ranking section */}
      <SponsorBar />

      {/* Two Column Layout */}
      <div
        className="flex flex-col lg:grid border-t"
        style={{
          gridTemplateColumns: "1fr 260px",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Main Content */}
        <div
          className="px-5 min-w-0 lg:border-r"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <div className="pt-3 pb-4">
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
