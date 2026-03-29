"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Search,
  FlaskConical,
  MessageSquare,
  Pencil,
  UserPlus,
  FilePlus,
  ExternalLink,
} from "lucide-react";
import { useDashboard } from "@/app/manage/layout";
import { StatCard } from "@/components/dashboard/StatCard";
import { createBrowserClient } from "@/lib/supabase";
import { formatNumber } from "@/lib/formatting";

/* ─── Types ─── */

interface ActivityItem {
  id: string;
  type: "view" | "inquiry" | "news";
  description: string;
  timestamp: string;
  date: Date;
}

interface OverviewStats {
  profileViews: number;
  pipelineCount: number;
  inquiryCount: number;
  unreadInquiries: number;
}

/* ─── Helpers ─── */

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay === 0) return "Today";
  if (diffDay === 1) return "1 day ago";
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 14) return "1 week ago";
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} weeks ago`;
  if (diffDay < 60) return "1 month ago";
  return `${Math.floor(diffDay / 30)} months ago`;
}

/* ─── Activity icon by type ─── */

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const iconProps = {
    size: 14,
    style: { color: "var(--color-text-tertiary)", flexShrink: 0 } as React.CSSProperties,
  };
  if (type === "view") return <Eye {...iconProps} />;
  if (type === "inquiry") return <MessageSquare {...iconProps} />;
  return <FilePlus {...iconProps} />;
}

/* ─── Main Page ─── */

export default function ManageOverviewPage() {
  const { company, claim } = useDashboard();

  const [stats, setStats] = useState<OverviewStats>({
    profileViews: 0,
    pipelineCount: 0,
    inquiryCount: 0,
    unreadInquiries: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOverviewData() {
      const supabase = createBrowserClient();
      const companyId = company.id;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysIso = thirtyDaysAgo.toISOString();

      /* ── Stats queries ── */
      const [viewsRes, pipelinesRes, inquiriesRes, unreadRes] = await Promise.all([
        supabase
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .gte("viewed_at", thirtyDaysIso),
        supabase
          .from("pipelines")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("company_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("company_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("read", false),
      ]);

      setStats({
        profileViews: viewsRes.count ?? 0,
        pipelineCount: pipelinesRes.count ?? 0,
        inquiryCount: inquiriesRes.count ?? 0,
        unreadInquiries: unreadRes.count ?? 0,
      });

      /* ── Activity queries ── */
      const [viewsActivity, inquiriesActivity, newsActivity] = await Promise.all([
        supabase
          .from("profile_views")
          .select("id, viewed_at")
          .eq("company_id", companyId)
          .order("viewed_at", { ascending: false })
          .limit(30),
        supabase
          .from("company_inquiries")
          .select("id, created_at, sender_name")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("company_news")
          .select("id, created_at, title")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      /* Group profile views by day (last 5 distinct days) */
      const viewsByDay: Record<string, number> = {};
      for (const v of viewsActivity.data ?? []) {
        const day = v.viewed_at?.split("T")[0] ?? "";
        if (day) viewsByDay[day] = (viewsByDay[day] ?? 0) + 1;
      }
      const topViewDays = Object.entries(viewsByDay)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 5);

      const viewItems: ActivityItem[] = topViewDays.map(([day, count]) => ({
        id: `view-${day}`,
        type: "view",
        description: `${count} profile view${count !== 1 ? "s" : ""}`,
        timestamp: formatRelativeDate(new Date(day)),
        date: new Date(day),
      }));

      const inquiryItems: ActivityItem[] = (inquiriesActivity.data ?? []).map((row) => ({
        id: `inquiry-${row.id}`,
        type: "inquiry",
        description: row.sender_name
          ? `New inquiry from ${row.sender_name}`
          : "New inquiry received",
        timestamp: formatRelativeDate(new Date(row.created_at)),
        date: new Date(row.created_at),
      }));

      const newsItems: ActivityItem[] = (newsActivity.data ?? []).map((row) => ({
        id: `news-${row.id}`,
        type: "news",
        description: row.title ? `News posted: ${row.title}` : "News update posted",
        timestamp: formatRelativeDate(new Date(row.created_at)),
        date: new Date(row.created_at),
      }));

      const merged = [...viewItems, ...inquiryItems, ...newsItems]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 8);

      setActivity(merged);
      setLoading(false);
    }

    fetchOverviewData();
  }, [company.id]);

  const profileViewValue = loading
    ? "—"
    : stats.profileViews >= 1000
    ? formatNumber(stats.profileViews)
    : String(stats.profileViews);

  const pipelineValue = loading ? "—" : String(stats.pipelineCount);

  const inquiryValue = loading ? "—" : String(stats.inquiryCount);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.3px",
            marginBottom: 2,
          }}
        >
          Overview
        </h1>
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
          {company.name} dashboard
        </p>
      </div>

      {/* ── Stat cards — 4-col desktop, 2x2 mobile ── */}
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ gap: 10, marginBottom: 20 }}
      >
        <StatCard
          icon={<Eye size={12} />}
          label="Profile Views"
          value={profileViewValue}
          subtitle="Last 30 days"
        />
        <StatCard
          icon={<Search size={12} />}
          label="Search Hits"
          value="—"
          subtitle="Tracking coming soon"
        />
        <StatCard
          icon={<FlaskConical size={12} />}
          label="Pipeline"
          value={pipelineValue}
          subtitle="Active programs"
        />
        <StatCard
          icon={<MessageSquare size={12} />}
          label="Inquiries"
          value={inquiryValue}
          subtitle={
            stats.unreadInquiries > 0
              ? `${stats.unreadInquiries} unread`
              : "All read"
          }
          accentValue={stats.unreadInquiries > 0}
        />
      </div>

      {/* ── Two-column: activity + quick actions ── */}
      <div
        className="flex flex-col md:flex-row"
        style={{ gap: 14, alignItems: "flex-start" }}
      >
        {/* Activity feed */}
        <div
          className="w-full md:flex-1"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "14px 16px",
          }}
        >
          {/* Section header */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}
          >
            Recent Activity
          </div>

          {/* Activity list */}
          {loading ? (
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", padding: "8px 0" }}>
              Loading...
            </div>
          ) : activity.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", padding: "8px 0" }}>
              No recent activity yet.
            </div>
          ) : (
            <div>
              {activity.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2"
                  style={{
                    padding: "8px 0",
                    borderBottom:
                      idx < activity.length - 1
                        ? "0.5px solid var(--color-border-subtle)"
                        : "none",
                  }}
                >
                  <div style={{ paddingTop: 1 }}>
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-primary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0"
                    style={{
                      fontSize: 10,
                      color: "var(--color-text-tertiary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.timestamp}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div
          className="w-full md:w-auto"
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "14px 16px",
            minWidth: 220,
            flexShrink: 0,
          }}
        >
          {/* Section header */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}
          >
            Quick Actions
          </div>

          <div className="flex flex-col" style={{ gap: 6 }}>
            {/* Edit company description */}
            <Link
              href="/manage/profile"
              className="flex items-center gap-2 transition-colors"
              style={{
                background: "var(--color-bg-primary)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 6,
                padding: "8px 12px",
                textDecoration: "none",
                transition: "all 150ms ease-out",
              }}
            >
              <Pencil
                size={14}
                style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                }}
              >
                Edit company description
              </span>
            </Link>

            {/* Add team member */}
            <Link
              href="/manage/team"
              className="flex items-center gap-2 transition-colors"
              style={{
                background: "var(--color-bg-primary)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 6,
                padding: "8px 12px",
                textDecoration: "none",
                transition: "all 150ms ease-out",
              }}
            >
              <UserPlus
                size={14}
                style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                }}
              >
                Add team member
              </span>
            </Link>

            {/* Post a news update */}
            <Link
              href="/manage/news"
              className="flex items-center gap-2 transition-colors"
              style={{
                background: "var(--color-bg-primary)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 6,
                padding: "8px 12px",
                textDecoration: "none",
                transition: "all 150ms ease-out",
              }}
            >
              <FilePlus
                size={14}
                style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                }}
              >
                Post a news update
              </span>
            </Link>

            {/* View public profile — accent CTA */}
            <Link
              href={`/company/${company.slug}`}
              className="flex items-center gap-2 transition-colors"
              style={{
                background: "var(--color-accent)",
                borderRadius: 6,
                padding: "8px 12px",
                textDecoration: "none",
                transition: "all 150ms ease-out",
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink
                size={14}
                style={{ color: "white", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "white",
                }}
              >
                View public profile
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
