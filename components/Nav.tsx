"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

import { usePathname } from "next/navigation";
import { Search, Menu, X, ChevronDown, LogIn, User, Settings, List, LogOut, LayoutDashboard } from "lucide-react";
import { SearchOverlay } from "./SearchOverlay";
import { ThemeToggle } from "./ThemeToggle";
import { useUser } from "@/lib/auth";

/* ─── Menu data ─── */

interface MenuItem {
  href: string;
  emoji: string;
  title: string;
  subtitle?: string;
  iconBg?: string;
}

interface FeaturedItem {
  href: string;
  emoji: string;
  label: string;
}

interface MenuCategory {
  label: string;
  items: MenuItem[];
  featured?: { heading: string; items: FeaturedItem[] };
}

const MENUS: MenuCategory[] = [
  {
    label: "Data",
    items: [
      { href: "/top-companies", emoji: "🏢", title: "Companies", subtitle: "14,000+ tracked", iconBg: "#f0fdf4" },
      { href: "/funding", emoji: "💰", title: "Funding", subtitle: "Rounds & deals", iconBg: "#fef3c7" },
      { href: "/markets", emoji: "📊", title: "Markets", subtitle: "Stock data", iconBg: "#fce7f3" },
      { href: "/sectors", emoji: "🏷️", title: "Sectors", subtitle: "20 biotech sectors", iconBg: "#f5f3ff" },
      { href: "/pipelines", emoji: "🧬", title: "Pipeline", subtitle: "Drug programs", iconBg: "#ecfdf5" },
    ],
    featured: {
      heading: "Top Countries",
      items: [
        { href: "/companies/united-states", emoji: "🇺🇸", label: "United States" },
        { href: "/companies/united-kingdom", emoji: "🇬🇧", label: "United Kingdom" },
        { href: "/companies/norway", emoji: "🇳🇴", label: "Norway" },
        { href: "/companies/sweden", emoji: "🇸🇪", label: "Sweden" },
      ],
    },
  },
  {
    label: "Discover",
    items: [
      { href: "/trending", emoji: "🔥", title: "Trending", subtitle: "Hot companies", iconBg: "#fef3c7" },
      { href: "/countries", emoji: "🌍", title: "Countries", subtitle: "30+ markets", iconBg: "#f0fdf4" },
      { href: "/events", emoji: "📅", title: "Events", subtitle: "Industry events", iconBg: "#eff6ff" },
    ],
  },
  {
    label: "News",
    items: [
      { href: "/news", emoji: "📰", title: "Latest News" },
      { href: "/blog", emoji: "📝", title: "Blog", subtitle: "Analysis & guides" },
    ],
  },
  {
    label: "Company",
    items: [
      { href: "/about", emoji: "📋", title: "About" },
      { href: "/pricing", emoji: "💎", title: "Pricing" },
    ],
  },
];

