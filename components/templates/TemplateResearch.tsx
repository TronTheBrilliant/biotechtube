"use client";
import { BookOpen, ScrollText } from "lucide-react";
import type { PublicationRow, PatentRow } from "@/lib/template-types";

interface Props {
  publications: PublicationRow[];
  patents: PatentRow[];
}

export function TemplateResearch({ publications, patents }: Props) {
  if (publications.length === 0 && patents.length === 0) return null;

  return (
    <section id="research" className="py-20 sm:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <SectionLabel>Research</SectionLabel>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--t-text)", letterSpacing: "-0.01em" }}>
          Scientific Output
        </h2>

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Publications */}
          {publications.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <BookOpen size={18} style={{ color: "var(--t-brand)" }} />
                <h3 style={{ fontSize: 18, fontWeight: 400, color: "var(--t-text)" }}>
                  Publications
                </h3>
                <span
                  className="ml-2 px-2 py-0.5 rounded-full"
                  style={{ fontSize: 11, background: "var(--t-brand-subtle)", color: "var(--t-brand)" }}
                >
                  {publications.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {publications.slice(0, 6).map((pub) => (
                  <div
                    key={pub.id}
                    className="p-4 rounded-lg"
                    style={{ border: "0.5px solid var(--t-border)" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t-text)", lineHeight: 1.5 }}>
                      {pub.title}
                    </div>
                    <div className="flex items-center gap-3 mt-2" style={{ fontSize: 11, color: "var(--t-text-tertiary)" }}>
                      {pub.journal && <span>{pub.journal}</span>}
                      {pub.publication_date && (
                        <span>{new Date(pub.publication_date).getFullYear()}</span>
                      )}
                    </div>
                  </div>
                ))}
                {publications.length > 6 && (
                  <p style={{ fontSize: 12, color: "var(--t-text-tertiary)" }}>
                    +{publications.length - 6} more publications
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Patents */}
          {patents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <ScrollText size={18} style={{ color: "var(--t-brand)" }} />
                <h3 style={{ fontSize: 18, fontWeight: 400, color: "var(--t-text)" }}>
                  Patents
                </h3>
                <span
                  className="ml-2 px-2 py-0.5 rounded-full"
                  style={{ fontSize: 11, background: "var(--t-brand-subtle)", color: "var(--t-brand)" }}
                >
                  {patents.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {patents.slice(0, 6).map((pat) => (
                  <div
                    key={pat.id}
                    className="p-4 rounded-lg"
                    style={{ border: "0.5px solid var(--t-border)" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t-text)", lineHeight: 1.5 }}>
                      {pat.title}
                    </div>
                    <div className="flex items-center gap-3 mt-2" style={{ fontSize: 11, color: "var(--t-text-tertiary)" }}>
                      {pat.patent_number && <span>{pat.patent_number}</span>}
                      {pat.grant_date && (
                        <span>Granted {new Date(pat.grant_date).getFullYear()}</span>
                      )}
                    </div>
                  </div>
                ))}
                {patents.length > 6 && (
                  <p style={{ fontSize: 12, color: "var(--t-text-tertiary)" }}>
                    +{patents.length - 6} more patents
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t-brand)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
      {children}
    </div>
  );
}
