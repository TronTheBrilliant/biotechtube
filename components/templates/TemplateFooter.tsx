"use client";

interface Props {
  companyName: string;
  website: string | null;
  country: string | null;
  city: string | null;
}

export function TemplateFooter({ companyName, website, country, city }: Props) {
  const location = [city, country].filter(Boolean).join(", ");

  return (
    <footer
      id="contact"
      className="py-20 sm:py-28"
      style={{ background: "var(--t-bg-secondary)", borderTop: "0.5px solid var(--t-border)" }}
    >
      <div className="max-w-[1200px] mx-auto px-6 text-center">
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--t-brand)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Contact
        </div>
        <h2 className="mt-3" style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 300, color: "var(--t-text)" }}>
          Get in Touch
        </h2>

        <div className="flex flex-wrap justify-center gap-6 mt-8">
          {website && (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg transition-opacity hover:opacity-80"
              style={{
                background: "var(--t-brand)",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Visit Website
            </a>
          )}
        </div>

        {location && (
          <p className="mt-6" style={{ fontSize: 14, color: "var(--t-text-tertiary)" }}>
            {location}
          </p>
        )}

        {/* Powered by badge */}
        <div className="mt-16 pt-8" style={{ borderTop: "0.5px solid var(--t-border)" }}>
          <a
            href="https://biotechtube.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-opacity hover:opacity-80"
            style={{
              fontSize: 11,
              color: "var(--t-text-tertiary)",
              border: "0.5px solid var(--t-border)",
            }}
          >
            <svg width={14} height={14} viewBox="0 0 129.82 123.26" fill="currentColor">
              <path d="M40.72,70.04c7.72-8.9,8.03-21.18.44-30.28C30.03,26.39,7.36,24.33,8.06.02l-5.75.05c-1.63,12.16,3.81,23.27,13.62,30.52l-7.19,5.45c-3.64,2.76-5.94,6.87-7.52,11.19-4.77,13.02,5.34,23.33,14.03,31.14l6.69-5.23c-2.83-2.61-4.9-4.45-7.55-7.44l17.27-.31c.58-.01,1.48-1.65,1.13-2.1-.3-.38-1.27-.89-1.79-.89l-18.82.03c-1.48-1.88-2.4-3.84-3.08-6.54l25.29.07c.53,0,1.5-.74,1.68-1.21.18-.47-.8-1.7-1.35-1.7l-25.62-.11c.2-2.48.71-4.09,1.69-6.17h19.69c.67,0,1.69-1.12,1.59-1.73-.08-.5-1.09-1.37-1.62-1.37l-17.26-.09c2.96-3.37,6.41-5.58,10.04-8.11,4.3,2.6,7.98,5.23,11.07,8.85,4.79,6.11,5.37,14.02.74,20.51-2.93,4.12-7.09,7.27-11.17,10.36-4.94,3.74-9.61,7.26-14.03,11.6C-1,97.46-.35,110.5,6.42,123.19c2.56-13.98-.68-20.94,9.76-32.06,8.64-7.97,16.69-12.06,24.54-21.1Z" />
              <path d="M115.68,56.18c7-10.81,8.22-23.82,3.03-35.32C113.11,8.47,101.03,1.09,87.48.59l-39.45.05,2.25,6.73,35.66-.04c17.49-.02,30.78,14.09,28.96,31.53-.78,7.43-4.21,13.9-10.28,18.94,12.35,5.78,19.65,17.39,18.12,31.21-2.28,14.79-14.52,27.25-29.92,27.35l-44.48.29-3.16,6.6h47.17c17.23-.75,31.56-12.03,36.16-28.6,3.97-14.28-1.33-28.96-12.84-38.48Z" />
            </svg>
            Powered by BiotechTube
          </a>
        </div>
      </div>
    </footer>
  );
}
