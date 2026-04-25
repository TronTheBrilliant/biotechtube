// biotechtube/app/research/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";
import { getOrGeneratePreview } from "@/lib/reports/preview";
import { ResearchPreviewClient } from "./ResearchPreviewClient";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createServerClient();
  const { data: company } = await supabase.from("companies").select("name").eq("slug", params.slug).single();
  if (!company) return { title: "Equity Research — BiotechTube" };
  return {
    title: `${company.name} Equity Research Memo — BiotechTube`,
    description: `Premium AI-generated equity research memo on ${company.name}. Pipeline, catalysts, bull/bear, SEC highlights, and more.`,
  };
}

export default async function ResearchPreviewPage({ params }: { params: { slug: string } }) {
  const supabase = createServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, ticker, website")
    .eq("slug", params.slug)
    .single();
  if (!company) notFound();

  let preview: any = null;
  try { preview = await getOrGeneratePreview(company.id, company.name); } catch {}

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-10">
        <ResearchPreviewClient company={company} preview={preview} />
      </main>
      <Footer />
    </div>
  );
}
