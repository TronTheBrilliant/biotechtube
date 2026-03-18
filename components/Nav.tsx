"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const mainNavLinks = [
  { label: "Companies", href: "/companies" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Funding", href: "/funding" },
  { label: "Events", href: "/events" },
  { label: "News", href: "/news", comingSoon: true },
];

const mobileSecondaryLinks = [
  { label: "Pitches", href: "/pitches" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "Templates", href: "/templates" },
  { label: "About", href: "/about" },
];

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between h-[44px] px-5"
        style={{
          background: "var(--color-bg-primary)",
          borderBottom: "0.5px solid var(--color-border-subtle)",
        }}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-1.5 text-[16px] tracking-tight">
            <Image src="/logo.svg" alt="BiotechTube" width={20} height={22} className="flex-shrink-0" />
            <span style={{ fontWeight: 600 }}>
              <span style={{ color: "var(--color-text-primary)" }}>Biotech</span>
              <span style={{ color: "var(--color-accent)" }}>Tube</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-5">
            {mainNavLinks.map((item) =>
              item.comingSoon ? (
                <span
                  key={item.label}
                  className="text-12 cursor-default relative group"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {item.label}
                  <span
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                    style={{
                      background: "var(--color-text-primary)",
                      color: "var(--color-bg-primary)",
                    }}
                  >
                    Coming soon
                  </span>
                </span>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-12 transition-colors duration-150 hover:text-[var(--color-text-primary)]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="text-12 px-3 py-1.5 rounded border"
            style={{
              borderColor: "var(--color-border-medium)",
              color: "var(--color-text-secondary)",
            }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
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
          </Link>
        </div>

        {/* Mobile: single CTA + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/signup"
            className="text-11 font-medium px-3 py-1.5 rounded text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Sign up
          </Link>
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
            className="relative"
            style={{
              background: "var(--color-bg-primary)",
              borderBottom: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <nav className="flex flex-col px-5 py-3 gap-0.5">
              {mainNavLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.comingSoon ? "#" : item.href}
                  className="flex items-center justify-between text-13 py-2.5 border-b transition-colors duration-150"
                  style={{
                    color: item.comingSoon ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                  onClick={() => !item.comingSoon && setMenuOpen(false)}
                >
                  {item.label}
                  {item.comingSoon && (
                    <span
                      className="text-[9px] px-1.5 py-[2px] rounded-sm"
                      style={{
                        background: "var(--color-bg-tertiary)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      Soon
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            {/* Divider */}
            <div className="mx-5 my-1" style={{ borderTop: "0.5px solid var(--color-border-medium)" }} />
            <nav className="flex flex-col px-5 pb-2 gap-0.5">
              {mobileSecondaryLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-12 py-2 transition-colors duration-150"
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-5 py-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
              <Link
                href="/login"
                className="block w-full text-center text-12 py-2 rounded border mb-2"
                style={{
                  borderColor: "var(--color-border-medium)",
                  color: "var(--color-text-secondary)",
                }}
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="block w-full text-center text-12 font-medium py-2 rounded text-white"
                style={{ background: "var(--color-accent)" }}
                onClick={() => setMenuOpen(false)}
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
