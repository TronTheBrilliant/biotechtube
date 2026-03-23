import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Props {
  icon: string;
  title: string;
  viewAllHref: string;
  viewAllLabel?: string;
  children: React.ReactNode;
}

export function HomeSection({
  icon,
  title,
  viewAllHref,
  viewAllLabel = "View all",
  children,
}: Props) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        background: "var(--color-bg-primary)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px]">{icon}</span>
          <h3
            className="text-13 font-semibold uppercase tracking-[0.3px]"
            style={{ color: "var(--color-text-primary)" }}
          >
            {title}
          </h3>
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-12 font-medium transition-opacity hover:opacity-80"
          style={{ color: "var(--color-accent)" }}
        >
          {viewAllLabel}
          <ArrowUpRight size={13} />
        </Link>
      </div>
      {children}
    </div>
  );
}
