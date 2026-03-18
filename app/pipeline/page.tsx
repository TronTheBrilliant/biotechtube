import { Metadata } from "next";
import { PipelinePageClient } from "./PipelinePageClient";

export const metadata: Metadata = {
  title: "Pipeline — BiotechTube",
  description:
    "Track the global biotech drug pipeline. Active clinical programs across all stages from pre-clinical to approved.",
};

export default function PipelinePage() {
  return <PipelinePageClient />;
}
