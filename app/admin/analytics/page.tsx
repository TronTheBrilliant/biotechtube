"use client";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminAnalyticsPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
        <AdminNav />
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 8px" }}>Analytics</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-tertiary)", margin: "0 0 16px" }}>Platform health trends and insights. Coming soon.</p>
        <ul style={{ margin: 0, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Data completeness trends over time</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Agent performance metrics</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Page view analytics</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>SEO performance tracking</li>
        </ul>
      </div>
      <Footer />
    </>
  );
}
