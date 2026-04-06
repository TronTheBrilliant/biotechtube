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
      // Show after scrolling past hero (500px)
      setVisible(window.scrollY > 500);
      // Scroll spy
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
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(20px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-full"
        style={{
          background: isDark ? "rgba(30,30,30,0.92)" : "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          border: `0.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.4)"
            : "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Company logo */}
        {imgSrc && (
          <a href="#" className="shrink-0 p-1.5">
            <img
              src={imgSrc}
              alt={companyName}
              width={22}
              height={22}
              className="rounded-md"
            />
          </a>
        )}

        {/* Section links */}
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
                  : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)"),
                background: activeSection === s.id
                  ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)")
                  : "transparent",
              }}
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* Divider */}
        <div
          className="w-px h-5 mx-1"
          style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
        />

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-full transition-colors"
          style={{
            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
          }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  );
}
