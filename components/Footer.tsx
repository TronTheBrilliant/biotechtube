import Link from "next/link";

const platformLinks = [
  { label: "🏢 Companies", href: "/companies" },
  { label: "🧬 Pipeline", href: "/pipeline" },
  { label: "💰 Funding", href: "/funding" },
  { label: "📅 Events", href: "/events" },
  { label: "📰 News", href: "/news" },
];

const forCompaniesLinks = [
  { label: "🎯 Claim your profile", href: "/signup" },
  { label: "📢 Submit a pitch", href: "/submit-pitch" },
  { label: "🤝 Sponsor BiotechTube", href: "/sponsors" },
  { label: "💻 Website templates", href: "/templates" },
];

const companyLinks = [
  { label: "ℹ️ About", href: "/about" },
  { label: "✉️ Contact", href: "/about" },
  { label: "🔒 Privacy policy", href: "/privacy" },
  { label: "📜 Terms", href: "/terms" },
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
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-14 transition-colors duration-150 hover:text-[var(--color-text-primary)] whitespace-nowrap"
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
      {/* Main footer */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 grid grid-cols-2 md:grid-cols-3 gap-8">
        <FooterColumn title="Platform" links={platformLinks} />
        <FooterColumn title="For Companies" links={forCompaniesLinks} />
        <FooterColumn title="Company" links={companyLinks} />
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
