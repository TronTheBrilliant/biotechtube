"use client";

import Image from "next/image";
import Link from "next/link";
import { FollowButton } from "./FollowButton";
import { useAuth } from "@/lib/auth";

// Hardcoded top companies for v1 (sorted by market cap / prominence)
const TRENDING_COMPANIES = [
  { id: "novartis", name: "Novartis", slug: "novartis", logo_url: null },
  { id: "roche", name: "Roche", slug: "roche", logo_url: null },
  { id: "astrazeneca", name: "AstraZeneca", slug: "astrazeneca", logo_url: null },
  { id: "biontech", name: "BioNTech", slug: "biontech", logo_url: null },
  { id: "regeneron", name: "Regeneron", slug: "regeneron", logo_url: null },
];

const SUGGESTED_COMPANIES = [
  { id: "moderna", name: "Moderna", slug: "moderna", logo_url: null },
  { id: "gilead", name: "Gilead Sciences", slug: "gilead", logo_url: null },
  { id: "vertex", name: "Vertex Pharma", slug: "vertex", logo_url: null },
];

function CompanyRow({
  company,
  userId,
}: {
  company: { id: string; name: string; slug: string; logo_url: string | null };
  userId?: string;
}) {
  const initials = company.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 8,
        marginBottom: 8,
        borderBottom: "0.5px solid var(--color-border-subtle)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {company.logo_url ? (
          <Image
            src={company.logo_url}
            alt={company.name}
            width={24}
            height={24}
            style={{ borderRadius: "50%", objectFit: "cover", border: "0.5px solid var(--color-border-subtle)", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--color-accent-subtle)",
              border: "0.5px solid var(--color-border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 500,
              color: "var(--color-accent)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <Link
          href={`/company/${company.slug}`}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            textDecoration: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {company.name}
        </Link>
      </div>
      <FollowButton
        followingId={company.id}
        followingType="company"
        userId={userId}
      />
    </div>
  );
}

export function FeedSidebar() {
  const { user } = useAuth();

  return (
    <aside style={{ position: "sticky", top: 72, alignSelf: "flex-start" }}>
      {/* Trending Companies */}
      <div
        style={{
          background: "var(--color-bg-secondary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "var(--color-text-tertiary)",
            margin: "0 0 12px",
          }}
        >
          Trending Companies
        </h3>
        {TRENDING_COMPANIES.map((company, i) => (
          <CompanyRow
            key={company.id}
            company={company}
            userId={user?.id}
          />
        ))}
      </div>

      {/* Suggested Follows */}
      <div
        style={{
          background: "var(--color-bg-secondary)",
          border: "0.5px solid var(--color-border-subtle)",
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <h3
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "var(--color-text-tertiary)",
            margin: "0 0 12px",
          }}
        >
          Suggested Follows
        </h3>
        {SUGGESTED_COMPANIES.map((company) => (
          <CompanyRow
            key={company.id}
            company={company}
            userId={user?.id}
          />
        ))}
      </div>
    </aside>
  );
}
