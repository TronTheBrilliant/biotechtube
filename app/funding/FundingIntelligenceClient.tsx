"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Newspaper, DollarSign, BarChart3, Users } from "lucide-react";
import type {
  FundingAnnualRow,
  FundingQuarterlyRow,
  FundingMonthlyRow,
  FundingRoundRow,
  FundingStats,
  TopInvestorRow,
  InvestorStats,
} from "@/lib/funding-queries";
import type {
  FundingPulse,
  FundingByRoundType,
  FundingBySector,
  FundingByCountry,
  DealVelocityWeek,
  CoInvestorPair,
} from "@/lib/funding-intelligence-queries";

import { FundingHero } from "./components/FundingHero";
import { FundingNewsTab } from "./components/FundingNewsTab";
import { FundingDealsTab } from "./components/FundingDealsTab";
import FundingChartsTab from "./components/FundingChartsTab";
import { FundingInvestorsTab } from "./components/FundingInvestorsTab";

// ── Types ──

interface Article {
  id: string;
  slug: string;
  headline: string;
  subtitle: string | null;
  body: string;
  company_name: string;
  company_slug: string | null;
  round_type: string | null;
  amount_usd: number | null;
  lead_investor: string | null;
  round_date: string | null;
  sector: string | null;
  country: string | null;
  deal_size_category: string | null;
  article_type: string;
  is_featured: boolean;
  published_at: string;
}

type TabId = "news" | "deals" | "charts" | "investors";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "news", label: "News", icon: <Newspaper size={14} /> },
  { id: "deals", label: "Deals", icon: <DollarSign size={14} /> },
  { id: "charts", label: "Charts", icon: <BarChart3 size={14} /> },
  { id: "investors", label: "Investors", icon: <Users size={14} /> },
];

interface Props {
  annualData: FundingAnnualRow[];
  quarterlyData: FundingQuarterlyRow[];
  monthlyData: FundingMonthlyRow[];
  rounds: FundingRoundRow[];
  fundingStats: FundingStats;
  topInvestors: TopInvestorRow[];
  investorStats: InvestorStats;
  articles: Article[];
  pulse: FundingPulse;
  byRoundType: FundingByRoundType[];
  bySector: FundingBySector[];
  byCountry: FundingByCountry[];
  dealVelocity: DealVelocityWeek[];
  coInvestors: CoInvestorPair[];
}

export function FundingIntelligenceClient({
  annualData,
  quarterlyData,
  monthlyData,
  rounds,
  fundingStats,
  topInvestors: _topInvestors,
  investorStats,
  articles,
  pulse,
  byRoundType,
  bySector,
  byCountry,
  dealVelocity,
  coInvestors,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = searchParams.get("tab");
  const activeTab: TabId =
    rawTab === "deals" || rawTab === "charts" || rawTab === "investors"
      ? rawTab
      : "news";

  const setActiveTab = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "news") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      // Clear deal filters when switching tabs
      if (tab !== "deals") {
        params.delete("round");
        params.delete("date");
        params.delete("country");
        params.delete("amount");
        params.delete("company");
      }
      const qs = params.toString();
      router.replace(`/funding${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router]
  );

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Funding Intelligence" },
            ]}
          />
        </div>

        {/* Hero */}
        <FundingHero pulse={pulse} fundingStats={fundingStats} />

        {/* Tab bar */}
        <div
          className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-6 pb-1 -mx-1 px-1"
          style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 shrink-0 transition-colors"
              style={{
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 500 : 400,
                color: activeTab === tab.id ? "var(--color-accent)" : "var(--color-text-tertiary)",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid var(--color-accent)"
                    : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "news" && (
          <FundingNewsTab articles={articles} pulse={pulse} />
        )}
        {activeTab === "deals" && (
          <FundingDealsTab rounds={rounds} />
        )}
        {activeTab === "charts" && (
          <FundingChartsTab
            annualData={annualData}
            quarterlyData={quarterlyData}
            monthlyData={monthlyData}
            byRoundType={byRoundType}
            bySector={bySector}
            byCountry={byCountry}
            dealVelocity={dealVelocity}
            rounds={rounds}
          />
        )}
        {activeTab === "investors" && (
          <FundingInvestorsTab
            rounds={rounds}
            investorStats={investorStats}
            coInvestors={coInvestors}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
