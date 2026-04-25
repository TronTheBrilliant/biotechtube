import Link from "next/link";
import { FooterNewsletter } from "./FooterNewsletter";

const platformLinks = [
  { label: "🏢 Top Companies", href: "/top-companies" },
  { label: "🧬 Pipeline", href: "/pipelines" },
  { label: "💰 Funding", href: "/funding" },
  { label: "📊 Markets", href: "/markets" },
  { label: "🏷️ Sectors", href: "/sectors" },
  { label: "🌍 Countries", href: "/countries" },
  { label: "📈 Charts", href: "/charts" },
  { label: "📅 Events", href: "/events" },
];

const discoverLinks = [
  { label: "🔥 Trending", href: "/trending" },
  { label: "📰 Latest News", href: "/news" },
  { label: "📝 Blog", href: "/blog" },
  { label: "💼 Top Investors", href: "/top-investors" },
  { label: "👤 Top People", href: "/top-people" },
  { label: "🏷️ Top Sectors", href: "/top-sectors" },
  { label: "📄 Equity Research", href: "/research" },
];

const forCompaniesLinks = [
  { label: "🎯 Claim your profile", href: "/claim" },
  { label: "🤝 Sponsor BiotechTube", href: "/sponsors" },
  { label: "💻 Website templates", href: "/templates" },
  { label: "🔌 API Documentation", href: "/api-docs" },
];

const companyLinks = [
  { label: "ℹ️ About", href: "/about" },
  { label: "💎 Pricing", href: "/pricing" },
  { label: "🔒 Privacy policy", href: "/privacy" },
  { label: "📜 Terms", href: "/terms" },
  { label: "📡 RSS feed", href: "/api/feed/rss" },
];

const popularCompanyLinks = [
  { label: "Eli Lilly", href: "/company/eli-lilly" },
  { label: "Johnson & Johnson", href: "/company/johnson-and-johnson" },
  { label: "Pfizer", href: "/company/pfizer" },
  { label: "AbbVie", href: "/company/abbvie" },
  { label: "Novartis", href: "/company/novartis" },
  { label: "Roche", href: "/company/roche" },
  { label: "Moderna", href: "/company/moderna" },
  { label: "Regeneron", href: "/company/regeneron-pharmaceuticals" },
];

const popularSectorLinks = [
  { label: "Oncology", href: "/sectors/oncology" },
  { label: "Immunology", href: "/sectors/immunology" },
  { label: "Neuroscience", href: "/sectors/neuroscience" },
  { label: "Cell Therapy", href: "/sectors/cell-therapy" },
  { label: "Gene Therapy", href: "/sectors/gene-therapy" },
  { label: "Biologics", href: "/sectors/biologics" },
  { label: "Rare Disease", href: "/sectors/rare-diseases" },
];

const popularCountryLinks = [
  { label: "United States", href: "/countries/united-states" },
  { label: "Switzerland", href: "/countries/switzerland" },
  { label: "United Kingdom", href: "/countries/united-kingdom" },
  { label: "Japan", href: "/countries/japan" },
  { label: "Germany", href: "/countries/germany" },
  { label: "China", href: "/countries/china" },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3
        className="text-12 uppercase tracking-[0.5px] font-medium mb-3"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-13 md:text-14 transition-colors duration-150 hover:text-[var(--color-text-primary)] whitespace-nowrap inline-block py-1"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer
      style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}
    >
      {/* Main footer — deep internal linking for SEO crawl paths */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
        <FooterColumn title="Platform" links={platformLinks} />
        <FooterColumn title="Discover" links={discoverLinks} />
        <FooterColumn title="For Companies" links={forCompaniesLinks} />
        <FooterColumn title="BiotechTube" links={companyLinks} />
        <FooterColumn title="Popular Companies" links={popularCompanyLinks} />
      </div>
      {/* Secondary links — sector + country anchors for crawl breadth */}
      <div
        className="max-w-[1200px] mx-auto px-4 md:px-6 pt-4 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
        style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}
      >
        <FooterColumn title="Popular Sectors" links={popularSectorLinks} />
        <FooterColumn title="Biotech by Country" links={popularCountryLinks} />
      </div>
      {/* Newsletter row */}
      <div
        className="max-w-[1200px] mx-auto px-4 md:px-6 py-5"
        style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}
      >
        <FooterNewsletter />
      </div>
      {/* Bottom strip */}
      <div
        className="flex items-center justify-center h-10 text-12"
        style={{
          color: "var(--color-text-tertiary)",
          borderTop: "0.5px solid var(--color-border-subtle)",
        }}
      >
        BiotechTube &copy; 2026 &middot; Global Biotech Intelligence
      </div>
    </footer>
  );
}
