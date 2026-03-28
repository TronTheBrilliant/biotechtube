"use client";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminDataPage() {
  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6rem 1rem 2rem" }}>
        <AdminNav />
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 8px" }}>Data Explorer</h1>
        <p style={{ fontSize: 14, color: "var(--color-text-tertiary)", margin: "0 0 16px" }}>Browse and edit company data. Coming soon.</p>
        <ul style={{ margin: 0, padding: "0 0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Search and filter 11,000+ companies</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Edit company profiles inline</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>Bulk import/export data</li>
          <li style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>View and manage pipeline items</li>
        </ul>
      </div>
      <Footer />
    </>
  );
}
