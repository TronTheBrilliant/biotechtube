"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AddCompanyInput } from "./AddCompanyInput";

const SUGGESTED_COMPARISONS: { label: string; slugs: string[]; subtitle: string }[] = [
  {
    label: "Big pharma triumvirate",
    slugs: ["eli-lilly", "johnson-and-johnson", "abbvie"],
    subtitle: "Eli Lilly · J&J · AbbVie",
  },
  {
    label: "GLP-1 race",
    slugs: ["eli-lilly", "novo-nordisk"],
    subtitle: "Eli Lilly · Novo Nordisk",
  },
  {
    label: "Oncology heavyweights",
    slugs: ["roche", "merck", "bristol-myers-squibb"],
    subtitle: "Roche · Merck · Bristol-Myers Squibb",
  },
  {
    label: "Cell + gene therapy",
    slugs: ["vertex-pharmaceuticals", "moderna", "regeneron-pharmaceuticals"],
    subtitle: "Vertex · Moderna · Regeneron",
  },
];

export function CompareEmptyState() {
  const router = useRouter();

  function pickFirst(slug: string) {
    router.replace(`/compare?slugs=${slug}`);
  }

  return (
    <div
      style={{
        background: "var(--color-bg-primary)",
        border: "0.5px solid var(--color-border-subtle)",
        borderRadius: 12,
        padding: "32px 28px",
      }}
    >
      <div className="max-w-[520px] mx-auto text-center">
        <h2
          className="text-[18px] font-semibold mb-2"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.2px" }}
        >
          Pick a company to start.
        </h2>
        <p
          className="mb-6"
          style={{
            fontSize: 14,
            color: "var(--color-text-secondary)",
            lineHeight: 1.55,
          }}
        >
          Search for a biotech to seed the comparison. Add up to two more once
          the first column is in place.
        </p>
        <div className="mb-6">
          <AddCompanyInput
            onAdd={pickFirst}
            size="lg"
            placeholder="Search 14,000+ biotechs by name or ticker"
          />
        </div>
      </div>

      <div
        className="mt-8 pt-6"
        style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}
      >
        <span
          className="block mb-3 text-[11px] font-semibold uppercase"
          style={{ letterSpacing: "0.5px", color: "var(--color-text-tertiary)" }}
        >
          Or start from a suggested comparison
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTED_COMPARISONS.map((s) => (
            <Link
              key={s.label}
              href={`/compare?slugs=${s.slugs.join(",")}`}
              className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-secondary)]"
              style={{
                border: "0.5px solid var(--color-border-subtle)",
                background: "var(--color-bg-secondary)",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--color-text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  {s.subtitle}
                </div>
              </div>
              <ArrowRight
                size={14}
                strokeWidth={2}
                style={{ color: "var(--color-text-tertiary)" }}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
