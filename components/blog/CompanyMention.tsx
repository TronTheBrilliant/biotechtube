"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { formatMarketCap, formatPercent, capPercent, pctColor } from "@/lib/market-utils";

export interface CompanyMentionProps {
  slug: string;
  name: string;
  children: React.ReactNode;
  ticker?: string | null;
  marketCap?: number | null;
  changePct?: number | null;
  logoUrl?: string | null;
  website?: string | null;
  country?: string | null;
}

export function CompanyMention({
  slug,
  name,
  children,
  ticker,
  marketCap,
  changePct,
  logoUrl,
  website,
  country,
}: CompanyMentionProps) {
  const [showCard, setShowCard] = useState(false);
  const [cardPos, setCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tappedOnce, setTappedOnce] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cappedChange = capPercent(changePct ?? null, "1d");

  const positionCard = useCallback(() => {
    if (!linkRef.current) return;
    const rect = linkRef.current.getBoundingClientRect();
    const cardWidth = 248;
    const cardHeight = 140;

    // Center horizontally below the link
    let x = rect.left + rect.width / 2 - cardWidth / 2;
    let y = rect.bottom + 8;

    // Keep within viewport
    if (x < 8) x = 8;
    if (x + cardWidth > window.innerWidth - 8) x = window.innerWidth - cardWidth - 8;

    // If card would go below viewport, show above
    if (y + cardHeight > window.innerHeight - 8) {
      y = rect.top - cardHeight - 8;
    }

    setCardPos({ x, y });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    positionCard();
    setShowCard(true);
  }, [positionCard]);

  const handleMouseLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setShowCard(false);
    }, 200);
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setShowCard(false);
    }, 200);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // On touch devices: first tap shows card, second navigates
      if ("ontouchstart" in window) {
        if (!tappedOnce) {
          e.preventDefault();
          positionCard();
          setShowCard(true);
          setTappedOnce(true);
          return;
        }
        // Second tap: navigate normally
      }
    },
    [tappedOnce, positionCard]
  );

  // Close on outside click (mobile)
  useEffect(() => {
    if (!showCard) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        linkRef.current &&
        !linkRef.current.contains(target) &&
        cardRef.current &&
        !cardRef.current.contains(target)
      ) {
        setShowCard(false);
        setTappedOnce(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showCard]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <a
        ref={linkRef}
        href={`/company/${slug}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          color: "var(--color-text-accent)",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
          textDecorationColor: "var(--color-border-medium)",
          cursor: "pointer",
        }}
      >
        {children}
      </a>
      {showCard && (
        <HoverCard
          ref={cardRef}
          slug={slug}
          name={name}
          ticker={ticker}
          marketCap={marketCap}
          changePct={cappedChange}
          logoUrl={logoUrl}
          website={website}
          country={country}
          position={cardPos}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        />
      )}
    </>
  );
}

/* ── Floating Hover Card ── */

import { forwardRef } from "react";
import { createPortal } from "react-dom";

interface HoverCardProps {
  slug: string;
  name: string;
  ticker?: string | null;
  marketCap?: number | null;
  changePct?: number | null;
  logoUrl?: string | null;
  website?: string | null;
  country?: string | null;
  position: { x: number; y: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(function HoverCard(
  { slug, name, ticker, marketCap, changePct, logoUrl, website, country, position, onMouseEnter, onMouseLeave },
  ref
) {
  const card = (
    <div
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
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
        <CompanyAvatar name={name} logoUrl={logoUrl ?? undefined} website={website ?? undefined} size={28} />
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
            {name}
          </div>
          {ticker && (
            <span
              style={{
                fontSize: 10,
                color: "var(--color-text-tertiary)",
                fontWeight: 500,
                letterSpacing: "0.3px",
              }}
            >
              {ticker}
            </span>
          )}
        </div>
      </div>

      {/* Market data row */}
      {(marketCap || changePct !== null) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          {marketCap ? (
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {formatMarketCap(marketCap)}
            </span>
          ) : (
            <span />
          )}
          {changePct !== null && changePct !== undefined && (
            <span style={{ fontSize: 12, fontWeight: 600, color: pctColor(changePct) }}>
              {formatPercent(changePct)}
            </span>
          )}
        </div>
      )}

      {/* Country */}
      {country && (
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            marginBottom: 6,
          }}
        >
          {country}
        </div>
      )}

      {/* View profile link */}
      <a
        href={`/company/${slug}`}
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

  // Portal to body so card isn't clipped by overflow
  if (typeof document === "undefined") return null;
  return createPortal(card, document.body);
});
