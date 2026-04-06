"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface Props {
  companyName: string;
  logoUrl: string | null;
  domain: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  sections: { id: string; label: string }[];
}

export function TemplateHeader({ companyName, logoUrl, domain, isDark, onToggleTheme, sections }: Props) {
  const [activeSection, setActiveSection] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 500);
      for (const section of [...sections].reverse()) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= 200) {
          setActiveSection(section.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const imgSrc = logoUrl || (domain ? `https://img.logo.dev/${domain}?token=pk_FNHUWoZORpiR_7j_vzFnmQ&size=80` : null);

  return (
    <>
      {/* Mobile: full-width bar flush to bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden transition-all duration-500"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center justify-center gap-0.5 px-2 py-2.5"
          style={{
            background: isDark ? "rgba(20,20,20,0.97)" : "rgba(255,255,255,0.97)",
            backdropFilter: "blur(20px)",
            borderTop: `0.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            boxShadow: isDark ? "0 -2px 16px rgba(0,0,0,0.3)" : "0 -2px 16px rgba(0,0,0,0.06)",
            paddingBottom: "env(safe-area-inset-bottom, 8px)",
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
                    ? (isDark ? "#fff" : "#111")
                    : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"),
                  background: activeSection === s.id
                    ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)")
                    : "transparent",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
          <div className="w-px h-4 mx-0.5 shrink-0" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-full shrink-0"
            style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)" }}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </div>

      {/* Desktop: centered floating pill */}
      <div
        className="fixed bottom-4 left-1/2 z-50 hidden sm:block transition-all duration-500"
        style={{
          transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(20px)",
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <div
          className="flex items-center gap-1 px-2 py-1.5 rounded-full"
          style={{
            background: isDark ? "rgba(20,20,20,0.92)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            border: `0.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(0,0,0,0.1)",
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
                    ? (isDark ? "#fff" : "#111")
                    : (isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)"),
                  background: activeSection === s.id
                    ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)")
                    : "transparent",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
          <div className="w-px h-5 mx-1 shrink-0" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full shrink-0"
            style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)" }}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </>
  );
}
