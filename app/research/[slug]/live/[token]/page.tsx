// biotechtube/app/research/[slug]/live/[token]/page.tsx
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";
import { verifyPurchaseAccess } from "@/lib/research/auth";
import { LiveDashboardClient } from "./LiveDashboardClient";

export const dynamic = "force-dynamic";

export default async function LiveDashboardPage({ params }: { params: { slug: string; token: string } }) {
  const supabase = createServerClient();
  const { data: lookup } = await supabase
    .from("equity_report_purchases")
    .select("id")
    .eq("stripe_session_id", params.token)
    .maybeSingle();
  if (!lookup) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const access = await verifyPurchaseAccess(
    lookup.id,
    user?.id ?? null,
    user?.email ?? null,
    { requireReady: true, requireLiving: true, requireLiveNotExpired: true },
  );
  if (!access.ok) {
    if (access.reason === "expired") return <ExpiredPage slug={params.slug} />;
    if (access.reason === "wrong_tier") return notFound();
    if (access.reason === "not_ready") redirect(`/research/thanks/${params.token}`);
    return notFound();
  }

  const purchase = access.purchase!;
  const [reportRes, companyRes, eventsRes] = await Promise.all([
    supabase.from("equity_reports").select("*").eq("id", purchase.equity_report_id).single(),
    supabase.from("companies").select("name, slug, ticker").eq("id", purchase.company_id).single(),
    supabase.from("equity_report_events").select("*").eq("equity_report_id", purchase.equity_report_id)
      .order("detected_at", { ascending: false }).limit(50),
  ]);
  if (!reportRes.data || !companyRes.data) notFound();

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
        <LiveDashboardClient
          purchase={purchase}
          report={reportRes.data}
          company={companyRes.data}
          events={eventsRes.data ?? []}
          token={params.token}
        />
      </main>
      <Footer />
    </div>
  );
}

function ExpiredPage({ slug }: { slug: string }) {
  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-[600px] mx-auto px-4 py-16 text-center">
        <h1 className="text-[24px] font-bold">Your 30-day live access has expired</h1>
        <p className="mt-3" style={{ color: "var(--color-text-secondary)" }}>
          Your downloaded PDF and audio remain accessible from the same purchase. To re-activate the live dashboard + chat agent, repurchase below.
        </p>
        <a href={`/research/${slug}`} className="inline-block mt-6 px-5 py-2.5 rounded text-white font-medium" style={{ background: "var(--color-accent)" }}>
          Purchase again
        </a>
      </main>
      <Footer />
    </div>
  );
}
