"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", path: "/admin/command-center" },
  { label: "Agents", path: "/admin/agents" },
  { label: "Articles", path: "/admin/articles" },
  { label: "Data", path: "/admin/data" },
  { label: "Content", path: "/admin/content" },
  { label: "Analytics", path: "/admin/analytics" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      display: "flex",
      gap: 0,
      borderBottom: "1px solid var(--color-border-subtle)",
      background: "transparent",
      paddingLeft: 8,
      marginBottom: 32,
    }}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
        return (
          <Link
            key={tab.path}
            href={tab.path}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              color: isActive ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              textDecoration: "none",
              borderBottom: isActive ? "2px solid var(--color-text-primary)" : "2px solid transparent",
              fontWeight: isActive ? 500 : 400,
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
