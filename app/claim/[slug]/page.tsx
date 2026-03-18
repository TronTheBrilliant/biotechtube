import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import companies from "@/data/companies.json";
import { Company } from "@/lib/types";

const typedCompanies = companies as Company[];

export function generateStaticParams() {
  return typedCompanies.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const company = typedCompanies.find((c) => c.slug === params.slug);
  return {
    title: company
      ? `Claim ${company.name} | BiotechTube`
      : "Claim Profile | BiotechTube",
  };
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

export default function ClaimProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const company = typedCompanies.find((c) => c.slug === params.slug);
  const companyName = company?.name ?? params.slug;
  const initials = getInitials(companyName);

  const card = (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 22,
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        {initials}
      </div>

      {/* Company name */}
      <p
        style={{
          color: "var(--color-text-secondary)",
          fontSize: 14,
          marginBottom: 28,
        }}
      >
        {companyName}
      </p>

      {/* Heading */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 500,
          color: "var(--color-text-primary)",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Claim this profile
      </h1>

      {/* Description */}
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          textAlign: "center",
          lineHeight: 1.6,
          marginBottom: 32,
          maxWidth: 380,
        }}
      >
        Is this your company? Verify your email to take ownership of this
        profile&nbsp;&mdash; it&rsquo;s free.
      </p>

      {/* Form */}
      <form
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <label
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          Work email
        </label>
        <input
          type="email"
          placeholder="you@company.com"
          className="w-full text-13 px-3 py-2 rounded border outline-none"
          style={{
            borderColor: "var(--color-border-medium)",
            background: "var(--color-bg-primary)",
            color: "var(--color-text-primary)",
            borderWidth: "0.5px",
          }}
        />
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            marginTop: 2,
            marginBottom: 20,
          }}
        >
          We&rsquo;ll send a 6-digit code to verify you work at {companyName}
        </p>

        <Link
          href={`/claim/${params.slug}/verify`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "10px 0",
            background: "var(--color-accent)",
            color: "#fff",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Send verification code&nbsp;&rarr;
        </Link>
      </form>

      {/* Wrong company */}
      <p
        style={{
          marginTop: 24,
          fontSize: 13,
          color: "var(--color-text-tertiary)",
        }}
      >
        Wrong company?{" "}
        <Link
          href={`/company/${params.slug}`}
          style={{ color: "var(--color-accent)", textDecoration: "none" }}
        >
          Go back
        </Link>
      </p>
    </div>
  );

  return (
    <div
      style={{
        background: "var(--color-bg-primary)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Nav />
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        {card}
      </main>
      <Footer />
    </div>
  );
}
