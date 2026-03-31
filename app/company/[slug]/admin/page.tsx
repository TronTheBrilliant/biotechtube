"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { useAuth } from "@/lib/auth";
import { createBrowserClient } from "@/lib/supabase";
import {
  LayoutDashboard,
  Pencil,
  Users,
  Newspaper,
  FlaskConical,
  BarChart3,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  Eye,
  TrendingUp,
  Search,
  Star,
  ShieldCheck,
  Calendar,
  GripVertical,
  Check,
  X,
  Palette,
  Video,
  Briefcase,
  FileText,
  MessageSquare,
  Mail,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

/* ─── Types ─── */
interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
}

interface ClaimRow {
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

interface JobRow {
  id: string;
  company_id: string;
  title: string;
  location: string | null;
  type: string;
  department: string | null;
  description: string | null;
  apply_url: string | null;
  posted_at: string;
  status: string;
}

interface InquiryRow {
  id: string;
  company_id: string;
  name: string;
  email: string;
  sender_company: string | null;
  message: string;
  created_at: string;
  read: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  display_order: number;
}

interface NewsItem {
  id: string;
  title: string;
  content: string | null;
  published_at: string;
}

interface ViewStat {
  date: string;
  count: number;
}

/* ─── Tabs ─── */
type AdminTab = "overview" | "profile" | "team" | "news" | "pipeline" | "analytics" | "branding" | "media" | "jobs" | "sections" | "inquiries" | "contact";

const baseTabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} /> },
  { id: "profile", label: "Edit Profile", icon: <Pencil size={15} /> },
  { id: "team", label: "Team", icon: <Users size={15} /> },
  { id: "news", label: "News", icon: <Newspaper size={15} /> },
  { id: "pipeline", label: "Pipeline", icon: <FlaskConical size={15} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={15} /> },
];

const premiumTabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "branding", label: "Branding", icon: <Palette size={15} /> },
  { id: "media", label: "Media", icon: <Video size={15} /> },
  { id: "jobs", label: "Jobs", icon: <Briefcase size={15} /> },
  { id: "sections", label: "Custom Sections", icon: <FileText size={15} /> },
  { id: "inquiries", label: "Inquiries", icon: <MessageSquare size={15} /> },
  { id: "contact", label: "Contact", icon: <Mail size={15} /> },
];

/* ─── Mini bar chart ─── */
function MiniBarChart({ data, height = 120 }: { data: ViewStat[]; height?: number }) {
  if (data.length === 0) return <div className="text-12" style={{ color: "var(--color-text-tertiary)" }}>No data yet</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 rounded-t-sm transition-all hover:opacity-80 group relative"
          style={{
            height: `${Math.max((d.count / max) * 100, 4)}%`,
            background: "var(--color-accent)",
            minWidth: 4,
          }}
          title={`${d.date}: ${d.count} views`}
        />
      ))}
    </div>
  );
}

