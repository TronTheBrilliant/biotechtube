"use client";

import Link from "next/link";
import { Company } from "@/lib/types";
import { CompanyAvatar } from "@/components/CompanyAvatar";

interface SimilarCompaniesProps {
  companies: Company[];
}

export function SimilarCompanies({ companies }: SimilarCompaniesProps) {
  return (
    <div>
      <div className="px-3.5 py-2.5 border-b">
        <span
          className="text-12 uppercase tracking-[0.5px] font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          SIMILAR COMPANIES
        </span>
      </div>
      {companies.map((c) => (
        <Link
          key={c.slug}
          href={`/company/${c.slug}`}
          className="flex items-center gap-2 px-3.5 py-2 border-b cursor-pointer transition-colors duration-100"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--color-bg-secondary)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          <CompanyAvatar name={c.name} logoUrl={c.logoUrl} website={c.website} size={24} />
          <div className="min-w-0">
            <div
              className="text-13 font-medium truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {c.name}
            </div>
            <div className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
              {c.stage} · {c.city}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
