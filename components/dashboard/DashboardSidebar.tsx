"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pencil,
  Users,
  BarChart3,
  Newspaper,
  FlaskConical,
  Briefcase,
  Palette,
  Video,
  FileText,
  MessageSquare,
  Settings,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ─── Types ─── */

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  companyName: string;
  companySlug: string;
  planTier: string;
  logoUrl: string | null;
  unreadInquiries: number;
}

/* ─── Component ─── */

export function DashboardSidebar({
  companyName,
  companySlug,
  planTier,
  logoUrl,
  unreadInquiries,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const navGroups: NavGroup[] = [
    {
      title: "General",
      items: [
        { label: "Overview", href: "/manage", icon: <LayoutDashboard size={14} /> },
        { label: "Edit Profile", href: "/manage/profile", icon: <Pencil size={14} /> },
        { label: "Team", href: "/manage/team", icon: <Users size={14} /> },
        { label: "Analytics", href: "/manage/analytics", icon: <BarChart3 size={14} /> },
      ],
    },
    {
      title: "Content",
      items: [
        { label: "News", href: "/manage/news", icon: <Newspaper size={14} /> },
        { label: "Pipeline", href: "/manage/pipeline", icon: <FlaskConical size={14} /> },
        { label: "Jobs", href: "/manage/jobs", icon: <Briefcase size={14} /> },
      ],
    },
    {
      title: "Premium",
      items: [
        { label: "Branding", href: "/manage/branding", icon: <Palette size={14} /> },
        { label: "Media", href: "/manage/media", icon: <Video size={14} /> },
        { label: "Custom Sections", href: "/manage/sections", icon: <FileText size={14} /> },
        {
          label: "Inquiries",
          href: "/manage/inquiries",
          icon: <MessageSquare size={14} />,
          badge: unreadInquiries > 0 ? unreadInquiries : undefined,
        },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Contact & Billing", href: "/manage/settings", icon: <Settings size={14} /> },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/manage") return pathname === "/manage";
    return pathname.startsWith(href);
  };

  const initials = companyName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: 240,
        background: "var(--color-bg-secondary)",
        borderRight: "0.5px solid var(--color-border-subtle)",
      }}
    >
      {/* Company identity */}
      <div className="flex items-center gap-2" style={{ padding: "14px 14px 10px" }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
          />
        ) : (
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--color-accent-subtle)",
              color: "var(--color-text-accent)",
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            {initials}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span
            className="truncate"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              lineHeight: 1.3,
            }}
          >
            {companyName}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {planTier}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: "4px 8px" }}>
        {navGroups.map((group) => (
          <div key={group.title} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                padding: "6px 10px 4px",
              }}
            >
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 transition-colors"
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                    color: active
                      ? "var(--color-text-accent)"
                      : "var(--color-text-secondary)",
                    background: active ? "var(--color-accent-subtle)" : "transparent",
                    padding: "6px 10px",
                    borderRadius: 6,
                    textDecoration: "none",
                    transition: "all 150ms ease-out",
                  }}
                >
                  <span
                    className="flex-shrink-0"
                    style={{
                      color: active
                        ? "var(--color-text-accent)"
                        : "var(--color-text-tertiary)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className="ml-auto flex-shrink-0"
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        background: "var(--color-accent-subtle)",
                        color: "var(--color-accent-dark)",
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div
        style={{
          padding: "8px 14px 12px",
          borderTop: "0.5px solid var(--color-border-subtle)",
        }}
      >
        <Link
          href={`/company/${companySlug}`}
          className="flex items-center gap-1"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--color-text-accent)",
            textDecoration: "none",
            marginBottom: 8,
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          View public profile
          <ExternalLink size={11} />
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
