"use client";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminContentPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
        <AdminNav />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 8px" }}>Content Management</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-tertiary)", margin: "0 0 16px" }}>Manage blog posts, news, and events. Coming soon.</p>
        <ul style={{ margin: 0, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Create and edit blog posts</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Scrape and curate biotech news</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Manage events calendar</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Generate weekly market recaps</li>
        </ul>
      </div>
      <Footer />
    </>
  );
}