/* ─── Main Admin Component ─── */
export default function CompanyAdminPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createBrowserClient();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Profile edit state
  const [profileFields, setProfileFields] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingTeamMember, setEditingTeamMember] = useState<Partial<TeamMember> | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);

  // News state
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [editingNews, setEditingNews] = useState<Partial<NewsItem> | null>(null);
  const [newsSaving, setNewsSaving] = useState(false);

  // Analytics state
  const [viewStats, setViewStats] = useState<ViewStat[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [sourceCounts, setSourceCounts] = useState<{ source: string; count: number }[]>([]);

  // Pipeline state
  const [pipelines, setPipelines] = useState<{ id: string; product_name: string; indication: string; stage: string }[]>([]);

  // Premium state
  const [brandColor, setBrandColor] = useState("#059669");
  const [heroTagline, setHeroTagline] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [investorDeckUrl, setInvestorDeckUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [customSections, setCustomSections] = useState<{ title: string; content: string }[]>([]);
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaSaved, setMediaSaved] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [sectionsSaving, setSectionsSaving] = useState(false);
  const [sectionsSaved, setSectionsSaved] = useState(false);

  // Jobs state
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [editingJob, setEditingJob] = useState<Partial<JobRow> | null>(null);
  const [jobSaving, setJobSaving] = useState(false);

  // Inquiries state
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);

  const isPremium = claim?.plan === "premium" || claim?.plan === "enterprise";

  /* ─── Load data ─── */
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch company
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name, slug, logo_url, website, description, city, country")
      .eq("slug", params.slug)
      .single();

    if (!companyData) {
      setLoading(false);
      return;
    }
    setCompany(companyData);

    // Check claim
    const { data: claimData } = await supabase
      .from("company_claims")
      .select("*")
      .eq("company_id", companyData.id)
      .eq("user_id", user.id)
      .eq("status", "verified")
      .single();

    if (!claimData) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    setClaim(claimData);

    // Load profile updates
    const { data: updates } = await supabase
      .from("company_updates")
      .select("field_name, field_value")
      .eq("company_id", companyData.id);
    const fields: Record<string, string> = {};
    if (updates) {
      updates.forEach((u: { field_name: string; field_value: string | null }) => {
        fields[u.field_name] = u.field_value || "";
      });
    }
    // Prefill with existing company data
    if (!fields.description && companyData.description) fields.description = companyData.description;
    if (!fields.website && companyData.website) fields.website = companyData.website;
    setProfileFields(fields);

    // Load team
    const { data: teamData } = await supabase
      .from("company_team")
      .select("*")
      .eq("company_id", companyData.id)
      .order("display_order");
    setTeamMembers(teamData || []);

    // Load news
    const { data: newsData } = await supabase
      .from("company_news")
      .select("*")
      .eq("company_id", companyData.id)
      .order("published_at", { ascending: false });
    setNewsItems(newsData || []);

    // Load pipelines
    const { data: pipelineData } = await supabase
      .from("pipelines")
      .select("id, product_name, indication, stage")
      .eq("company_id", companyData.id)
      .order("stage");
    setPipelines(pipelineData || []);

    // Load premium fields from claim
    if (claimData) {
      setBrandColor(claimData.brand_color || "#059669");
      setHeroTagline(claimData.hero_tagline || "");
      setVideoUrl(claimData.video_url || "");
      setInvestorDeckUrl(claimData.investor_deck_url || "");
      setContactEmail(claimData.contact_email || "");
      setCustomSections(
        Array.isArray(claimData.custom_sections) ? claimData.custom_sections : []
      );
    }

    // Load jobs
    const { data: jobsData } = await supabase
      .from("company_jobs")
      .select("*")
      .eq("company_id", companyData.id)
      .order("posted_at", { ascending: false });
    setJobs(jobsData || []);

    // Load inquiries
    const { data: inquiryData } = await supabase
      .from("company_inquiries")
      .select("*")
      .eq("company_id", companyData.id)
      .order("created_at", { ascending: false });
    setInquiries(inquiryData || []);

    // Load analytics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: viewsData } = await supabase
      .from("profile_views")
      .select("viewed_at, source")
      .eq("company_id", companyData.id)
      .gte("viewed_at", thirtyDaysAgo.toISOString());

    if (viewsData) {
      setTotalViews(viewsData.length);

      // Group by day
      const byDay: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      viewsData.forEach((v: { viewed_at: string; source: string | null }) => {
        const day = v.viewed_at.slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
        const src = v.source || "direct";
        bySource[src] = (bySource[src] || 0) + 1;
      });

      // Fill in empty days
      const stats: ViewStat[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        stats.push({ date: key, count: byDay[key] || 0 });
      }
      setViewStats(stats);

      setSourceCounts(
        Object.entries(bySource)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
      );
    }

    setLoading(false);
  }, [user, params.slug, supabase]);

  useEffect(() => {
    if (!authLoading && user) loadData();
    else if (!authLoading && !user) {
      setUnauthorized(true);
      setLoading(false);
    }
  }, [authLoading, user, loadData]);

  /* ─── Profile save ─── */
  const saveProfile = async () => {
    if (!company || !user) return;
    setProfileSaving(true);
    setProfileSaved(false);

    for (const [field_name, field_value] of Object.entries(profileFields)) {
      // Upsert each field
      const { data: existing } = await supabase
        .from("company_updates")
        .select("id")
        .eq("company_id", company.id)
        .eq("field_name", field_name)
        .single();

      if (existing) {
        await supabase
          .from("company_updates")
          .update({ field_value, updated_by: user.id, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("company_updates")
          .insert({ company_id: company.id, field_name, field_value, updated_by: user.id });
      }
    }

    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  /* ─── Team save ─── */
  const saveTeamMember = async () => {
    if (!company || !editingTeamMember) return;
    setTeamSaving(true);

    if (editingTeamMember.id) {
      // Update
      await supabase
        .from("company_team")
        .update({
          name: editingTeamMember.name,
          title: editingTeamMember.title,
          bio: editingTeamMember.bio,
          photo_url: editingTeamMember.photo_url,
          linkedin_url: editingTeamMember.linkedin_url,
          display_order: editingTeamMember.display_order || 0,
        })
        .eq("id", editingTeamMember.id);
    } else {
      // Insert
      await supabase.from("company_team").insert({
        company_id: company.id,
        name: editingTeamMember.name || "",
        title: editingTeamMember.title,
        bio: editingTeamMember.bio,
        photo_url: editingTeamMember.photo_url,
        linkedin_url: editingTeamMember.linkedin_url,
        display_order: teamMembers.length,
      });
    }

    setEditingTeamMember(null);
    setTeamSaving(false);
    loadData();
  };

  const deleteTeamMember = async (id: string) => {
    await supabase.from("company_team").delete().eq("id", id);
    loadData();
  };

  /* ─── News save ─── */
  const saveNews = async () => {
    if (!company || !editingNews || !user) return;
    setNewsSaving(true);

    if (editingNews.id) {
      await supabase
        .from("company_news")
        .update({ title: editingNews.title, content: editingNews.content })
        .eq("id", editingNews.id);
    } else {
      await supabase.from("company_news").insert({
        company_id: company.id,
        title: editingNews.title || "",
        content: editingNews.content,
        created_by: user.id,
      });
    }

    setEditingNews(null);
    setNewsSaving(false);
    loadData();
  };

  const deleteNews = async (id: string) => {
    await supabase.from("company_news").delete().eq("id", id);
    loadData();
  };

  /* ─── Premium: Branding save ─── */
  const saveBranding = async () => {
    if (!claim) return;
    setBrandingSaving(true);
    setBrandingSaved(false);
    await supabase
      .from("company_claims")
      .update({ brand_color: brandColor, hero_tagline: heroTagline })
      .eq("id", claim.id);
    setBrandingSaving(false);
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 3000);
  };

  /* ─── Premium: Media save ─── */
  const saveMedia = async () => {
    if (!claim) return;
    setMediaSaving(true);
    setMediaSaved(false);
    await supabase
      .from("company_claims")
      .update({ video_url: videoUrl, investor_deck_url: investorDeckUrl })
      .eq("id", claim.id);
    setMediaSaving(false);
    setMediaSaved(true);
    setTimeout(() => setMediaSaved(false), 3000);
  };

  /* ─── Premium: Contact save ─── */
  const saveContact = async () => {
    if (!claim) return;
    setContactSaving(true);
    setContactSaved(false);
    await supabase
      .from("company_claims")
      .update({ contact_email: contactEmail })
      .eq("id", claim.id);
    setContactSaving(false);
    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 3000);
  };

  /* ─── Premium: Custom Sections save ─── */
  const saveCustomSections = async () => {
    if (!claim) return;
    setSectionsSaving(true);
    setSectionsSaved(false);
    await supabase
      .from("company_claims")
      .update({ custom_sections: customSections })
      .eq("id", claim.id);
    setSectionsSaving(false);
    setSectionsSaved(true);
    setTimeout(() => setSectionsSaved(false), 3000);
  };

  /* ─── Premium: Job CRUD ─── */
  const saveJob = async () => {
    if (!company || !editingJob) return;
    setJobSaving(true);
    if (editingJob.id) {
      await supabase
        .from("company_jobs")
        .update({
          title: editingJob.title,
          location: editingJob.location,
          type: editingJob.type || "Full-time",
          department: editingJob.department,
          description: editingJob.description,
          apply_url: editingJob.apply_url,
          status: editingJob.status || "active",
        })
        .eq("id", editingJob.id);
    } else {
      await supabase.from("company_jobs").insert({
        company_id: company.id,
        title: editingJob.title || "",
        location: editingJob.location,
        type: editingJob.type || "Full-time",
        department: editingJob.department,
        description: editingJob.description,
        apply_url: editingJob.apply_url,
      });
    }
    setEditingJob(null);
    setJobSaving(false);
    loadData();
  };

  const deleteJob = async (id: string) => {
    await supabase.from("company_jobs").delete().eq("id", id);
    loadData();
  };

  /* ─── Premium: Mark inquiry read ─── */
  const markInquiryRead = async (id: string) => {
    await supabase.from("company_inquiries").update({ read: true }).eq("id", id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  /* ─── Loading / Auth guard ─── */
  if (loading || authLoading) {
    return (
      <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Nav />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </main>
        <Footer />
      </div>
    );
  }

  if (unauthorized || !company || !claim) {
    return (
      <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Nav />
        <main className="flex-1 flex items-center justify-center px-5">
          <div className="text-center max-w-sm">
            <ShieldCheck size={32} className="mx-auto mb-4" style={{ color: "var(--color-text-tertiary)" }} />
            <h1 className="text-[20px] font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Access Denied</h1>
            <p className="text-13 mb-5" style={{ color: "var(--color-text-secondary)" }}>
              You must be a verified claim owner to access this dashboard.
            </p>
            <Link
              href={`/claim/${params.slug}`}
              className="inline-flex items-center gap-1.5 text-13 font-medium px-5 py-2.5 rounded-lg text-white"
              style={{ background: "var(--color-accent)" }}
            >
              Claim This Company
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     ADMIN DASHBOARD
     ═══════════════════════════════════════════════ */
  return (
    <div style={{ background: "var(--color-bg-secondary)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Nav />

      {/* Admin Header */}
      <div
        className="border-b px-5 py-4"
        style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={company.name} logoUrl={company.logo_url} website={company.website} size={40} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {company.name}
                </h1>
                <span
                  className="text-10 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  <ShieldCheck size={10} />
                  Verified
                </span>
                <span
                  className="text-10 font-medium px-2 py-0.5 rounded-full capitalize"
                  style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}
                >
                  {claim.plan} plan
                </span>
              </div>
              <p className="text-11" style={{ color: "var(--color-text-tertiary)" }}>
                Admin Dashboard
              </p>
            </div>
          </div>
          <Link
            href={`/company/${company.slug}`}
            className="flex items-center gap-1.5 text-12 font-medium px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
          >
            <ExternalLink size={12} />
            View Public Profile
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="border-b px-5 overflow-x-auto"
        style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
      >
        <div className="max-w-6xl mx-auto flex gap-0.5">
          {[...baseTabs, ...(isPremium ? premiumTabs : [])].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-12 font-medium whitespace-nowrap border-b-2 transition-all"
              style={{
                borderBottomColor: activeTab === tab.id ? "var(--color-accent)" : "transparent",
                color: activeTab === tab.id ? "var(--color-accent)" : "var(--color-text-secondary)",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 px-5 py-6">
        <div className="max-w-6xl mx-auto">

          {/* ═══ OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <div>
              <h2 className="text-[18px] font-semibold mb-5" style={{ color: "var(--color-text-primary)" }}>
                Dashboard Overview
              </h2>

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: <Eye size={16} />, label: "Profile Views (30d)", value: String(totalViews) },
                  { icon: <Search size={16} />, label: "Search Impressions", value: "Coming soon" },
                  { icon: <Star size={16} />, label: "Watchlist Adds", value: "Coming soon" },
                  { icon: <TrendingUp size={16} />, label: "Trend Score", value: "Coming soon" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border p-4"
                    style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                  >
                    <div className="flex items-center gap-2 mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                      {stat.icon}
                      <span className="text-11 uppercase tracking-wide font-medium">{stat.label}</span>
                    </div>
                    <div className="text-[24px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Views chart */}
              <div
                className="rounded-xl border p-5 mb-6"
                style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
              >
                <h3 className="text-13 font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
                  Profile Views — Last 30 Days
                </h3>
                <MiniBarChart data={viewStats} height={140} />
                <div className="flex justify-between mt-2">
                  <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                    {viewStats[0]?.date}
                  </span>
                  <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                    {viewStats[viewStats.length - 1]?.date}
                  </span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("profile")}
                  className="rounded-xl border p-4 text-left hover:border-[var(--color-accent)] transition-colors"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <Pencil size={16} className="mb-2" style={{ color: "var(--color-accent)" }} />
                  <div className="text-13 font-semibold" style={{ color: "var(--color-text-primary)" }}>Edit Profile</div>
                  <p className="text-11 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>Update description, logo, and links</p>
                </button>
                <button
                  onClick={() => setActiveTab("team")}
                  className="rounded-xl border p-4 text-left hover:border-[var(--color-accent)] transition-colors"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <Users size={16} className="mb-2" style={{ color: "var(--color-accent)" }} />
                  <div className="text-13 font-semibold" style={{ color: "var(--color-text-primary)" }}>Manage Team</div>
                  <p className="text-11 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{teamMembers.length} team members</p>
                </button>
                <button
                  onClick={() => setActiveTab("news")}
                  className="rounded-xl border p-4 text-left hover:border-[var(--color-accent)] transition-colors"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <Newspaper size={16} className="mb-2" style={{ color: "var(--color-accent)" }} />
                  <div className="text-13 font-semibold" style={{ color: "var(--color-text-primary)" }}>Post News</div>
                  <p className="text-11 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>{newsItems.length} updates posted</p>
                </button>
              </div>
            </div>
          )}

          {/* ═══ EDIT PROFILE ═══ */}
          {activeTab === "profile" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Edit Profile</h2>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: profileSaved ? "#16a34a" : "var(--color-accent)" }}
                >
                  {profileSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : profileSaved ? (
                    <Check size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {profileSaved ? "Saved!" : "Save Changes"}
                </button>
              </div>

              <div
                className="rounded-xl border divide-y"
                style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
              >
                {[
                  { key: "tagline", label: "Tagline", placeholder: "A short tagline for your company", type: "text" },
                  { key: "description", label: "Description", placeholder: "Describe what your company does...", type: "textarea" },
                  { key: "website", label: "Website", placeholder: "https://your-company.com", type: "text" },
                  { key: "logo_url", label: "Logo URL", placeholder: "https://your-company.com/logo.png", type: "text" },
                  { key: "headquarters", label: "Headquarters", placeholder: "City, Country", type: "text" },
                  { key: "founded_year", label: "Founded Year", placeholder: "2020", type: "text" },
                  { key: "employee_count", label: "Employee Count", placeholder: "50", type: "text" },
                ].map((field) => (
                  <div key={field.key} className="px-5 py-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <label className="text-12 font-medium mb-1.5 block" style={{ color: "var(--color-text-primary)" }}>
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={profileFields[field.key] || ""}
                        onChange={(e) => setProfileFields((p) => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={4}
                        className="w-full text-13 px-3 py-2.5 rounded-lg border outline-none resize-y"
                        style={{
                          borderColor: "var(--color-border-medium)",
                          background: "var(--color-bg-primary)",
                          color: "var(--color-text-primary)",
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={profileFields[field.key] || ""}
                        onChange={(e) => setProfileFields((p) => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full text-13 px-3 py-2.5 rounded-lg border outline-none"
                        style={{
                          borderColor: "var(--color-border-medium)",
                          background: "var(--color-bg-primary)",
                          color: "var(--color-text-primary)",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ TEAM ═══ */}
          {activeTab === "team" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Team Members
                </h2>
                <button
                  onClick={() => setEditingTeamMember({ name: "", title: "", bio: "", photo_url: "", linkedin_url: "" })}
                  className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  <Plus size={14} />
                  Add Member
                </button>
              </div>

              {/* Team member form modal */}
              {editingTeamMember && (
                <div
                  className="rounded-xl border p-5 mb-5"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-accent)" }}
                >
                  <h3 className="text-14 font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
                    {editingTeamMember.id ? "Edit" : "Add"} Team Member
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Name *</label>
                      <input
                        type="text"
                        value={editingTeamMember.name || ""}
                        onChange={(e) => setEditingTeamMember((m) => ({ ...m, name: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Title</label>
                      <input
                        type="text"
                        value={editingTeamMember.title || ""}
                        onChange={(e) => setEditingTeamMember((m) => ({ ...m, title: e.target.value }))}
                        placeholder="CEO & Co-Founder"
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Bio</label>
                      <textarea
                        value={editingTeamMember.bio || ""}
                        onChange={(e) => setEditingTeamMember((m) => ({ ...m, bio: e.target.value }))}
                        placeholder="Brief bio..."
                        rows={2}
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none resize-y"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Photo URL</label>
                      <input
                        type="text"
                        value={editingTeamMember.photo_url || ""}
                        onChange={(e) => setEditingTeamMember((m) => ({ ...m, photo_url: e.target.value }))}
                        placeholder="https://..."
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>LinkedIn URL</label>
                      <input
                        type="text"
                        value={editingTeamMember.linkedin_url || ""}
                        onChange={(e) => setEditingTeamMember((m) => ({ ...m, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveTeamMember}
                      disabled={teamSaving || !editingTeamMember.name}
                      className="flex items-center gap-1.5 text-12 font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50"
                      style={{ background: "var(--color-accent)" }}
                    >
                      {teamSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditingTeamMember(null)}
                      className="text-12 font-medium px-4 py-2 rounded-lg border"
                      style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Team list */}
              {teamMembers.length === 0 && !editingTeamMember ? (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <Users size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>No team members added yet.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>Showcase your leadership team to investors and partners.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl border p-4 flex items-start gap-4"
                      style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-14 font-semibold shrink-0 overflow-hidden"
                        style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
                      >
                        {member.photo_url ? (
                          <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-14 font-semibold" style={{ color: "var(--color-text-primary)" }}>{member.name}</h4>
                          {member.linkedin_url && (
                            <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-11" style={{ color: "var(--color-accent)" }}>
                              LinkedIn
                            </a>
                          )}
                        </div>
                        {member.title && (
                          <p className="text-12" style={{ color: "var(--color-text-secondary)" }}>{member.title}</p>
                        )}
                        {member.bio && (
                          <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>{member.bio}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingTeamMember(member)}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteTeamMember(member.id)}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                          style={{ color: "#dc2626" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ NEWS ═══ */}
          {activeTab === "news" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Company News
                </h2>
                <button
                  onClick={() => setEditingNews({ title: "", content: "" })}
                  className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  <Plus size={14} />
                  Post Update
                </button>
              </div>

              {/* News form */}
              {editingNews && (
                <div
                  className="rounded-xl border p-5 mb-5"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-accent)" }}
                >
                  <h3 className="text-14 font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
                    {editingNews.id ? "Edit" : "New"} Update
                  </h3>
                  <div className="flex flex-col gap-4 mb-4">
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Title *</label>
                      <input
                        type="text"
                        value={editingNews.title || ""}
                        onChange={(e) => setEditingNews((n) => ({ ...n, title: e.target.value }))}
                        placeholder="Update title"
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Content</label>
                      <textarea
                        value={editingNews.content || ""}
                        onChange={(e) => setEditingNews((n) => ({ ...n, content: e.target.value }))}
                        placeholder="Write your update..."
                        rows={5}
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none resize-y"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveNews}
                      disabled={newsSaving || !editingNews.title}
                      className="flex items-center gap-1.5 text-12 font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50"
                      style={{ background: "var(--color-accent)" }}
                    >
                      {newsSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Publish
                    </button>
                    <button
                      onClick={() => setEditingNews(null)}
                      className="text-12 font-medium px-4 py-2 rounded-lg border"
                      style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* News list */}
              {newsItems.length === 0 && !editingNews ? (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <Newspaper size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>No news posted yet.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>Share company updates, milestones, and announcements.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {newsItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border p-4"
                      style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-14 font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.title}</h4>
                          <span className="text-10 flex items-center gap-1 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                            <Calendar size={10} />
                            {new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingNews(item)}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                            style={{ color: "var(--color-text-tertiary)" }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteNews(item.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                            style={{ color: "#dc2626" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {item.content && (
                        <p className="text-12" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{item.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ PIPELINE ═══ */}
          {activeTab === "pipeline" && (
            <div>
              <h2 className="text-[18px] font-semibold mb-5" style={{ color: "var(--color-text-primary)" }}>
                Pipeline Products
              </h2>
              {pipelines.length === 0 ? (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <FlaskConical size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>No pipeline products found.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Pipeline data is automatically sourced from clinical trial registries.
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "var(--color-bg-secondary)" }}>
                        <th className="text-left text-11 font-semibold uppercase tracking-wide px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>Product</th>
                        <th className="text-left text-11 font-semibold uppercase tracking-wide px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>Indication</th>
                        <th className="text-left text-11 font-semibold uppercase tracking-wide px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipelines.map((p) => (
                        <tr key={p.id} className="border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                          <td className="px-4 py-3 text-13 font-medium" style={{ color: "var(--color-text-primary)" }}>{p.product_name}</td>
                          <td className="px-4 py-3 text-12" style={{ color: "var(--color-text-secondary)" }}>{p.indication}</td>
                          <td className="px-4 py-3">
                            <span
                              className="text-10 font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
                            >
                              {p.stage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ ANALYTICS ═══ */}
          {activeTab === "analytics" && (
            <div>
              <h2 className="text-[18px] font-semibold mb-5" style={{ color: "var(--color-text-primary)" }}>
                Profile Analytics
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Views over time */}
                <div
                  className="rounded-xl border p-5"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <h3 className="text-13 font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
                    Views Over Time (30 Days)
                  </h3>
                  <MiniBarChart data={viewStats} height={160} />
                  <div className="flex justify-between mt-2">
                    <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>{viewStats[0]?.date}</span>
                    <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>{viewStats[viewStats.length - 1]?.date}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-12" style={{ color: "var(--color-text-secondary)" }}>Total views</span>
                      <span className="text-14 font-bold" style={{ color: "var(--color-text-primary)" }}>{totalViews}</span>
                    </div>
                  </div>
                </div>

                {/* Referral sources */}
                <div
                  className="rounded-xl border p-5"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <h3 className="text-13 font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
                    Top Referral Sources
                  </h3>
                  {sourceCounts.length === 0 ? (
                    <p className="text-12" style={{ color: "var(--color-text-tertiary)" }}>No referral data yet</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {sourceCounts.slice(0, 8).map((s) => (
                        <div key={s.source} className="flex items-center gap-3">
                          <span className="text-12 flex-1 capitalize" style={{ color: "var(--color-text-secondary)" }}>{s.source}</span>
                          <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-bg-tertiary)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max((s.count / (sourceCounts[0]?.count || 1)) * 100, 5)}%`,
                                background: "var(--color-accent)",
                              }}
                            />
                          </div>
                          <span className="text-12 font-medium w-8 text-right" style={{ color: "var(--color-text-primary)" }}>{s.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ PREMIUM: BRANDING ═══ */}
          {activeTab === "branding" && isPremium && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Branding</h2>
                <button
                  onClick={saveBranding}
                  disabled={brandingSaving}
                  className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: brandingSaved ? "#16a34a" : "var(--color-accent)" }}
                >
                  {brandingSaving ? <Loader2 size={14} className="animate-spin" /> : brandingSaved ? <Check size={14} /> : <Save size={14} />}
                  {brandingSaved ? "Saved!" : "Save Branding"}
                </button>
              </div>

              <div
                className="rounded-xl border divide-y"
                style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
              >
                {/* Brand Color */}
                <div className="px-5 py-5" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <label className="text-12 font-medium mb-2 block" style={{ color: "var(--color-text-primary)" }}>
                    Brand Color
                  </label>
                  <p className="text-11 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                    Used as accent color throughout your premium profile (buttons, links, badges).
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border cursor-pointer"
                      style={{ borderColor: "var(--color-border-medium)" }}
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#059669"
                      className="w-32 text-13 px-3 py-2 rounded-lg border outline-none font-mono"
                      style={{
                        borderColor: "var(--color-border-medium)",
                        background: "var(--color-bg-primary)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                    <div
                      className="h-10 flex-1 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}60, ${brandColor})` }}
                    />
                  </div>
                </div>

                {/* Hero Tagline */}
                <div className="px-5 py-5" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <label className="text-12 font-medium mb-1.5 block" style={{ color: "var(--color-text-primary)" }}>
                    Hero Tagline
                  </label>
                  <p className="text-11 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                    Displayed prominently below your company name in the hero section.
                  </p>
                  <input
                    type="text"
                    value={heroTagline}
                    onChange={(e) => setHeroTagline(e.target.value)}
                    placeholder="Pioneering next-generation cell therapies for solid tumors"
                    className="w-full text-13 px-3 py-2.5 rounded-lg border outline-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6">
                <h3 className="text-13 font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>Preview</h3>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${brandColor}12 0%, ${brandColor}06 50%, transparent 100%)`,
                    border: `1px solid ${brandColor}20`,
                  }}
                >
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, transparent)` }} />
                  <div className="px-6 py-8">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[22px] font-bold" style={{ color: "var(--color-text-primary)" }}>{company?.name}</span>
                      <span className="text-11 font-semibold px-2.5 py-0.5 rounded-full text-white" style={{ background: brandColor }}>
                        Verified Company
                      </span>
                    </div>
                    {heroTagline && (
                      <p className="text-14 mt-2" style={{ color: "var(--color-text-secondary)" }}>{heroTagline}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PREMIUM: MEDIA ═══ */}
          {activeTab === "media" && isPremium && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Media</h2>
                <button
                  onClick={saveMedia}
                  disabled={mediaSaving}
                  className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: mediaSaved ? "#16a34a" : "var(--color-accent)" }}
                >
                  {mediaSaving ? <Loader2 size={14} className="animate-spin" /> : mediaSaved ? <Check size={14} /> : <Save size={14} />}
                  {mediaSaved ? "Saved!" : "Save Media"}
                </button>
              </div>

              <div
                className="rounded-xl border divide-y"
                style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
              >
                <div className="px-5 py-5" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <label className="text-12 font-medium mb-1.5 block" style={{ color: "var(--color-text-primary)" }}>
                    Video URL
                  </label>
                  <p className="text-11 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                    YouTube or Vimeo URL for your company overview video.
                  </p>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full text-13 px-3 py-2.5 rounded-lg border outline-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <div className="px-5 py-5" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <label className="text-12 font-medium mb-1.5 block" style={{ color: "var(--color-text-primary)" }}>
                    Investor Deck URL
                  </label>
                  <p className="text-11 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                    Link to your investor presentation PDF or hosted deck.
                  </p>
                  <input
                    type="text"
                    value={investorDeckUrl}
                    onChange={(e) => setInvestorDeckUrl(e.target.value)}
                    placeholder="https://example.com/investor-deck.pdf"
                    className="w-full text-13 px-3 py-2.5 rounded-lg border outline-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ PREMIUM: JOBS ═══ */}
          {activeTab === "jobs" && isPremium && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Job Listings
                </h2>
                <button
                  onClick={() => setEditingJob({ title: "", location: "", type: "Full-time", department: "", description: "", apply_url: "" })}
                  className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  <Plus size={14} />
                  Add Job
                </button>
              </div>

              {/* Job form */}
              {editingJob && (
                <div
                  className="rounded-xl border p-5 mb-5"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-accent)" }}
                >
                  <h3 className="text-14 font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
                    {editingJob.id ? "Edit" : "Add"} Position
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Title *</label>
                      <input
                        type="text"
                        value={editingJob.title || ""}
                        onChange={(e) => setEditingJob((j) => ({ ...j, title: e.target.value }))}
                        placeholder="Senior Research Scientist"
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Location</label>
                      <input
                        type="text"
                        value={editingJob.location || ""}
                        onChange={(e) => setEditingJob((j) => ({ ...j, location: e.target.value }))}
                        placeholder="Boston, MA"
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Type</label>
                      <select
                        value={editingJob.type || "Full-time"}
                        onChange={(e) => setEditingJob((j) => ({ ...j, type: e.target.value }))}
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Department</label>
                      <input
                        type="text"
                        value={editingJob.department || ""}
                        onChange={(e) => setEditingJob((j) => ({ ...j, department: e.target.value }))}
                        placeholder="R&D"
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Description</label>
                      <textarea
                        value={editingJob.description || ""}
                        onChange={(e) => setEditingJob((j) => ({ ...j, description: e.target.value }))}
                        placeholder="Brief job description..."
                        rows={3}
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none resize-y"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>Apply URL</label>
                      <input
                        type="text"
                        value={editingJob.apply_url || ""}
                        onChange={(e) => setEditingJob((j) => ({ ...j, apply_url: e.target.value }))}
                        placeholder="https://careers.yourcompany.com/apply/123"
                        className="w-full text-13 px-3 py-2 rounded-lg border outline-none"
                        style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={saveJob}
                      disabled={jobSaving || !editingJob.title}
                      className="flex items-center gap-1.5 text-12 font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50"
                      style={{ background: "var(--color-accent)" }}
                    >
                      {jobSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditingJob(null)}
                      className="text-12 font-medium px-4 py-2 rounded-lg border"
                      style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Job list */}
              {jobs.length === 0 && !editingJob ? (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <Briefcase size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>No job listings yet.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>Attract top talent by posting open positions.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-xl border p-4 flex items-start justify-between"
                      style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-14 font-semibold" style={{ color: "var(--color-text-primary)" }}>{job.title}</h4>
                          <span
                            className="text-10 font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: job.status === "active" ? "#dcfce7" : "#fee2e2",
                              color: job.status === "active" ? "#166534" : "#991b1b",
                            }}
                          >
                            {job.status}
                          </span>
                          <span
                            className="text-10 font-medium px-2 py-0.5 rounded-full"
                            style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}
                          >
                            {job.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {job.location && <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{job.location}</span>}
                          {job.department && <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{job.department}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingJob(job)}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                          style={{ color: "#dc2626" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ PREMIUM: CUSTOM SECTIONS ═══ */}
          {activeTab === "sections" && isPremium && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Custom Sections
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCustomSections([...customSections, { title: "", content: "" }]);
                      setEditingSectionIdx(customSections.length);
                    }}
                    className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white"
                    style={{ background: "var(--color-accent)" }}
                  >
                    <Plus size={14} />
                    Add Section
                  </button>
                  <button
                    onClick={saveCustomSections}
                    disabled={sectionsSaving}
                    className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: sectionsSaved ? "#16a34a" : "var(--color-accent)" }}
                  >
                    {sectionsSaving ? <Loader2 size={14} className="animate-spin" /> : sectionsSaved ? <Check size={14} /> : <Save size={14} />}
                    {sectionsSaved ? "Saved!" : "Save All"}
                  </button>
                </div>
              </div>

              <p className="text-12 mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                Add custom content blocks to your profile (Investor Relations, Technology Platform, Partnerships, etc.). Content supports basic Markdown.
              </p>

              {customSections.length === 0 ? (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <FileText size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>No custom sections yet.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>Tell your story with custom content blocks.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {customSections.map((section, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border p-5"
                      style={{
                        background: "var(--color-bg-primary)",
                        borderColor: editingSectionIdx === idx ? "var(--color-accent)" : "var(--color-border-subtle)",
                      }}
                    >
                      {editingSectionIdx === idx ? (
                        <div className="flex flex-col gap-3">
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => {
                              const updated = [...customSections];
                              updated[idx] = { ...updated[idx], title: e.target.value };
                              setCustomSections(updated);
                            }}
                            placeholder="Section Title (e.g. Investor Relations)"
                            className="w-full text-14 font-semibold px-3 py-2 rounded-lg border outline-none"
                            style={{
                              borderColor: "var(--color-border-medium)",
                              background: "var(--color-bg-primary)",
                              color: "var(--color-text-primary)",
                            }}
                          />
                          <textarea
                            value={section.content}
                            onChange={(e) => {
                              const updated = [...customSections];
                              updated[idx] = { ...updated[idx], content: e.target.value };
                              setCustomSections(updated);
                            }}
                            placeholder="Section content (supports **bold**, *italic*, [links](url))..."
                            rows={6}
                            className="w-full text-13 px-3 py-2 rounded-lg border outline-none resize-y"
                            style={{
                              borderColor: "var(--color-border-medium)",
                              background: "var(--color-bg-primary)",
                              color: "var(--color-text-primary)",
                            }}
                          />
                          <button
                            onClick={() => setEditingSectionIdx(null)}
                            className="self-start text-12 font-medium px-3 py-1.5 rounded-lg"
                            style={{ color: "var(--color-accent)" }}
                          >
                            Done editing
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-14 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                              {section.title || "(Untitled)"}
                            </h4>
                            {section.content && (
                              <p className="text-12 mt-1 line-clamp-2" style={{ color: "var(--color-text-tertiary)" }}>
                                {section.content}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-3">
                            {idx > 0 && (
                              <button
                                onClick={() => {
                                  const updated = [...customSections];
                                  [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                                  setCustomSections(updated);
                                }}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                                style={{ color: "var(--color-text-tertiary)" }}
                              >
                                <ChevronUp size={13} />
                              </button>
                            )}
                            {idx < customSections.length - 1 && (
                              <button
                                onClick={() => {
                                  const updated = [...customSections];
                                  [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                                  setCustomSections(updated);
                                }}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                                style={{ color: "var(--color-text-tertiary)" }}
                              >
                                <ChevronDown size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => setEditingSectionIdx(idx)}
                              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                              style={{ color: "var(--color-text-tertiary)" }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => {
                                setCustomSections(customSections.filter((_, i) => i !== idx));
                                if (editingSectionIdx === idx) setEditingSectionIdx(null);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                              style={{ color: "#dc2626" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ PREMIUM: INQUIRIES ═══ */}
          {activeTab === "inquiries" && isPremium && (
            <div>
              <h2 className="text-[18px] font-semibold mb-5" style={{ color: "var(--color-text-primary)" }}>
                Inquiries
                {inquiries.filter((i) => !i.read).length > 0 && (
                  <span
                    className="ml-2 text-11 font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "#dc2626" }}
                  >
                    {inquiries.filter((i) => !i.read).length} new
                  </span>
                )}
              </h2>

              {inquiries.length === 0 ? (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
                >
                  <MessageSquare size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>No inquiries yet.</p>
                  <p className="text-11 mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Investors and partners can reach you through your profile contact form.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {inquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className="rounded-xl border p-5"
                      style={{
                        background: inquiry.read ? "var(--color-bg-primary)" : `var(--color-accent-subtle, ${brandColor}08)`,
                        borderColor: inquiry.read ? "var(--color-border-subtle)" : brandColor + "30",
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-14 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                              {inquiry.name}
                            </h4>
                            {!inquiry.read && (
                              <span className="text-10 font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ background: brandColor }}>
                                New
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{inquiry.email}</span>
                            {inquiry.sender_company && (
                              <>
                                <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>|</span>
                                <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>{inquiry.sender_company}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-10" style={{ color: "var(--color-text-tertiary)" }}>
                            {new Date(inquiry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          {!inquiry.read && (
                            <button
                              onClick={() => markInquiryRead(inquiry.id)}
                              className="text-11 font-medium px-2 py-1 rounded-lg border hover:bg-[var(--color-bg-secondary)] transition-colors"
                              style={{ borderColor: "var(--color-border-medium)", color: "var(--color-text-secondary)" }}
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-13 mt-2" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                        {inquiry.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ PREMIUM: CONTACT ═══ */}
          {activeTab === "contact" && isPremium && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Contact Settings</h2>
                <button
                  onClick={saveContact}
                  disabled={contactSaving}
                  className="flex items-center gap-1.5 text-13 font-medium px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: contactSaved ? "#16a34a" : "var(--color-accent)" }}
                >
                  {contactSaving ? <Loader2 size={14} className="animate-spin" /> : contactSaved ? <Check size={14} /> : <Save size={14} />}
                  {contactSaved ? "Saved!" : "Save Contact"}
                </button>
              </div>

              <div
                className="rounded-xl border p-5"
                style={{ background: "var(--color-bg-primary)", borderColor: "var(--color-border-subtle)" }}
              >
                <label className="text-12 font-medium mb-1.5 block" style={{ color: "var(--color-text-primary)" }}>
                  Contact Email
                </label>
                <p className="text-11 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                  Inquiries from your profile contact form will be stored and visible in the Inquiries tab. Set this email for your records.
                </p>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="ir@yourcompany.com"
                  className="w-full text-13 px-3 py-2.5 rounded-lg border outline-none"
                  style={{
                    borderColor: "var(--color-border-medium)",
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
