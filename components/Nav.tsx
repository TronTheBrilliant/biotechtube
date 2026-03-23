"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Menu, X, ChevronDown, LogIn, User, Settings, List, LogOut } from "lucide-react";
import { SearchOverlay } from "./SearchOverlay";
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
      { href: "/companies", emoji: "🏢", title: "Companies", subtitle: "14,000+ tracked", iconBg: "#f0fdf4" },
      { href: "/pipeline", emoji: "🧪", title: "Pipeline", subtitle: "Drug tracker", iconBg: "#eff6ff" },
      { href: "/funding", emoji: "💰", title: "Funding", subtitle: "Rounds & deals", iconBg: "#fef3c7" },
      { href: "/markets", emoji: "📊", title: "Markets", subtitle: "Stock data", iconBg: "#fce7f3" },
      { href: "/sectors", emoji: "🏷️", title: "Sectors", subtitle: "20 biotech sectors", iconBg: "#f5f3ff" },
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
      { href: "/therapeutic-areas", emoji: "🧬", title: "Therapeutic Areas", subtitle: "21 disease areas", iconBg: "#f0fdf4" },
      { href: "/pipeline", emoji: "💊", title: "Drugs", subtitle: "Clinical pipeline", iconBg: "#eff6ff" },
      { href: "/people", emoji: "👤", title: "People", subtitle: "Executives & leaders", iconBg: "#fef3c7" },
      { href: "/investors", emoji: "🏦", title: "Investors", subtitle: "VC & portfolio data", iconBg: "#fce7f3" },
    ],
    featured: {
      heading: "Popular",
      items: [
        { href: "/therapeutic-areas/oncology", emoji: "🎯", label: "Oncology" },
        { href: "/therapeutic-areas/immunotherapy", emoji: "🛡️", label: "Immunotherapy" },
        { href: "/therapeutic-areas/neuroscience", emoji: "🧠", label: "Neuroscience" },
        { href: "/therapeutic-areas/rare-diseases", emoji: "💎", label: "Rare Diseases" },
      ],
    },
  },
  {
    label: "News",
    items: [
      { href: "/news", emoji: "📰", title: "Latest News" },
      { href: "/events", emoji: "📅", title: "Events" },
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
          {/* Left: Logo + Triggers */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.svg" alt="BiotechTube" width={22} height={22} />
              <span
                className="text-[15px] font-semibold tracking-[-0.3px]"
                style={{ color: "var(--color-text-primary)" }}
              >
                BiotechTube
              </span>
            </Link>

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
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150"
                      style={{
                        color: isOpen ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        background: isOpen ? "var(--color-bg-secondary)" : "transparent",
                      }}
                      onKeyDown={(e) => handleTriggerKeyDown(e, menu.label)}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                    >
                      {menu.label}
                      <ChevronDown
                        size={12}
                        style={{
                          transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                          transition: "transform 0.2s ease",
                          opacity: 0.5,
                        }}
                      />
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
                                style={{ background: item.iconBg || "var(--color-bg-secondary)" }}
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

          {/* Right: Search + Pricing + Sign in */}
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
                        href="/profile"
                        className="flex items-center gap-2 px-3 py-2 text-[13px] transition-colors"
                        style={{ color: "var(--color-text-secondary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-secondary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User size={14} /> Profile
                      </Link>
                      <Link
                        href="/watchlist"
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
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="BiotechTube" width={20} height={20} />
            <span
              className="text-[14px] font-semibold tracking-[-0.3px]"
              style={{ color: "var(--color-text-primary)" }}
            >
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
            <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <Image src="/logo.svg" alt="BiotechTube" width={20} height={20} />
              <span
                className="text-[14px] font-semibold tracking-[-0.3px]"
                style={{ color: "var(--color-text-primary)" }}
              >
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
                      href="/profile"
                      className="flex items-center gap-2 px-1 py-2.5 text-[14px]"
                      style={{ color: "var(--color-text-secondary)" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      <User size={16} /> Profile
                    </Link>
                    <Link
                      href="/watchlist"
                      className="flex items-center gap-2 px-1 py-2.5 text-[14px]"
                      style={{ color: "var(--color-text-secondary)" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      <List size={16} /> Watchlist
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