/* ─── Logo SVG (uses currentColor for dark-mode support) ─── */
function LogoIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 129.82 123.26"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M40.72,70.04c7.72-8.9,8.03-21.18.44-30.28C30.03,26.39,7.36,24.33,8.06.02l-5.75.05c-1.63,12.16,3.81,23.27,13.62,30.52l-7.19,5.45c-3.64,2.76-5.94,6.87-7.52,11.19-4.77,13.02,5.34,23.33,14.03,31.14l6.69-5.23c-2.83-2.61-4.9-4.45-7.55-7.44l17.27-.31c.58-.01,1.48-1.65,1.13-2.1-.3-.38-1.27-.89-1.79-.89l-18.82.03c-1.48-1.88-2.4-3.84-3.08-6.54l25.29.07c.53,0,1.5-.74,1.68-1.21.18-.47-.8-1.7-1.35-1.7l-25.62-.11c.2-2.48.71-4.09,1.69-6.17h19.69c.67,0,1.69-1.12,1.59-1.73-.08-.5-1.09-1.37-1.62-1.37l-17.26-.09c2.96-3.37,6.41-5.58,10.04-8.11,4.3,2.6,7.98,5.23,11.07,8.85,4.79,6.11,5.37,14.02.74,20.51-2.93,4.12-7.09,7.27-11.17,10.36-4.94,3.74-9.61,7.26-14.03,11.6C-1,97.46-.35,110.5,6.42,123.19c2.56-13.98-.68-20.94,9.76-32.06,8.64-7.97,16.69-12.06,24.54-21.1Z" />
      <path d="M115.68,56.18c7-10.81,8.22-23.82,3.03-35.32C113.11,8.47,101.03,1.09,87.48.59l-39.45.05,2.25,6.73,35.66-.04c17.49-.02,30.78,14.09,28.96,31.53-.78,7.43-4.21,13.9-10.28,18.94,12.35,5.78,19.65,17.39,18.12,31.21-2.28,14.79-14.52,27.25-29.92,27.35l-44.48.29-3.16,6.6h47.17c17.23-.75,31.56-12.03,36.16-28.6,3.97-14.28-1.33-28.96-12.84-38.48Z" />
      <path d="M56.44,100.92l33.75-.08c9.45-.02,16.21-7.44,15.73-16.48.09-8.31-6.33-15.52-15.02-15.55l-34.47-.1v32.21ZM63.25,75.49l26.61-.02c5.53,0,9.32,4.54,9.24,9.44-.1,5.46-4.01,9.2-9.86,9.19l-26.01-.07.02-18.54Z" />
      <path d="M96.39,46.45c2.52-5.28,2.23-11.05-.54-15.97-2.97-4.12-7.63-6.68-12.86-6.67h-26.55s0,30.69,0,30.69l26.55.05c5.58-.5,10.53-3.07,13.41-8.09ZM63.23,47.73v-17.04s20.16.02,20.16.02c4.48,0,7.74,3.49,7.9,7.98.2,5.37-3.62,9.02-8.74,9.03h-19.32Z" />
      <path d="M31.52,81.57l-6.44,5.04,6.34,5.93-13.81.3c-.71.02-1.81,1.25-1.56,1.84.21.51,1.34,1.13,1.92,1.13h16.34c1.25,2,2.18,3.82,2.95,6.24l-24.01.11c-.54,0-1.37,1.03-1.31,1.53.07.5,1.09,1.4,1.67,1.4h24.6s.87,6.48.87,6.48l-27.26.03c-.64,0-1.54,1.44-1.29,1.86.24.41,1.07,1.15,1.68,1.15l27.43.14,1.25,8.48c8.68-17.54,5.05-30.05-9.38-41.65Z" />
      <path d="M13.1,11.59l22.98.17c-.84,2.23-1.72,3.78-2.93,5.58l-13.96.02c-.59,0-1.59,1.05-1.57,1.58.02.45.9,1.3,1.44,1.32l10.91.36-4.59,4.18,7.01,4.61c9.54-6.81,14.31-17.85,11.64-29.43l-16.11.25c-.47,0-1.57.96-1.4,1.36.14.33.9,1.1,1.35,1.11l9.97.19c.14,1.99-.11,3.89-.68,5.75H13.52c-.64-.01-1.74.76-1.78,1.29-.03.44.81,1.64,1.35,1.64Z" />
    </svg>
  );
}

/* ─── Component ─── */

