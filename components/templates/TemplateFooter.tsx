"use client";
import { ExternalLink, MapPin, Globe } from "lucide-react";

interface Props {
  companyName: string;
  website: string | null;
  country: string | null;
  city: string | null;
  ticker: string | null;
  founded: number | null;
  sectors: string[];
  brandColor: string;
}

export function TemplateFooter({ companyName, website, country, city, ticker, founded, sectors, brandColor }: Props) {
  const location = [city, country].filter(Boolean).join(", ");
  const websiteUrl = website && (website.startsWith("http") ? website : `https://${website}`);
  const domain = website?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <footer
      id="contact"
      className="py-20 sm:py-28"
      style={{ background: "var(--color-bg-secondary)", borderTop: "0.5px solid var(--color-border-subtle)" }}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left: company info */}
          <div>
            <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Contact
            </span>
            <h2 className="mt-3" style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 300, color: "var(--color-text-primary)" }}>
              Get in Touch with {companyName}
            </h2>
            <div className="flex flex-col gap-3 mt-8">
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition-opacity hover:opacity-70"
                  style={{ fontSize: 14, color: brandColor }}
                >
                  <Globe size={14} />
                  {domain}
                  <ExternalLink size={12} />
                </a>
              )}
              {location && (
                <div className="flex items-center gap-2" style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                  <MapPin size={14} />
                  {location}
                </div>
              )}
            </div>

            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-8 px-6 py-3 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: brandColor, color: "white", fontSize: 14, fontWeight: 500 }}
              >
                Visit Official Website
              </a>
            )}
          </div>

          {/* Right: quick facts */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 16 }}>
              Quick Facts
            </h3>
            <div className="flex flex-col gap-3">
              {ticker && (
                <div className="flex justify-between py-2" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Ticker</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{ticker}</span>
                </div>
              )}
              {founded && (
                <div className="flex justify-between py-2" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Founded</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{founded}</span>
                </div>
              )}
              {location && (
                <div className="flex justify-between py-2" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Headquarters</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{location}</span>
                </div>
              )}
              {sectors.length > 0 && (
                <div className="flex justify-between py-2" style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Sector</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{sectors.join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Powered by badge */}
        <div className="mt-16 pt-8 flex items-center justify-between" style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}>
          <a
            href="https://biotechtube.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-opacity hover:opacity-80"
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            <svg width={14} height={14} viewBox="0 0 129.82 123.26" fill="currentColor">
              <path d="M40.72,70.04c7.72-8.9,8.03-21.18.44-30.28C30.03,26.39,7.36,24.33,8.06.02l-5.75.05c-1.63,12.16,3.81,23.27,13.62,30.52l-7.19,5.45c-3.64,2.76-5.94,6.87-7.52,11.19-4.77,13.02,5.34,23.33,14.03,31.14l6.69-5.23c-2.83-2.61-4.9-4.45-7.55-7.44l17.27-.31c.58-.01,1.48-1.65,1.13-2.1-.3-.38-1.27-.89-1.79-.89l-18.82.03c-1.48-1.88-2.4-3.84-3.08-6.54l25.29.07c.53,0,1.5-.74,1.68-1.21.18-.47-.8-1.7-1.35-1.7l-25.62-.11c.2-2.48.71-4.09,1.69-6.17h19.69c.67,0,1.69-1.12,1.59-1.73-.08-.5-1.09-1.37-1.62-1.37l-17.26-.09c2.96-3.37,6.41-5.58,10.04-8.11,4.3,2.6,7.98,5.23,11.07,8.85,4.79,6.11,5.37,14.02.74,20.51-2.93,4.12-7.09,7.27-11.17,10.36-4.94,3.74-9.61,7.26-14.03,11.6C-1,97.46-.35,110.5,6.42,123.19c2.56-13.98-.68-20.94,9.76-32.06,8.64-7.97,16.69-12.06,24.54-21.1Z" />
              <path d="M115.68,56.18c7-10.81,8.22-23.82,3.03-35.32C113.11,8.47,101.03,1.09,87.48.59l-39.45.05,2.25,6.73,35.66-.04c17.49-.02,30.78,14.09,28.96,31.53-.78,7.43-4.21,13.9-10.28,18.94,12.35,5.78,19.65,17.39,18.12,31.21-2.28,14.79-14.52,27.25-29.92,27.35l-44.48.29-3.16,6.6h47.17c17.23-.75,31.56-12.03,36.16-28.6,3.97-14.28-1.33-28.96-12.84-38.48Z" />
            </svg>
            Powered by BiotechTube
          </a>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Data updated daily
          </span>
        </div>
      </div>
    </footer>
  );
}
