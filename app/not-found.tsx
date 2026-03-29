import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Nav />
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "8rem 1rem 4rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "var(--color-text-tertiary)",
            margin: "0 0 8px",
            lineHeight: 1,
          }}
        >
          404
        </h1>
        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            margin: "0 0 8px",
          }}
        >
          Page not found
        </p>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-text-secondary)",
            margin: "0 0 32px",
          }}
        >
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            href="/"
            style={{
              padding: "10px 20px",
              background: "var(--color-text-primary)",
              color: "var(--color-bg-primary)",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Go home
          </Link>
          <Link
            href="/companies"
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "1px solid var(--color-border-subtle)",
              color: "var(--color-text-secondary)",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Browse companies
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
