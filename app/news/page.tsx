import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Biotech News — Breakthroughs, Funding & Pipeline Updates | BiotechTube",
  description:
    "AI-curated biotech news, breakthrough alerts, funding radar, and pipeline updates. Stay informed on the latest in biotech and pharmaceutical innovation.",
  alternates: { canonical: 'https://www.biotechtube.io/news' },
  openGraph: {
    title: "Biotech News — Breakthroughs, Funding & Pipeline Updates",
    description: "AI-curated biotech news, breakthrough alerts, funding radar, and pipeline updates.",
    url: 'https://www.biotechtube.io/news',
    siteName: 'BiotechTube',
    type: 'website',
  },
};

const features = [
  {
    emoji: "\uD83D\uDD2C",
    title: "Breakthrough alerts",
    description:
      "Get notified the moment a company publishes pivotal clinical data, receives regulatory approval, or announces a key partnership.",
  },
  {
    emoji: "\uD83D\uDCB0",
    title: "Funding radar",
    description:
      "Track every funding round as it happens. Filter by stage, therapeutic area, and geography to spot trends before the market catches on.",
  },
  {
    emoji: "\uD83D\uDCCA",
    title: "Pipeline updates",
    description:
      "Monitor clinical trial progressions, FDA decisions, and pipeline milestones across your watchlist and the broader biotech landscape.",
  },
];

export default function NewsPage() {
  const newsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Biotech News — Breakthroughs, Funding & Pipeline Updates',
    description: 'AI-curated biotech news, breakthrough alerts, funding radar, and pipeline updates.',
    url: 'https://www.biotechtube.io/news',
    isPartOf: {
      '@type': 'WebSite',
      name: 'BiotechTube',
      url: 'https://www.biotechtube.io',
    },
  };

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <div className="max-w-7xl mx-auto px-5 pt-4">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "News" }]} />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <span
            className="text-11 font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            News
          </span>
          <h1
            className="text-[32px] font-medium mt-2 mb-3 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            AI-curated biotech intelligence
          </h1>
          <p
            className="text-13 leading-relaxed max-w-lg mx-auto"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Your personalized biotech news feed is almost here. We are building
            an AI-powered engine that surfaces the stories, data points, and
            signals that matter most to your portfolio and research interests.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg p-5"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <div className="text-xl mb-3">{f.emoji}</div>
              <h3
                className="text-13 font-medium mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                {f.title}
              </h3>
              <p
                className="text-12 leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Email signup */}
        <div
          className="rounded-lg p-6 text-center"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
          }}
        >
          <p
            className="text-13 font-medium mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Get notified when we launch
          </p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              className="flex-1 text-13 px-3 py-2 rounded border outline-none"
              style={{
                borderColor: "var(--color-border-medium)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
              }}
              placeholder="you@company.com"
            />
            <button
              className="text-13 font-medium px-4 py-2 rounded text-white shrink-0"
              style={{ background: "var(--color-accent)" }}
            >
              Notify me
            </button>
          </div>
        </div>

        {/* Browse link */}
        <div className="text-center mt-8">
          <Link
            href="/companies"
            className="text-13 font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            Browse companies while you wait &rarr;
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
