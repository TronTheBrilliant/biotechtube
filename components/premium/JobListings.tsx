"use client";

import { useState } from "react";
import { Briefcase, MapPin, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface Job {
  id: string;
  title: string;
  location: string | null;
  type: string;
  department: string | null;
  description: string | null;
  apply_url: string | null;
  posted_at: string;
}

interface JobListingsProps {
  jobs: Job[];
  brandColor?: string;
}

const typeBadgeColor: Record<string, { bg: string; text: string }> = {
  "Full-time": { bg: "#dcfce7", text: "#166534" },
  "Part-time": { bg: "#dbeafe", text: "#1e40af" },
  "Contract": { bg: "#ffedd5", text: "#9a3412" },
  "Remote": { bg: "#e0e7ff", text: "#3730a3" },
};

export function JobListings({ jobs, brandColor = "#1a7a5e" }: JobListingsProps) {
  const [expanded, setExpanded] = useState(false);

  if (jobs.length === 0) return null;

  const visibleJobs = expanded ? jobs : jobs.slice(0, 5);
  const hasMore = jobs.length > 5;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Briefcase size={16} style={{ color: brandColor }} />
        <h2
          className="text-[17px] font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Open Positions
        </h2>
        <span
          className="text-11 font-medium px-2 py-0.5 rounded-full"
          style={{ background: `${brandColor}15`, color: brandColor }}
        >
          {jobs.length}
        </span>
      </div>

      <div className="space-y-3">
        {visibleJobs.map((job) => {
          const badge = typeBadgeColor[job.type] || typeBadgeColor["Full-time"];

          return (
            <div
              key={job.id}
              className="rounded-xl border p-5 transition-all hover:shadow-sm"
              style={{
                background: "var(--color-bg-primary)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3
                      className="text-14 font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {job.title}
                    </h3>
                    <span
                      className="text-10 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {job.type}
                    </span>
                    {job.department && (
                      <span
                        className="text-10 font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          background: "var(--color-bg-tertiary)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {job.department}
                      </span>
                    )}
                  </div>

                  {job.location && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <MapPin size={11} style={{ color: "var(--color-text-tertiary)" }} />
                      <span className="text-12" style={{ color: "var(--color-text-tertiary)" }}>
                        {job.location}
                      </span>
                    </div>
                  )}

                  {job.description && (
                    <p
                      className="text-12 mt-2 line-clamp-2"
                      style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
                    >
                      {job.description}
                    </p>
                  )}
                </div>

                {job.apply_url && (
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-12 font-semibold px-4 py-2 rounded-lg text-white shrink-0 transition-opacity hover:opacity-90"
                    style={{ background: brandColor }}
                  >
                    Apply
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-13 font-medium mt-4 mx-auto transition-opacity hover:opacity-80"
          style={{ color: brandColor }}
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              View all {jobs.length} positions <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
