"use client";

import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";

interface SmallCapItem {
  rank: number;
  product_name: string;
  company_name: string;
  indication: string | null;
  stage: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
  company_website: string | null;
}

interface Props {
  items: SmallCapItem[];
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "Phase 3": { bg: "rgba(22,163,74,0.08)", text: "#16a34a" },
  "Phase 2/3": { bg: "rgba(22,163,74,0.08)", text: "#16a34a" },
  "Phase 2": { bg: "rgba(59,130,246,0.08)", text: "#3b82f6" },
  "Phase 1/2": { bg: "rgba(59,130,246,0.08)", text: "#3b82f6" },
  "Phase 1": { bg: "rgba(234,179,8,0.08)", text: "#ca8a04" },
  Approved: { bg: "rgba(168,85,247,0.08)", text: "#9333ea" },
};

export default function SmallCapWatch({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <p
        className="px-4 py-2 text-12 leading-relaxed"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Early-stage companies with breakthrough potential. Drugs from sub-$1B companies showing outsized clinical promise.
      </p>
      {items.map((item, i) => {
        const colors = STAGE_COLORS[item.stage || ""] || { bg: "#f3f4f6", text: "#6b7280" };
        return (
          <div
            key={item.slug || `item-${i}`}
            className="px-4 py-2.5 flex items-center gap-3 transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
            style={
              i < items.length - 1
                ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
                : undefined
            }
          >
            <span
              className="text-12 font-bold w-5 text-center flex-shrink-0"
              style={{ color: i < 3 ? "var(--color-accent)" : "var(--color-text-tertiary)" }}
            >
              {item.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {item.slug ? (
                  <Link
                    href={`/product/${item.slug}`}
                    className="text-13 font-medium truncate hover:underline"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {item.product_name}
                  </Link>
                ) : (
                  <span className="text-13 font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                    {item.product_name}
                  </span>
                )}
                {item.stage && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {item.stage}
                  </span>
                )}
              </div>
              <div className="text-11 truncate flex items-center gap-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                {item.company_slug ? (
                  <Link
                    href={`/company/${item.company_slug}`}
                    className="inline-flex items-center gap-1 hover:underline"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <CompanyAvatar
                      name={item.company_name}
                      logoUrl={item.company_logo_url ?? undefined}
                      website={item.company_website ?? undefined}
                      size={14}
                    />
                    {item.company_name}
                  </Link>
                ) : (
                  <span style={{ color: "var(--color-text-secondary)" }}>{item.company_name}</span>
                )}
                {item.indication && (
                  <>
                    <span>&middot;</span>
                    <span className="truncate">{item.indication}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
