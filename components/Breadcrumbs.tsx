import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-12" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span style={{ color: "var(--color-text-tertiary)", fontSize: 14, lineHeight: 1 }} aria-hidden="true">
                  ›
                </span>
              )}
              {isLast || !item.href ? (
                <span style={{ color: "var(--color-text-secondary)" }}>{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="breadcrumb-link"
                  style={{ color: "var(--color-text-tertiary)", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <style>{`
        .breadcrumb-link:hover {
          color: var(--color-text-primary) !important;
        }
      `}</style>
    </nav>
  );
}
