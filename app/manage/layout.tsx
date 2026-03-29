"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { createBrowserClient } from "@/lib/supabase";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
import { Loader2 } from "lucide-react";

/* ─── Types ─── */

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
}

interface ClaimData {
  id: string;
  company_id: string;
  user_id: string;
  status: string;
  plan: string;
  verified_at: string | null;
  brand_color: string | null;
  hero_tagline: string | null;
  video_url: string | null;
  investor_deck_url: string | null;
  contact_email: string | null;
  custom_sections: { title: string; content: string }[] | null;
}

interface DashboardContextValue {
  company: CompanyData;
  claim: ClaimData;
  refreshClaim: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within the manage layout");
  }
  return ctx;
}

/* ─── Layout ─── */

export default function ManageLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [unreadInquiries, setUnreadInquiries] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [noClaim, setNoClaim] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* Fetch claim + company data */
  const fetchData = async (userId: string) => {
    const supabase = createBrowserClient();

    // Get verified claim for this user
    const { data: claimRow, error: claimErr } = await supabase
      .from("company_claims")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "verified")
      .limit(1)
      .single();

    if (claimErr || !claimRow) {
      setNoClaim(true);
      setDataLoading(false);
      return;
    }

    setClaim(claimRow as ClaimData);

    // Get company data
    const { data: companyRow } = await supabase
      .from("companies")
      .select("id, name, slug, logo_url, website, description, city, country")
      .eq("id", claimRow.company_id)
      .single();

    if (companyRow) {
      setCompany(companyRow as CompanyData);
    }

    // Get unread inquiry count
    const { count } = await supabase
      .from("company_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", claimRow.company_id)
      .eq("read", false);

    setUnreadInquiries(count ?? 0);
    setDataLoading(false);
  };

  const refreshClaim = async () => {
    if (!user) return;
    const supabase = createBrowserClient();
    const { data: claimRow } = await supabase
      .from("company_claims")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "verified")
      .limit(1)
      .single();
    if (claimRow) setClaim(claimRow as ClaimData);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchData(user.id);
    // Only run when auth finishes loading — user reference is stable after that
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  /* Loading state */
  if (authLoading || dataLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "100vh", color: "var(--color-text-tertiary)" }}
      >
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  /* No verified claim */
  if (noClaim || !company || !claim) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3"
        style={{ minHeight: "100vh", padding: 24 }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          No claimed company found
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-secondary)",
            textAlign: "center",
            maxWidth: 360,
          }}
        >
          You need to claim and verify a company profile before accessing the dashboard.
        </p>
        <Link
          href="/companies"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "white",
            background: "var(--color-accent)",
            padding: "7px 14px",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Browse companies to claim
        </Link>
      </div>
    );
  }

  const planLabel =
    claim.plan === "enterprise"
      ? "Enterprise"
      : claim.plan === "professional"
        ? "Professional"
        : "Starter";

  return (
    <DashboardContext.Provider value={{ company, claim, refreshClaim }}>
      <div className="flex" style={{ minHeight: "100vh" }}>
        {/* Desktop sidebar */}
        <div className="hidden md:block flex-shrink-0">
          <div className="sticky top-0" style={{ height: "100vh" }}>
            <DashboardSidebar
              companyName={company.name}
              companySlug={company.slug}
              planTier={planLabel}
              logoUrl={company.logo_url}
              unreadInquiries={unreadInquiries}
            />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile nav (hidden on desktop) */}
          <div className="block md:hidden">
            <DashboardMobileNav
              companyName={company.name}
              companySlug={company.slug}
              planTier={planLabel}
              logoUrl={company.logo_url}
              unreadInquiries={unreadInquiries}
              isOpen={mobileNavOpen}
              onToggle={() => setMobileNavOpen((prev) => !prev)}
            />
          </div>

          {/* Page content */}
          <main style={{ flex: 1, padding: "20px 24px" }}>
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
