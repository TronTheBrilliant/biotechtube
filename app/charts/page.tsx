import { Metadata } from "next";
import { ChartsPageClient } from "./ChartsPageClient";
import {
  getMarketCapHistory,
  getSectorDominanceHistory,
  getGeographicDistribution,
  getPublicCompaniesCount,
  getFundingVolumeMonthly,
  getFundingRoundMix,
  getIPOActivity,
  getAverageRoundSize,
  getClinicalTrialStarts,
  getPipelineStageDistribution,
  getFDAApprovalTimeline,
  getFDACalendarDensity,
  getSectorPerformance,
  getSectorMarketCapHistory,
  getHypeIndex,
  getPipelineValueRatio,
  getFundingVelocity,
  getTradingVolumeHistory,
  getExTop50MarketCap,
} from "@/lib/chart-queries";

export const metadata: Metadata = {
  title: "Biotech Market Charts & Indicators | BiotechTube",
  description:
    "20 interactive charts tracking the biotech industry: market cap trends, funding cycles, pipeline analytics, sector performance, and proprietary indicators.",
  openGraph: {
    title: "Biotech Market Charts & Indicators | BiotechTube",
    description:
      "Interactive charts and proprietary indicators for tracking the global biotech market.",
  },
};

export const revalidate = 14400; // 4 hours (19 heavy queries — minimize rebuilds)

export default async function ChartsPage() {
  // Fetch all chart data in parallel
  const [
    marketCapHistory,
    sectorDominance,
    geographicDistribution,
    publicCompaniesCount,
    fundingMonthly,
    fundingRoundMix,
    ipoActivity,
    averageRoundSize,
    clinicalTrialStarts,
    pipelineDistribution,
    fdaApprovals,
    fdaCalendar,
    sectorPerformance,
    sectorMarketCapHistory,
    hypeIndex,
    pipelineValueRatio,
    fundingVelocity,
    tradingVolume,
    exTop50MarketCap,
  ] = await Promise.all([
    getMarketCapHistory(),
    getSectorDominanceHistory(),
    getGeographicDistribution(),
    getPublicCompaniesCount(),
    getFundingVolumeMonthly(),
    getFundingRoundMix(),
    getIPOActivity(),
    getAverageRoundSize(),
    getClinicalTrialStarts(),
    getPipelineStageDistribution(),
    getFDAApprovalTimeline(),
    getFDACalendarDensity(),
    getSectorPerformance(),
    getSectorMarketCapHistory(),
    getHypeIndex(),
    getPipelineValueRatio(),
    getFundingVelocity(),
    getTradingVolumeHistory(),
    getExTop50MarketCap(),
  ]);

  return (
    <ChartsPageClient
      marketCapHistory={marketCapHistory}
      sectorDominance={sectorDominance}
      geographicDistribution={geographicDistribution}
      publicCompaniesCount={publicCompaniesCount}
      fundingMonthly={fundingMonthly}
      fundingRoundMix={fundingRoundMix}
      ipoActivity={ipoActivity}
      averageRoundSize={averageRoundSize}
      clinicalTrialStarts={clinicalTrialStarts}
      pipelineDistribution={pipelineDistribution}
      fdaApprovals={fdaApprovals}
      fdaCalendar={fdaCalendar}
      sectorPerformance={sectorPerformance}
      sectorMarketCapHistory={sectorMarketCapHistory}
      hypeIndex={hypeIndex}
      pipelineValueRatio={pipelineValueRatio}
      fundingVelocity={fundingVelocity}
      tradingVolume={tradingVolume}
      exTop50MarketCap={exTop50MarketCap}
    />
  );
}
