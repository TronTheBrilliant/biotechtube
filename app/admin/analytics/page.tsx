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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 8px" }}>Analytics</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Platform health trends and insights. Coming soon.</p>
      </div>
      <Footer />
    </>
  );
}
