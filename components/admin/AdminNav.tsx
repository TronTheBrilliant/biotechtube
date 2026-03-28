"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", path: "/admin/command-center" },
  { label: "Agents", path: "/admin/agents" },
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
      borderBottom: "1px solid var(--color-border, rgba(255,255,255,0.06))",
      background: "var(--color-bg-secondary, rgba(255,255,255,0.02))",
      marginBottom: 24,
    }}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
        return (
          <Link
            key={tab.path}
            href={tab.path}
            style={{
              padding: "12px 20px",
              fontSize: 13,
              color: isActive ? "#818cf8" : "var(--color-text-tertiary)",
              textDecoration: "none",
              borderBottom: isActive ? "2px solid #818cf8" : "2px solid transparent",
              fontWeight: isActive ? 600 : 400,
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
