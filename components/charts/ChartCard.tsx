"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  id: string;
  title: string;
  subtitle: string;
  methodology: string;
  premium?: boolean;
  children: React.ReactNode;
}

export function ChartCard({
  id,
  title,
  subtitle,
  methodology,
  premium,
  children,
}: Props) {
  const [showMethodology, setShowMethodology] = useState(false);

  return (
    <div
      id={id}
      className="rounded-lg scroll-mt-20"
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-subtle)",
      }}
    >
      {/* Header */}
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3
              className="flex items-center gap-2"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                lineHeight: 1.3,
              }}
            >
              {title}
              {premium && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider"
                  style={{
                    background: "var(--color-accent)",
                    color: "white",
                    fontWeight: 500,
                  }}
                >
                  PRO
                </span>
              )}
            </h3>
            <p
              className="mt-0.5"
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="px-1 sm:px-2 pb-2 overflow-hidden">{children}</div>

      {/* Methodology toggle */}
      <div
        style={{
          borderTop: "0.5px solid var(--color-border-subtle)",
        }}
      >
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="w-full px-4 py-2.5 flex items-center justify-between"
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span>What does this tell you?</span>
          <ChevronDown
            size={14}
            style={{
              transform: showMethodology ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        </button>
        {showMethodology && (
          <div
            className="px-4 pb-3"
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--color-text-secondary)",
            }}
          >
            {methodology}
          </div>
        )}
      </div>
    </div>
  );
}
