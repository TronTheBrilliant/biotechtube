import { Metadata } from "next";
import { PipelinePageClient } from "./PipelinePageClient";

const SITE_URL = 'https://www.biotechtube.io';

export const metadata: Metadata = {
  title: "Biotech Drug Pipeline Tracker — Clinical Trials & Stages | BiotechTube",
  description:
    "Track the global biotech drug pipeline. Active clinical programs across all stages from pre-clinical to Phase 3 and approved drugs.",
  alternates: { canonical: `${SITE_URL}/pipeline` },
  openGraph: {
    title: "Biotech Drug Pipeline Tracker",
    description: "Track the global biotech drug pipeline. Active clinical programs across all stages from pre-clinical to approved.",
    url: `${SITE_URL}/pipeline`,
    siteName: 'BiotechTube',
    type: 'website',
  },
};

export default function PipelinePage() {
  return <PipelinePageClient />;
}
