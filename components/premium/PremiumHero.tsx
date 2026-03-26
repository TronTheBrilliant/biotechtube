"use client";

import { CompanyAvatar } from "@/components/CompanyAvatar";
import { ShieldCheck } from "lucide-react";

interface PremiumHeroProps {
  company: {
    name: string;
    logo_url?: string | null;
    website?: string | null;
    city?: string | null;
    country?: string | null;
  };
  brandColor: string;
  tagline?: string;
  isVerified: boolean;
}

export function PremiumHero({ company, brandColor, tagline, isVerified }: PremiumHeroProps) {
  const location = [company.city, company.country].filter(Boolean).join(", ");

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${brandColor}12 0%, ${brandColor}06 50%, transparent 100%)`,
        border: `1px solid ${brandColor}20`,
      }}
    >
      {/* Subtle gradient accent bar at top */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, transparent)`,
        }}
      />

      <div className="px-8 py-10 sm:px-12 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Large logo */}
          <div
            className="rounded-xl overflow-hidden flex-shrink-0"
            style={{
              boxShadow: `0 4px 24px ${brandColor}15`,
              border: `2px solid ${brandColor}20`,
            }}
          >
            <CompanyAvatar
              name={company.name}
              logoUrl={company.logo_url ?? undefined}
              website={company.website ?? undefined}
              size={80}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-[28px] sm:text-[34px] font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {company.name}
              </h1>

              {isVerified && (
                <span
                  className="inline-flex items-center gap-1.5 text-12 font-semibold px-3 py-1 rounded-full text-white whitespace-nowrap"
                  style={{ background: brandColor }}
                >
                  <ShieldCheck size={13} />
                  Verified Company
                </span>
              )}
            </div>

            {tagline && (
              <p
                className="text-[16px] sm:text-[18px] mt-2 leading-relaxed max-w-2xl"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {tagline}
              </p>
            )}

            {location && (
              <p className="text-13 mt-2" style={{ color: "var(--color-text-tertiary)" }}>
                {location}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
