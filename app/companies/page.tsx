import { Metadata } from "next";
import { CompaniesPageClient } from "./CompaniesPageClient";

export const metadata: Metadata = {
  title: "Companies — BiotechTube",
  description:
    "Browse the global biotech directory. 14,000+ biotech companies across 58 countries with funding data, pipeline stages, and investor profiles.",
};

export default function CompaniesPage() {
  return <CompaniesPageClient />;
}
