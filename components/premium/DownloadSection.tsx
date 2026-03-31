"use client";

import { FileDown, FileText } from "lucide-react";

interface DownloadSectionProps {
  investorDeckUrl: string;
  brandColor?: string;
}

export function DownloadSection({ investorDeckUrl, brandColor = "#059669" }: DownloadSectionProps) {
  if (!investorDeckUrl) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} style={{ color: brandColor }} />
        <h2
          className="text-[17px] font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Investor Resources
        </h2>
      </div>

      <a
        href={investorDeckUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-xl border p-5 transition-all hover:shadow-md group"
        style={{
          background: "var(--color-bg-primary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${brandColor}12` }}
        >
          <FileDown size={22} style={{ color: brandColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="text-14 font-semibold group-hover:underline"
            style={{ color: "var(--color-text-primary)" }}
          >
            Investor Deck
          </h3>
          <p className="text-12 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            Download our latest investor presentation
          </p>
        </div>

        <span
          className="text-12 font-medium px-3 py-1.5 rounded-lg shrink-0 transition-opacity group-hover:opacity-90 text-white"
          style={{ background: brandColor }}
        >
          Download
        </span>
      </a>
    </div>
  );
}
