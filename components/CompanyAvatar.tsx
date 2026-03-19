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
  const domain = website || (logoUrl ? logoUrl.replace("https://logo.clearbit.com/", "") : null);
  const logoDevUrl = domain ? `https://img.logo.dev/${domain}?token=pk_SB20mg_eQSKlYGsYYMKbcA` : null;

  if (logoDevUrl && !failed) {
    return (
      <div
        className={`rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
        style={{
          width: size, height: size,
          background: "white",
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
