// biotechtube/app/research/thanks/[purchase_id]/page.tsx
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";
import { ThanksClient } from "./ThanksClient";

// purchase_id in the URL is actually the Stripe session_id.
// The post-checkout route handler already set the cookie; this page just renders.
export default async function ThanksPage({ params }: { params: { purchase_id: string } }) {
  const supabase = createServerClient();
  const { data: purchase } = await supabase
    .from("equity_report_purchases")
    .select("id, status, tier, company_id, equity_report_id, live_access_expires_at, stripe_session_id, buyer_email")
    .eq("stripe_session_id", params.purchase_id)
    .maybeSingle();
  if (!purchase) notFound();

  const { data: company } = await supabase.from("companies").select("name, slug").eq("id", purchase.company_id).single();

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-[760px] mx-auto px-4 py-12">
        <ThanksClient purchase={purchase} company={company} />
      </main>
      <Footer />
    </div>
  );
}
