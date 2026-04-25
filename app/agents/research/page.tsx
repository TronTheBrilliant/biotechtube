import type { Metadata } from "next";
import { ResearchChatClient } from "./ResearchChatClient";

export const metadata: Metadata = {
  title: "Ask BiotechTube — AI Research Assistant",
  description:
    "Ask the BiotechTube AI analyst questions about biotech companies, drugs, sectors, funding, and clinical trials. Powered by DeepSeek V4, grounded in BiotechTube data.",
  alternates: { canonical: "https://biotechtube.io/agents/research" },
  openGraph: {
    title: "Ask BiotechTube — AI Research Assistant",
    description:
      "Public AI analyst for biotech research. Grounded answers with source links.",
    type: "website",
    siteName: "BiotechTube",
    url: "https://biotechtube.io/agents/research",
    images: [
      {
        url: "https://biotechtube.io/api/og?title=Ask%20BiotechTube&subtitle=AI%20Research%20Assistant&type=default",
        width: 1200,
        height: 630,
        alt: "Ask BiotechTube — AI Research Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@biotechtube",
    title: "Ask BiotechTube — AI Research Assistant",
    description:
      "Public AI analyst for biotech research. Grounded answers with source links.",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Ask BiotechTube",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI research assistant for biotech, grounded in BiotechTube's company, drug, and sector data.",
  url: "https://biotechtube.io/agents/research",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: {
    "@type": "Organization",
    name: "BiotechTube",
    url: "https://biotechtube.io",
  },
};

export default function ResearchAgentPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <ResearchChatClient />
    </>
  );
}
