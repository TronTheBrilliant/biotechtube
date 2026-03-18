"use client";

import { FileText } from "lucide-react";
import { Publication } from "@/lib/types";

interface PublicationsListProps {
  publications: Publication[];
}

export function PublicationsList({ publications }: PublicationsListProps) {
  return (
    <div className="flex flex-col gap-2">
      {publications.map((pub, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 py-2.5 border-b cursor-pointer transition-colors duration-100"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--color-bg-secondary)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          <FileText
            size={14}
            className="mt-[2px] flex-shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-12 font-medium mb-[2px] line-clamp-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              {pub.title}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-10" style={{ color: "var(--color-text-secondary)" }}>
                {pub.journal}
              </span>
              <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                {pub.date}
              </span>
              {pub.isPdf && (
                <span
                  className="text-[9px] px-1.5 py-[1px] rounded-sm font-medium"
                  style={{
                    background: "#fdf0ef",
                    color: "#c0392b",
                    border: "0.5px solid #f09595",
                  }}
                >
                  PDF
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
