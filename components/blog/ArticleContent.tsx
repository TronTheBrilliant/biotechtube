"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useCompanyData, CompanyData } from "./CompanyDataContext";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { formatMarketCap, formatPercent, capPercent, pctColor } from "@/lib/market-utils";

interface ArticleContentProps {
  html: string;
  className?: string;
}

/**
 * ArticleContent renders blog HTML and attaches interactive hover cards
 * to any <a href="/company/..."> links found in the content.
 *
 * Approach: render the HTML via dangerouslySetInnerHTML, then after mount
 * use useEffect to find all company links and attach mouseenter/mouseleave
 * handlers that show a floating card populated from CompanyDataContext.
 */
export function ArticleContent({ html, className = "prose" }: ArticleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const companyData = useCompanyData();

  const [hoverCard, setHoverCard] = useState<{
    data: CompanyData;
    x: number;
    y: number;
  } | null>(null);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tappedSlug = useRef<string | null>(null);

  const showCardForLink = useCallback(
    (link: HTMLAnchorElement, slug: string) => {
      const data = companyData.get(slug);
      if (!data) return;

      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }

      const rect = link.getBoundingClientRect();
      const cardWidth = 248;
      const cardHeight = 150;

      let x = rect.left + rect.width / 2 - cardWidth / 2;
      let y = rect.bottom + 8;

      if (x < 8) x = 8;
      if (x + cardWidth > window.innerWidth - 8) x = window.innerWidth - cardWidth - 8;
      if (y + cardHeight > window.innerHeight - 8) {
        y = rect.top - cardHeight - 8;
      }

      setHoverCard({ data, x, y });
    },
    [companyData]
  );

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setHoverCard(null);
    }, 200);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (companyData.size === 0) return;

    const links = el.querySelectorAll<HTMLAnchorElement>('a[href^="/company/"]');
    const cleanups: (() => void)[] = [];

    links.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const match = href.match(/^\/company\/(.+)/);
      if (!match) return;
      const slug = match[1];

      if (!companyData.has(slug)) return;

      // Style the link with accent underline
      link.style.textDecorationColor = "var(--color-border-medium)";

      const onEnter = () => showCardForLink(link, slug);
      const onLeave = () => scheduleHide();
      const onClick = (e: MouseEvent) => {
        // Touch devices: first tap shows card, second tap navigates
        if ("ontouchstart" in window) {
          if (tappedSlug.current !== slug) {
            e.preventDefault();
            tappedSlug.current = slug;
            showCardForLink(link, slug);
            return;
          }
          // Second tap on same slug: navigate normally
          tappedSlug.current = null;
        }
      };

      link.addEventListener("mouseenter", onEnter);
      link.addEventListener("mouseleave", onLeave);
      link.addEventListener("click", onClick);

      cleanups.push(() => {
        link.removeEventListener("mouseenter", onEnter);
        link.removeEventListener("mouseleave", onLeave);
        link.removeEventListener("click", onClick);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [companyData, showCardForLink, scheduleHide]);

  // Close card on outside click/touch
  useEffect(() => {
    if (!hoverCard) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const cardEl = document.getElementById("company-hover-card");
      if (cardEl && cardEl.contains(target)) return;
      // Check if clicking on a company link
      if (target instanceof HTMLAnchorElement && target.getAttribute("href")?.startsWith("/company/")) return;
      setHoverCard(null);
      tappedSlug.current = null;
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [hoverCard]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <div
        ref={contentRef}
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {hoverCard &&
        typeof document !== "undefined" &&
        createPortal(
          <FloatingCard
            data={hoverCard.data}
            x={hoverCard.x}
            y={hoverCard.y}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          />,
          document.body
        )}
    </>
  );
}

/* ── Floating Card rendered via portal ── */

function FloatingCard({
  data,
  x,
  y,
  onMouseEnter,
  onMouseLeave,
}: {
  data: CompanyData;
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const cappedChange = capPercent(data.change_pct, "1d");

  return (
    <div
      id="company-hover-card"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        width: 248,
        padding: 10,
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-medium)",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
        animation: "hovercard-in 0.15s ease-out",
      }}
    >
      {/* Header: Logo + Name + Ticker */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <CompanyAvatar
          name={data.name}
          logoUrl={data.logo_url ?? undefined}
          website={data.website ?? undefined}
          size={28}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {data.name}
          </div>
          {data.ticker && (
            <span
              style={{
                fontSize: 10,
                color: "var(--color-text-tertiary)",
                fontWeight: 500,
                letterSpacing: "0.3px",
              }}
            >
              {data.ticker}
            </span>
          )}
        </div>
      </div>

      {/* Market data row */}
      {(data.market_cap || cappedChange !== null) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          {data.market_cap ? (
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {formatMarketCap(data.market_cap)}
            </span>
          ) : (
            <span />
          )}
          {cappedChange !== null && (
            <span style={{ fontSize: 12, fontWeight: 600, color: pctColor(cappedChange) }}>
              {formatPercent(cappedChange)}
            </span>
          )}
        </div>
      )}

      {/* Country */}
      {data.country && (
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 6 }}>
          {data.country}
        </div>
      )}

      {/* View profile link */}
      <a
        href={`/company/${data.slug}`}
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--color-text-accent)",
          textDecoration: "none",
          marginTop: 2,
        }}
      >
        View profile →
      </a>
    </div>
  );
}