export function Nav() {
  const { user, profile, signOut } = useUser();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  // Close everything on route change
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setMobileAccordion(null);
    setUserMenuOpen(false);
  }, [pathname]);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setOpenMenu(null);
        if (mobileOpen) setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // Body scroll lock for mobile overlay
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Hover handlers for desktop mega-menu
  const handleTriggerEnter = useCallback((label: string) => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
    if (openMenu === label) return;
    hoverTimeout.current = setTimeout(() => {
      setOpenMenu(label);
    }, openMenu ? 0 : 200); // instant switch if already open
  }, [openMenu]);

  const handleTriggerLeave = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    leaveTimeout.current = setTimeout(() => {
      setOpenMenu(null);
    }, 150);
  }, []);

  // Keyboard toggle for triggers
  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent, label: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpenMenu((prev) => (prev === label ? null : label));
    }
    if (e.key === "Escape") {
      setOpenMenu(null);
    }
  }, []);

  return (
    <>
      {/* ─── Desktop + Mobile Top Bar ─── */}
      <header
        ref={navRef}
        className="fixed top-0 left-0 right-0"
        style={{
          height: "var(--nav-h, 56px)",
          background: "var(--color-bg-primary)",
          borderBottom: "1px solid var(--color-border-subtle)",
          zIndex: 50,
        }}
      >
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center justify-between h-full max-w-[1200px] mx-auto px-4 md:px-6">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" style={{ color: "var(--color-text-primary)" }}>
            <LogoIcon size={22} />
            <span className="text-[18px] font-bold tracking-[-0.3px]">
              BiotechTube
            </span>
          </Link>

          {/* Centre: Nav menu */}
          <div className="flex-1 flex justify-center">
            <nav className="flex items-center gap-1">
              {MENUS.map((menu) => {
                const isOpen = openMenu === menu.label;
                return (
                  <div
                    key={menu.label}
                    className="relative"
                    onMouseEnter={() => handleTriggerEnter(menu.label)}
                    onMouseLeave={handleTriggerLeave}
                  >
                    <button
                      className="flex items-center px-3 py-1.5 rounded-md text-[14px] font-semibold transition-colors duration-150"
                      style={{
                        color: isOpen ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        background: isOpen ? "var(--color-bg-secondary)" : "transparent",
                      }}
                      onKeyDown={(e) => handleTriggerKeyDown(e, menu.label)}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                    >
                      {menu.label}
                    </button>

                    {/* Dropdown */}
                    {isOpen && (
                      <div
                        className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden"
                        style={{
                          minWidth: 240,
                          background: "var(--color-bg-primary)",
                          border: "1px solid var(--color-border-subtle)",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                          animation: "fadeIn 0.15s ease",
                          zIndex: 50,
                        }}
                        role="menu"
                      >
                        <div className="p-2">
                          {menu.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150"
                              style={{ color: "var(--color-text-primary)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              onClick={() => setOpenMenu(null)}
                              role="menuitem"
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] shrink-0"
                                style={{ background: "var(--color-bg-tertiary)" }}
                              >
                                {item.emoji}
                              </div>
                              <div>
                                <div className="text-[13px] font-medium">{item.title}</div>
                                {item.subtitle && (
                                  <div className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>

                        {/* Featured section */}
                        {menu.featured && (
                          <div
                            className="px-3 py-2.5"
                            style={{
                              background: "var(--color-bg-secondary)",
                              borderTop: "1px solid var(--color-border-subtle)",
                            }}
                          >
                            <div
                              className="text-[10px] uppercase tracking-[0.8px] font-semibold mb-1.5 px-1"
                              style={{ color: "var(--color-text-tertiary)" }}
                            >
                              {menu.featured.heading}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {menu.featured.items.map((fi) => (
                                <Link
                                  key={fi.href}
                                  href={fi.href}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] transition-colors duration-150"
                                  style={{ color: "var(--color-text-secondary)" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-primary)"; e.currentTarget.style.background = "var(--color-bg-tertiary)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.background = "transparent"; }}
                                  onClick={() => setOpenMenu(null)}
                                >
                                  <span>{fi.emoji}</span>
                                  <span>{fi.label}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right: Search + Sign in */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] transition-colors duration-150"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border-subtle)",
                color: "var(--color-text-tertiary)",
              }}
            >
              <Search size={13} />
              <span>Search...</span>
              <span
                className="ml-2 text-[10px] px-1.5 py-[1px] rounded"
                style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}
              >
                ⌘K
              </span>
            </button>

            <ThemeToggle />

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-semibold text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  {profile?.full_name
                    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                    : (user.email?.[0] ?? "U").toUpperCase()}
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 rounded-xl overflow-hidden py-1"
                    style={{
                      minWidth: 200,
                      background: "var(--color-bg-primary)",
                      border: "1px solid var(--color-border-subtle)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                      animation: "fadeIn 0.15s ease",
                      zIndex: 50,
                    }}
                  >
                    <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      <p className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {profile?.full_name || "User"}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                        {user.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-[13px] transition-colors"
                        style={{ color: "var(--color-text-secondary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard size={14} /> Dashboard
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-[13px] transition-colors"
                        style={{ color: "var(--color-text-secondary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <List size={14} /> Watchlist
                      </Link>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-3 py-2 text-[13px] transition-colors"
                        style={{ color: "var(--color-text-secondary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings size={14} /> Settings
                      </Link>
                    </div>
                    <div style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-[13px] transition-colors"
                        style={{ color: "var(--color-text-secondary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-[13px] font-medium text-white px-4 py-[7px] rounded-lg transition-opacity duration-150"
                style={{ background: "var(--color-accent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Top Bar */}
        <div className="flex md:hidden items-center justify-between h-full px-4">
          <Link href="/" className="flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <LogoIcon size={20} />
            <span className="text-[17px] font-bold tracking-[-0.3px]">
              BiotechTube
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-md"
              style={{ color: "var(--color-text-secondary)" }}
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-md"
              style={{ color: "var(--color-text-secondary)" }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Overlay ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: 50, background: "var(--color-bg-primary)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between h-[48px] px-4 shrink-0"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)} style={{ color: "var(--color-text-primary)" }}>
              <LogoIcon size={20} />
              <span className="text-[17px] font-bold tracking-[-0.3px]">
                BiotechTube
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md"
              style={{ color: "var(--color-text-secondary)" }}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto" style={{ height: "calc(100vh - 48px)" }}>
            <div className="px-4 py-3">
              {/* Search */}
              <button
                onClick={() => { setSearchOpen(true); setMobileOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px] mb-4"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                  color: "var(--color-text-tertiary)",
                }}
              >
                <Search size={14} />
                Search companies, drugs, people...
              </button>

              {/* Accordion sections */}
              {MENUS.map((menu) => {
                const isExpanded = mobileAccordion === menu.label;
                return (
                  <div
                    key={menu.label}
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                  >
                    <button
                      className="flex items-center justify-between w-full py-3.5 px-1"
                      onClick={() => setMobileAccordion(isExpanded ? null : menu.label)}
                      aria-expanded={isExpanded}
                    >
                      <span
                        className="text-[15px] font-medium"
                        style={{ color: isExpanded ? "var(--color-accent)" : "var(--color-text-primary)" }}
                      >
                        {menu.label}
                      </span>
                      <ChevronDown
                        size={16}
                        style={{
                          color: isExpanded ? "var(--color-accent)" : "var(--color-text-tertiary)",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </button>

                    {isExpanded && (
                      <div className="pb-3 flex flex-col gap-0.5">
                        {menu.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px]"
                            style={{ color: "var(--color-text-secondary)" }}
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="text-[15px]">{item.emoji}</span>
                            <span>{item.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Plain links */}
              <div className="pt-3 pb-2 flex flex-col gap-1">
                <Link
                  href="/about"
                  className="px-1 py-2.5 text-[14px]"
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  About
                </Link>
                <Link
                  href="/pricing"
                  className="px-1 py-2.5 text-[14px]"
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  Pricing
                </Link>
              </div>

              {/* Sign in / User CTA */}
              <div className="pt-3 mt-2" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                {user ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 px-1 py-2">
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-semibold text-white shrink-0"
                        style={{ background: "var(--color-accent)" }}
                      >
                        {profile?.full_name
                          ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                          : (user.email?.[0] ?? "U").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {profile?.full_name || "User"}
                        </p>
                        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-1 py-2.5 text-[14px]"
                      style={{ color: "var(--color-text-secondary)" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-1 py-2.5 text-[14px]"
                      style={{ color: "var(--color-text-secondary)" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      <List size={16} /> Watchlist
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-1 py-2.5 text-[14px]"
                      style={{ color: "var(--color-text-secondary)" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      <User size={16} /> Profile
                    </Link>
                    <button
                      onClick={() => { signOut(); setMobileOpen(false); }}
                      className="flex items-center gap-2 px-1 py-2.5 text-[14px] w-full"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-[14px] font-medium text-white"
                    style={{ background: "var(--color-accent)" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <LogIn size={16} />
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Search Overlay ─── */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ─── CSS Animation ─── */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 767px) {
          header { --nav-h: 48px; }
        }
      `}</style>
    </>
  );
}
