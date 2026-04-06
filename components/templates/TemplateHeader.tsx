"use client";
import { useState, useEffect } from "react";

interface Props {
  companyName: string;
  logoUrl: string | null;
  domain: string | null;
  sections: { id: string; label: string }[];
}

export function TemplateHeader({ companyName, logoUrl, domain, sections }: Props) {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const onScroll = () => {
      for (const section of [...sections].reverse()) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= 200) {
          setActiveSection(section.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const imgSrc = logoUrl || (domain ? `https://logo.clearbit.com/${domain}` : null);

  return (
    <>
      {/* Mobile: full-width bar flush to bottom — always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        <div
          className="flex items-center justify-center gap-0.5 px-2"
          style={{
            background: "var(--color-bg-primary)",
            backdropFilter: "blur(20px)",
            borderTop: "0.5px solid var(--color-border-subtle)",
            paddingTop: 8,
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          }}
        >
          <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-2.5 py-1.5 rounded-full transition-all shrink-0"
                style={{
                  fontSize: 11,
                  fontWeight: activeSection === s.id ? 500 : 400,
                  color: activeSection === s.id
                    ? "var(--color-text-primary)"
                    : "var(--color-text-tertiary)",
                  background: activeSection === s.id
                    ? "var(--color-bg-secondary)"
                    : "transparent",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop: centered floating pill — always visible */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 hidden sm:block">
        <div
          className="flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{
            background: "var(--color-bg-primary)",
            backdropFilter: "blur(20px)",
            border: "0.5px solid var(--color-border-subtle)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          }}
        >
          {imgSrc && (
            <a href="#" className="shrink-0 p-1.5">
              <img src={imgSrc} alt={companyName} width={22} height={22} className="rounded-md" />
            </a>
          )}
          <nav className="flex items-center gap-0.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-2.5 py-1.5 rounded-full transition-all"
                style={{
                  fontSize: 12,
                  fontWeight: activeSection === s.id ? 500 : 400,
                  color: activeSection === s.id
                    ? "var(--color-text-primary)"
                    : "var(--color-text-tertiary)",
                  background: activeSection === s.id
                    ? "var(--color-bg-secondary)"
                    : "transparent",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
