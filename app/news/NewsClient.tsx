"use client";

import { useState } from "react";

interface NewsItem {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  published_date: string | null;
  summary: string | null;
  companies_mentioned: string[] | null;
  category: string | null;
  scraped_at: string | null;
}

const TABS = [
  { label: "All", value: "all" },
  { label: "FDA", value: "fda" },
  { label: "Funding", value: "funding" },
  { label: "Acquisitions", value: "acquisition" },
  { label: "General", value: "general" },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

export function NewsClient({ items }: { items: NewsItem[] }) {
  const [activeTab, setActiveTab] = useState("all");

  const filtered =
    activeTab === "all"
      ? items
      : items.filter((item) => item.category === activeTab);

  return (
    <div>
      {/* Filter tabs */}
      <nav
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--color-border-subtle)",
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                color: isActive
                  ? "var(--color-text-primary)"
                  : "var(--color-text-tertiary)",
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--color-text-primary)"
                  : "2px solid transparent",
                fontWeight: isActive ? 500 : 400,
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* News list */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-text-tertiary)", padding: "32px 0" }}>
          No news items found.
        </p>
      ) : (
        <div>
          {filtered.map((item) => {
            const displayDate = formatDate(item.published_date ?? item.scraped_at);
            const summary = truncate(item.summary, 200);
            const categoryLabel = item.category?.toUpperCase() ?? null;

            return (
              <div
                key={item.id}
                style={{
                  borderBottom: "1px solid var(--color-border-subtle)",
                  padding: "16px 0",
                }}
              >
                {/* Title */}
                <a
                  href={item.source_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    textDecoration: "none",
                    display: "inline-block",
                    marginBottom: 4,
                    lineHeight: "1.4",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.textDecoration = "none")
                  }
                >
                  {item.title}
                </a>

                {/* Source + date + category badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: summary ? 6 : 0,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    {[item.source_name, displayDate].filter(Boolean).join(" · ")}
                  </span>
                  {categoryLabel && (
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                        color: "var(--color-text-tertiary)",
                        fontWeight: 500,
                      }}
                    >
                      {categoryLabel}
                    </span>
                  )}
                </div>

                {/* Summary */}
                {summary && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      lineHeight: "1.5",
                      margin: 0,
                    }}
                  >
                    {summary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
