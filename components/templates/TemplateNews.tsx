"use client";
import { useState } from "react";
import { Newspaper, ExternalLink, ChevronDown } from "lucide-react";

export interface NewsItem {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  summary: string | null;
  published_date: string | null;
}

interface Props {
  news: NewsItem[];
  brandColor: string;
}

export function TemplateNews({ news, brandColor }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (news.length === 0) return null;

  const visible = showAll ? news : news.slice(0, 5);

  return (
    <section id="news" className="py-20 sm:py-28">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex items-center gap-2">
          <Newspaper size={14} style={{ color: brandColor }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            News
          </span>
        </div>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          Latest News
        </h2>
        <p className="mt-3" style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
          Recent developments and press coverage.
        </p>

        {/* Timeline */}
        <div className="relative mt-10">
          {/* Vertical line */}
          <div
            className="absolute left-3 top-0 bottom-0 w-px hidden sm:block"
            style={{ background: "var(--color-border-medium)" }}
          />

          <div className="flex flex-col gap-4">
            {visible.map((item) => {
              const date = item.published_date ? new Date(item.published_date) : null;
              const dateStr = date
                ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : null;
              const relativeTime = date ? getRelativeTime(date) : null;

              return (
                <div key={item.id} className="flex gap-4 sm:gap-6">
                  {/* Dot */}
                  <div className="hidden sm:flex shrink-0 w-6 justify-center relative z-10 pt-5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: brandColor,
                        boxShadow: `0 0 0 3px var(--color-bg-primary)`,
                      }}
                    />
                  </div>

                  {/* Card */}
                  <a
                    href={item.source_url || "#"}
                    target={item.source_url ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="flex-1 group rounded-xl p-5 transition-all"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "0.5px solid var(--color-border-subtle)",
                    }}
                  >
                    {/* Date + source */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {dateStr && (
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {dateStr}
                        </span>
                      )}
                      {relativeTime && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{ fontSize: 10, color: brandColor, background: `${brandColor}10` }}
                        >
                          {relativeTime}
                        </span>
                      )}
                      {item.source_name && (
                        <span style={{ fontSize: 11, color: brandColor, fontWeight: 500 }}>
                          {item.source_name}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      className="group-hover:underline"
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.title}
                      {item.source_url && (
                        <ExternalLink
                          size={12}
                          className="inline-block ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: brandColor }}
                        />
                      )}
                    </h4>

                    {/* Summary */}
                    {item.summary && (
                      <p className="mt-2" style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                        {item.summary.length > 150 ? item.summary.slice(0, 150) + "..." : item.summary}
                      </p>
                    )}
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Show more */}
        {news.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1 mt-6 mx-auto transition-opacity hover:opacity-70"
            style={{ fontSize: 13, color: brandColor, fontWeight: 500 }}
          >
            {showAll ? "Show less" : `View all ${news.length} articles`}
            <ChevronDown size={14} style={{ transform: showAll ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
        )}
      </div>
    </section>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
