import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import therapeuticAreasData from "@/data/therapeutic-areas.json";

const SITE_URL = "https://www.biotechtube.io";

interface TherapeuticArea {
  slug: string;
  name: string;
  description: string;
  icon: string;
  keywords: string[];
}

const areas = therapeuticAreasData as TherapeuticArea[];

export const metadata: Metadata = {
  title: "Therapeutic Areas — Biotech Companies by Focus Area | BiotechTube",
  description:
    "Explore biotech companies by therapeutic area. Browse oncology, immunotherapy, gene therapy, cell therapy, neuroscience, rare diseases, and more. Find companies developing treatments across every major biotech focus area.",
  alternates: { canonical: `${SITE_URL}/therapeutic-areas` },
  openGraph: {
    title: "Therapeutic Areas — Biotech Companies by Focus Area",
    description:
      "Explore biotech companies by therapeutic area. Browse oncology, immunotherapy, gene therapy, cell therapy, neuroscience, rare diseases, and more.",
    url: `${SITE_URL}/therapeutic-areas`,
    siteName: "BiotechTube",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Therapeutic Areas — Biotech Companies by Focus Area",
    description:
      "Explore biotech companies by therapeutic area. Browse oncology, immunotherapy, gene therapy, cell therapy, neuroscience, rare diseases, and more.",
  },
};

export default function TherapeuticAreasPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Therapeutic Areas",
        item: `${SITE_URL}/therapeutic-areas`,
      },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Therapeutic Areas — Biotech Companies by Focus Area",
    description:
      "Explore biotech companies by therapeutic area. Browse oncology, immunotherapy, gene therapy, cell therapy, neuroscience, rare diseases, and more.",
    url: `${SITE_URL}/therapeutic-areas`,
    isPartOf: { "@type": "WebSite", name: "BiotechTube", url: SITE_URL },
  };

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />

      {/* Hero */}
      <div className="px-5 md:px-8 pt-8 md:pt-12 pb-6 md:pb-8 max-w-5xl mx-auto">
        <h1
          className="text-[32px] font-medium tracking-tight mb-3"
          style={{
            color: "var(--color-text-primary)",
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
          }}
        >
          Therapeutic Areas
        </h1>
        <p
          className="text-14 md:text-[16px] max-w-2xl"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}
        >
          Browse biotech companies by therapeutic focus area. From oncology and
          immunotherapy to gene therapy and digital health — explore the
          companies developing the next generation of treatments.
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-5 md:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {areas.map((area) => (
            <Link
              key={area.slug}
              href={`/therapeutic-areas/${area.slug}`}
              className="block rounded-lg border px-5 py-5 transition-all duration-150 hover:border-[var(--color-border-medium)] hover:shadow-sm"
              style={{
                borderColor: "var(--color-border-subtle)",
                borderWidth: "0.5px",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: 32, lineHeight: 1 }}>{area.icon}</span>
                <h2
                  className="text-[18px] font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {area.name}
                </h2>
              </div>
              <p
                className="text-13 line-clamp-3"
                style={{
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {area.description.slice(0, 150)}...
              </p>
              <div
                className="text-12 mt-3 font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                View companies &rarr;
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
