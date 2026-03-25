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
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--color-bg-primary)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px var(--color-border-subtle)",
      }}
    >
      {/* Accent top bar - hidden for now */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[16px]">{icon}</span>
          <h3
            className="text-[13px] font-bold uppercase tracking-[0.5px]"
            style={{ color: "var(--color-text-primary)" }}
          >
            {title}
          </h3>
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-12 font-semibold px-2.5 py-1 rounded-md transition-all duration-150 hover:bg-[var(--color-accent-subtle,#e8f5f0)]"
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
