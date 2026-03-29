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
  Menu,
  X,
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

interface DashboardMobileNavProps {
  companyName: string;
  companySlug: string;
  planTier: string;
  logoUrl: string | null;
  unreadInquiries: number;
  isOpen: boolean;
  onToggle: () => void;
}

/* ─── Component ─── */

export function DashboardMobileNav({
  companyName,
  companySlug,
  planTier,
  logoUrl,
  unreadInquiries,
  isOpen,
  onToggle,
}: DashboardMobileNavProps) {
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
    <>
      {/* Top bar */}
      <div
        className="flex items-center justify-between"
        style={{
          height: 44,
          padding: "0 14px",
          background: "var(--color-bg-primary)",
          borderBottom: "0.5px solid var(--color-border-subtle)",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          {companyName}
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={onToggle}
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              color: "var(--color-text-secondary)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
            }}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Full-screen overlay */}
      {isOpen && (
        <div
          className="fixed inset-0"
          style={{
            zIndex: 50,
            background: "var(--color-bg-primary)",
            overflowY: "auto",
          }}
        >
          {/* Overlay header */}
          <div
            className="flex items-center justify-between"
            style={{
              height: 44,
              padding: "0 14px",
              borderBottom: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <div className="flex items-center gap-2">
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
              <div className="flex flex-col">
                <span
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
            <button
              onClick={onToggle}
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                color: "var(--color-text-secondary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderRadius: 6,
              }}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav items */}
          <nav style={{ padding: "8px 12px" }}>
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
                      onClick={onToggle}
                      className="flex items-center gap-2"
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 500 : 400,
                        color: active
                          ? "var(--color-text-accent)"
                          : "var(--color-text-secondary)",
                        background: active ? "var(--color-accent-subtle)" : "transparent",
                        padding: "8px 10px",
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
                      <span>{item.label}</span>
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

          {/* Bottom link */}
          <div style={{ padding: "8px 22px" }}>
            <Link
              href={`/company/${companySlug}`}
              onClick={onToggle}
              className="flex items-center gap-1"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-accent)",
                textDecoration: "none",
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              View public profile
              <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
