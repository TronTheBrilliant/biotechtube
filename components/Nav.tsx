"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Rankings", href: "#" },
  { label: "Pitches", href: "#" },
  { label: "Sponsors", href: "#" },
  { label: "Templates", href: "#" },
];

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between h-[44px] px-5 border-b"
        style={{ background: "var(--color-bg-primary)" }}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[15px] font-medium tracking-tight">
            <span style={{ color: "var(--color-text-primary)" }}>Biotech</span>
            <span style={{ color: "var(--color-accent)" }}>Tube</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-12 transition-colors duration-150 hover:text-[var(--color-text-primary)]"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2">
          <button
            className="text-12 px-3 py-1.5 rounded border"
            style={{
              borderColor: "var(--color-border-medium)",
              color: "var(--color-text-secondary)",
            }}
          >
            Log in
          </button>
          <button
            className="text-12 font-medium px-3.5 py-1.5 rounded text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Sign up
            <span
              className="ml-1 text-[9px] rounded-sm px-[5px] py-[2px]"
              style={{ background: "#fef3e2", color: "#b45309" }}
            >
              Free
            </span>
          </button>
        </div>

        {/* Mobile: single CTA + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            className="text-11 font-medium px-3 py-1.5 rounded text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Sign up
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1"
            style={{ color: "var(--color-text-secondary)" }}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ top: 44 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.3)" }}
            onClick={() => setMenuOpen(false)}
          />
          {/* Menu panel */}
          <div
            className="relative border-b"
            style={{ background: "var(--color-bg-primary)" }}
          >
            <nav className="flex flex-col px-5 py-3 gap-1">
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-13 py-2.5 border-b transition-colors duration-150"
                  style={{
                    color: "var(--color-text-primary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-5 py-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
              <button
                className="w-full text-12 py-2 rounded border mb-2"
                style={{
                  borderColor: "var(--color-border-medium)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Log in
              </button>
              <button
                className="w-full text-12 font-medium py-2 rounded text-white"
                style={{ background: "var(--color-accent)" }}
              >
                Start free trial
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
