"use client";
import { useState } from "react";
import { BookOpen, ScrollText, ExternalLink, ChevronDown } from "lucide-react";
import type { PublicationRow, PatentRow } from "@/lib/template-types";

interface Props {
  publications: PublicationRow[];
  patents: PatentRow[];
  brandColor: string;
}

export function TemplateResearch({ publications, patents, brandColor }: Props) {
  const [showAllPubs, setShowAllPubs] = useState(false);
  const [showAllPatents, setShowAllPatents] = useState(false);

  if (publications.length === 0 && patents.length === 0) return null;

  const visiblePubs = showAllPubs ? publications : publications.slice(0, 6);
  const visiblePatents = showAllPatents ? patents : patents.slice(0, 6);

  return (
    <section id="research" className="py-20 sm:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center gap-2">
          <BookOpen size={14} style={{ color: brandColor }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Research
          </span>
        </div>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
          Scientific Output
        </h2>
        <p className="mt-3" style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>
          {publications.length} publication{publications.length !== 1 ? "s" : ""} and {patents.length} patent{patents.length !== 1 ? "s" : ""} in the portfolio.
        </p>

        <div className="grid md:grid-cols-2 gap-10 mt-12">
          {/* Publications */}
          {publications.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <h3 style={{ fontSize: 18, fontWeight: 400, color: "var(--color-text-primary)" }}>
                  Publications
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ fontSize: 11, background: `${brandColor}12`, color: brandColor }}
                >
                  {publications.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {visiblePubs.map((pub) => (
                  <a
                    key={pub.id}
                    href={pub.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/` : "#"}
                    target={pub.pmid ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl transition-all"
                    style={{
                      border: "0.5px solid var(--color-border-subtle)",
                      background: "var(--color-bg-primary)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className="group-hover:underline"
                          style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.5 }}
                        >
                          {pub.title}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {pub.journal && <span className="italic">{pub.journal}</span>}
                          {pub.publication_date && (
                            <span>{new Date(pub.publication_date).getFullYear()}</span>
                          )}
                        </div>
                      </div>
                      {pub.pmid && (
                        <ExternalLink size={13} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: brandColor }} />
                      )}
                    </div>
                  </a>
                ))}
              </div>
              {publications.length > 6 && (
                <button
                  onClick={() => setShowAllPubs(!showAllPubs)}
                  className="flex items-center gap-1 mt-4 mx-auto transition-opacity hover:opacity-70"
                  style={{ fontSize: 12, color: brandColor, fontWeight: 500 }}
                >
                  {showAllPubs ? "Show less" : `Show all ${publications.length}`}
                  <ChevronDown size={14} style={{ transform: showAllPubs ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
              )}
            </div>
          )}

          {/* Patents */}
          {patents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <h3 style={{ fontSize: 18, fontWeight: 400, color: "var(--color-text-primary)" }}>
                  Patents
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ fontSize: 11, background: `${brandColor}12`, color: brandColor }}
                >
                  {patents.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {visiblePatents.map((pat) => (
                  <a
                    key={pat.id}
                    href={pat.patent_number ? `https://patents.google.com/patent/US${pat.patent_number}` : "#"}
                    target={pat.patent_number ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl transition-all"
                    style={{
                      border: "0.5px solid var(--color-border-subtle)",
                      background: "var(--color-bg-primary)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className="group-hover:underline"
                          style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.5 }}
                        >
                          {pat.title}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {pat.patent_number && <span>US{pat.patent_number}</span>}
                          {pat.grant_date && (
                            <span>Granted {new Date(pat.grant_date).getFullYear()}</span>
                          )}
                        </div>
                      </div>
                      {pat.patent_number && (
                        <ExternalLink size={13} className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: brandColor }} />
                      )}
                    </div>
                  </a>
                ))}
              </div>
              {patents.length > 6 && (
                <button
                  onClick={() => setShowAllPatents(!showAllPatents)}
                  className="flex items-center gap-1 mt-4 mx-auto transition-opacity hover:opacity-70"
                  style={{ fontSize: 12, color: brandColor, fontWeight: 500 }}
                >
                  {showAllPatents ? "Show less" : `Show all ${patents.length}`}
                  <ChevronDown size={14} style={{ transform: showAllPatents ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
