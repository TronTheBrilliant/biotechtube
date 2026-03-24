"use client";
import { useState } from "react";

interface CompanyAvatarProps {
  name: string;
  logoUrl?: string;
  website?: string;
  size?: number;
  className?: string;
}

export function CompanyAvatar({ name, logoUrl, website, size = 28, className = "" }: CompanyAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  // Use Logo.dev service with the company website domain
  let domain: string | null = null;

  // Priority 1: website field (most reliable)
  if (website) {
    domain = website;
  }
  // Priority 2: extract domain from logoUrl
  if (!domain && logoUrl) {
    // Handle logo.dev URLs: "https://img.logo.dev/sanofi.com?token=..." -> "sanofi.com"
    const logoDevMatch = logoUrl.match(/img\.logo\.dev\/([^?]+)/);
    if (logoDevMatch) {
      domain = logoDevMatch[1];
    }
    // Handle clearbit URLs
    else if (logoUrl.includes("logo.clearbit.com/")) {
      domain = logoUrl.replace("https://logo.clearbit.com/", "");
    }
    else {
      domain = logoUrl;
    }
  }

  // Priority 3: guess domain from company name (works for most biotechs)
  if (!domain && name) {
    // "Tango Therapeutics" -> "tangotherapeutics.com"
    // "Day One Biopharmaceuticals" -> "dayonebio.com" won't match, but many will
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (slug.length > 2) {
      domain = slug + ".com";
    }
  }

  // Clean up domain: extract bare domain from full URLs
  if (domain) {
    try {
      if (domain.includes("://")) {
        domain = new URL(domain).hostname;
      } else if (domain.includes("/")) {
        domain = domain.split("/")[0];
      }
      domain = domain.replace(/^www\./, "");
    } catch {
      // keep as-is
    }
  }
  const logoDevUrl = domain ? `https://img.logo.dev/${domain}?token=pk_FNHUWoZORpiR_7j_vzFnmQ` : null;

  if (logoDevUrl && !failed) {
    return (
      <div
        className={`rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
        style={{
          width: size, height: size,
          background: "var(--color-bg-primary)",
          border: "0.5px solid var(--color-border-subtle)",
          padding: 2,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDevUrl}
          alt={name}
          width={size - 4}
          height={size - 4}
          style={{ objectFit: "contain", borderRadius: 2 }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  // Fallback initials
  return (
    <div
      className={`rounded-md flex items-center justify-center flex-shrink-0 border ${className}`}
      style={{
        width: size, height: size,
        background: "var(--color-bg-secondary)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      <span
        style={{
          fontSize: size < 30 ? 9 : size < 50 ? 14 : 18,
          fontWeight: 500,
          color: "var(--color-text-secondary)",
        }}
      >
        {initials}
      </span>
    </div>
  );
}
