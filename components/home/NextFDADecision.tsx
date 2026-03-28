"use client";

import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";

interface FDADecision {
  drug_name: string;
  company_name: string | null;
  decision_date: string;
  decision_type: string | null;
  indication: string | null;
  slug: string | null;
  company_slug: string | null;
  company_logo_url: string | null;
}

interface Props {
  decisions: FDADecision[];
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NextFDADecision({ decisions }: Props) {
  if (!decisions || decisions.length === 0) return null;

  return (
    <div>
      <p
        className="px-4 py-2 text-12 leading-relaxed"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Upcoming FDA decisions that could move markets. Track PDUFA dates and advisory committee meetings.
      </p>
      {decisions.map((d, i) => {
        const days = daysUntil(d.decision_date);
        const isUrgent = days <= 7;
        return (
          <div
            key={`fda-${i}`}
            className="px-4 py-3 transition-colors duration-100 hover:bg-[var(--color-bg-secondary)]"
            style={
              i < decisions.length - 1
                ? { borderBottom: "0.5px solid var(--color-border-subtle)" }
                : undefined
            }
          >
            <div className="flex items-start gap-3">
              {/* Date badge */}
              <div
                className="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-center"
                style={{
                  background: isUrgent ? "rgba(239,68,68,0.08)" : "rgba(99,102,241,0.06)",
                  border: isUrgent ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(99,102,241,0.1)",
                  minWidth: 56,
                }}
              >
                <div className="text-[10px] font-bold uppercase" style={{ color: isUrgent ? "#ef4444" : "var(--color-accent)" }}>
                  {formatDateShort(d.decision_date)}
                </div>
                <div className="text-[11px] font-bold" style={{ color: isUrgent ? "#ef4444" : "var(--color-text-primary)" }}>
                  {days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`}
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {d.slug ? (
                    <Link
                      href={`/product/${d.slug}`}
                      className="text-13 font-semibold hover:underline"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {d.drug_name}
                    </Link>
                  ) : (
                    <span className="text-13 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {d.drug_name}
                    </span>
                  )}
                  {d.decision_type && (
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(99,102,241,0.08)", color: "var(--color-accent)" }}
                    >
                      {d.decision_type}
                    </span>
                  )}
                </div>
                <div className="text-11 mt-0.5 flex items-center gap-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                  {d.company_name && (
                    <>
                      {d.company_slug ? (
                        <Link
                          href={`/company/${d.company_slug}`}
                          className="inline-flex items-center gap-1 hover:underline"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {d.company_logo_url && (
                            <CompanyAvatar
                              name={d.company_name}
                              logoUrl={d.company_logo_url}
                              size={14}
                            />
                          )}
                          {d.company_name}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--color-text-secondary)" }}>{d.company_name}</span>
                      )}
                    </>
                  )}
                  {d.indication && (
                    <>
                      <span>&middot;</span>
                      <span className="truncate">{d.indication}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
