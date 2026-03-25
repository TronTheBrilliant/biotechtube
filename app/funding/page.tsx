import { Suspense } from "react";
import { getAllFundingData } from "@/lib/funding-queries";
import FundingPageClient from "./FundingPageClient";

export const revalidate = 300;

export default async function FundingPage() {
  const { annualData, quarterlyData, monthlyData, rounds, stats, topInvestors, investorStats } =
    await getAllFundingData();

  return (
    <Suspense>
      <FundingPageClient
        annualData={annualData}
        quarterlyData={quarterlyData}
        monthlyData={monthlyData}
        rounds={rounds}
        stats={stats}
        topInvestors={topInvestors}
        investorStats={investorStats}
      />
    </Suspense>
  );
}
