"use client";

import { useEffect, useState } from "react";

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  headings: Heading[];
  variant?: "sidebar" | "mobile";
}

export function TableOfContents({ headings, variant = "sidebar" }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(h.id);
            }
          });
        },
        { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [headings]);

  if (headings.length < 3) return null;

  const tocLinks = headings.map((h, i) => (
    <a
      key={i}
      href={`#${h.id}`}
      onClick={() => setIsOpen(false)}
      className="block text-[12px] leading-snug py-1 transition-colors hover:opacity-100"
      style={{
        paddingLeft: h.level === 3 ? "14px" : "0",
        color: activeId === h.id ? "var(--color-accent)" : "var(--color-text-tertiary)",
        fontWeight: activeId === h.id ? 600 : 400,
        borderLeft: activeId === h.id ? "2px solid var(--color-accent)" : "2px solid transparent",
        marginLeft: "-2px",
        paddingRight: "4px",
      }}
    >
      {h.text}
    </a>
  ));

  if (variant === "mobile") {
    return (
      <div className="mb-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-[13px] font-medium py-2 px-3 rounded-lg w-full"
          style={{
            background: "var(--color-bg-secondary)",
            color: "var(--color-text-secondary)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? "rotate(90deg)" : "rotate(0)",
              transition: "transform 0.2s",
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Contents
        </button>
        {isOpen && (
          <nav className="flex flex-col mt-2 pl-3 pb-2">{tocLinks}</nav>
        )}
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className="sticky top-[80px]">
      <h4
        className="text-[11px] font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        On this page
      </h4>
      <nav className="flex flex-col">{tocLinks}</nav>
    </div>
  );
}
