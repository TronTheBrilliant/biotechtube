"use client";

import Link from "next/link";

export function Nav() {
  return (
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
          {["Rankings", "Pitches", "Sponsors", "Templates"].map((item) => (
            <Link
              key={item}
              href="#"
              className="text-12 transition-colors duration-150"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-text-secondary)")
              }
            >
              {item}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
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
    </header>
  );
}
