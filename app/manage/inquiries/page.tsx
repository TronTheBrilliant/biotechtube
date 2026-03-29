"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";
import { PremiumGate } from "@/components/dashboard/PremiumGate";
import { MessageSquare, Loader2 } from "lucide-react";

/* ─── Types ─── */

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

/* ─── Inner content ─── */

function InquiriesContent() {
  const { company } = useDashboard();
  const supabase = createBrowserClient();

  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInquiries = async () => {
    const { data } = await supabase
      .from("company_inquiries")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });
    setInquiries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadInquiries();
  }, [company.id]);

  const markRead = async (id: string) => {
    await supabase.from("company_inquiries").update({ read: true }).eq("id", id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  };

  const unreadCount = inquiries.filter((i) => !i.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 40 }}>
        <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Inquiries
          </h1>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "white",
                background: "#dc2626",
                padding: "2px 7px",
                borderRadius: 20,
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
          Messages from investors and partners via your profile contact form
        </p>
      </div>

      {/* Empty state */}
      {inquiries.length === 0 ? (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: 40,
            textAlign: "center",
          }}
        >
          <MessageSquare
            size={26}
            style={{ color: "var(--color-text-tertiary)", margin: "0 auto 10px" }}
          />
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            No inquiries yet.
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Investors and partners can reach you through your profile contact form.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {inquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              style={{
                background: inquiry.read
                  ? "var(--color-bg-secondary)"
                  : "var(--color-accent-subtle)",
                border: `0.5px solid ${inquiry.read ? "var(--color-border-subtle)" : "var(--color-accent)"}`,
                borderLeft: inquiry.read
                  ? "0.5px solid var(--color-border-subtle)"
                  : "3px solid var(--color-accent)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              {/* Top row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {inquiry.name}
                    </span>
                    {!inquiry.read && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: "white",
                          background: "var(--color-accent)",
                          padding: "1px 6px",
                          borderRadius: 20,
                        }}
                      >
                        New
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      {inquiry.email}
                    </span>
                    {inquiry.sender_company && (
                      <>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>·</span>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {inquiry.sender_company}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    {new Date(inquiry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {!inquiry.read && (
                    <button
                      onClick={() => markRead(inquiry.id)}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        background: "transparent",
                        border: "0.5px solid var(--color-border-subtle)",
                        padding: "4px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>

              {/* Message body */}
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {inquiry.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function InquiriesPage() {
  const { claim, company } = useDashboard();

  return (
    <PremiumGate
      plan={claim.plan}
      requiredPlan="professional"
      featureName="Inquiry Inbox"
      companySlug={company.slug}
    >
      <InquiriesContent />
    </PremiumGate>
  );
}
