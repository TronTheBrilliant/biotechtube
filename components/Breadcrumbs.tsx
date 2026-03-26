import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  // Build JSON-LD BreadcrumbList schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `https://biotechtube.io${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-[11px] md:text-[12px] flex-wrap"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span style={{ color: "var(--color-text-tertiary)", opacity: 0.5 }}>/</span>
              )}
              {isLast || !item.href ? (
                <span
                  style={{ color: isLast ? "var(--color-text-secondary)" : "var(--color-text-tertiary)" }}
                  className={isLast ? "font-medium" : ""}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:underline transition-colors"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
