"use client";
import { useState } from "react";
import Image from "next/image";

interface CompanyAvatarProps {
  name: string;
  logoUrl?: string;
  size?: number; // px - default 28
  className?: string;
}

export function CompanyAvatar({ name, logoUrl, size = 28, className = "" }: CompanyAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  if (logoUrl && !failed) {
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
        <Image
          src={logoUrl}
          alt={name}
          width={size - 4}
          height={size - 4}
          className="object-contain"
          onError={() => setFailed(true)}
          unoptimized
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
