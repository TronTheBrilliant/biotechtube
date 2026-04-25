// biotechtube/app/research/dashboard/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function MyReportsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/research/dashboard");

  // Two queries unioned client-side avoids PostgREST .or() injection risk
  const email = (user.email ?? "").toLowerCase();
  const [byUserRes, byEmailRes] = await Promise.all([
    supabase.from("equity_report_purchases")
      .select("id, tier, status, paid_at, live_access_expires_at, stripe_session_id, company_id, angle")
      .eq("user_id", user.id),
    email
      ? supabase.from("equity_report_purchases")
          .select("id, tier, status, paid_at, live_access_expires_at, stripe_session_id, company_id, angle")
          .eq("buyer_email", email)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const seen = new Set<string>();
  const purchases = [...(byUserRes.data ?? []), ...((byEmailRes as any).data ?? [])]
    .filter(p => seen.has(p.id) ? false : (seen.add(p.id), true))
    .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());

  const companyIds = purchases.map(p => p.company_id);
  const companiesRes = companyIds.length > 0
    ? await supabase.from("companies").select("id, name, slug").in("id", companyIds)
    : { data: [] as any[] };
  const byId = new Map((companiesRes.data ?? []).map(c => [c.id, c]));

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-[1000px] mx-auto px-4 py-10">
        <h1 className="text-[28px] font-bold mb-6">My Research Reports</h1>
        {purchases.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
              No reports yet. <Link href="/research" className="underline" style={{ color: "var(--color-accent)" }}>Browse companies</Link>.
            </p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {purchases.map(p => {
              const co = byId.get(p.company_id);
              const liveActive = p.tier === "living" && p.live_access_expires_at && new Date(p.live_access_expires_at) > new Date();
              return (
                <li key={p.id} className="py-4 flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-semibold">{co?.name ?? "Company"}</div>
                    <div className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {p.tier} · {p.angle} · purchased {new Date(p.paid_at).toLocaleDateString()} · status: {p.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.status === "ready" && (
                      <a href={`/api/research/download/${p.id}`} className="text-[12px] px-3 py-1.5 rounded text-white" style={{ background: "var(--color-accent)" }}>
                        PDF
                      </a>
                    )}
                    {liveActive && co && (
                      <Link href={`/research/${co.slug}/live/${p.stripe_session_id}`} className="text-[12px] px-3 py-1.5 rounded border" style={{ borderColor: "var(--color-border-subtle)" }}>
                        Live dashboard
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
