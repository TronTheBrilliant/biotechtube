import { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — BiotechTube",
  description: "BiotechTube terms of service.",
};

export default function TermsPage() {
  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1
          className="text-2xl font-medium mb-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          Terms of Service
        </h1>
        <p
          className="text-13"
          style={{ color: "var(--color-text-secondary)" }}
        >
          This page is under construction.
        </p>
      </main>

      <Footer />
    </div>
  );
}
