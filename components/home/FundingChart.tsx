"use client";

import { FundingBarChart } from "@/components/charts/FundingBarChart";

interface FundingPoint {
  label: string;
  amount: number;
}

export default function FundingChart({ data }: { data: FundingPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: 200, color: "var(--color-text-tertiary)", fontSize: 13 }}
      >
        No funding data available
      </div>
    );
  }

  return (
    <div>
      <p
        className="text-12 mb-2"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Total: $59.7B tracked since 2020
      </p>
      <FundingBarChart data={data} height={200} />
    </div>
  );
}
