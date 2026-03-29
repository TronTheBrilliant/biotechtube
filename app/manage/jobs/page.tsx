"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";
import { PremiumGate } from "@/components/dashboard/PremiumGate";
import {
  Plus,
  Save,
  Trash2,
  Pencil,
  Loader2,
  Briefcase,
} from "lucide-react";

/* ─── Types ─── */

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

/* ─── Label style helper ─── */
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "var(--color-text-tertiary)",
  display: "block",
  marginBottom: 4,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  background: "var(--color-bg-secondary)",
  border: "0.5px solid var(--color-border-subtle)",
  borderRadius: 6,
  fontSize: 13,
  padding: "8px 12px",
  color: "var(--color-text-primary)",
  outline: "none",
  width: "100%",
};

/* ─── Inner content ─── */

function JobsContent() {
  const { company, claim } = useDashboard();
  const supabase = createBrowserClient();

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<Partial<JobRow> | null>(null);
  const [jobSaving, setJobSaving] = useState(false);

  const loadJobs = async () => {
    const { data } = await supabase
      .from("company_jobs")
      .select("*")
      .eq("company_id", company.id)
      .order("posted_at", { ascending: false });
    setJobs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, [company.id]);

  const saveJob = async () => {
    if (!editingJob?.title) return;
    setJobSaving(true);

    if (editingJob.id) {
      await supabase
        .from("company_jobs")
        .update({
          title: editingJob.title,
          location: editingJob.location || null,
          type: editingJob.type || "Full-time",
          department: editingJob.department || null,
          description: editingJob.description || null,
          apply_url: editingJob.apply_url || null,
          status: editingJob.status || "active",
        })
        .eq("id", editingJob.id);
    } else {
      await supabase.from("company_jobs").insert({
        company_id: company.id,
        title: editingJob.title,
        location: editingJob.location || null,
        type: editingJob.type || "Full-time",
        department: editingJob.department || null,
        description: editingJob.description || null,
        apply_url: editingJob.apply_url || null,
        status: "active",
      });
    }

    setEditingJob(null);
    setJobSaving(false);
    loadJobs();
  };

  const deleteJob = async (id: string) => {
    await supabase.from("company_jobs").delete().eq("id", id);
    loadJobs();
  };

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
      <div className="flex items-start justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>
            Job Listings
          </h1>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            Manage open positions at {company.name}
          </p>
        </div>
        <button
          onClick={() =>
            setEditingJob({
              title: "",
              location: "",
              type: "Full-time",
              department: "",
              description: "",
              apply_url: "",
            })
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "white",
            background: "var(--color-accent)",
            padding: "7px 14px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Plus size={13} />
          Add Job
        </button>
      </div>

      {/* Add/Edit form */}
      {editingJob && (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-accent)",
            borderRadius: 8,
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 14 }}>
            {editingJob.id ? "Edit Position" : "Add Position"}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                type="text"
                value={editingJob.title || ""}
                onChange={(e) => setEditingJob((j) => ({ ...j, title: e.target.value }))}
                placeholder="Senior Research Scientist"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                value={editingJob.location || ""}
                onChange={(e) => setEditingJob((j) => ({ ...j, location: e.target.value }))}
                placeholder="Boston, MA"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select
                value={editingJob.type || "Full-time"}
                onChange={(e) => setEditingJob((j) => ({ ...j, type: e.target.value }))}
                style={inputStyle}
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input
                type="text"
                value={editingJob.department || ""}
                onChange={(e) => setEditingJob((j) => ({ ...j, department: e.target.value }))}
                placeholder="R&D"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={editingJob.description || ""}
                onChange={(e) => setEditingJob((j) => ({ ...j, description: e.target.value }))}
                placeholder="Brief job description..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Apply URL</label>
              <input
                type="text"
                value={editingJob.apply_url || ""}
                onChange={(e) => setEditingJob((j) => ({ ...j, apply_url: e.target.value }))}
                placeholder="https://careers.yourcompany.com/apply/123"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={saveJob}
              disabled={jobSaving || !editingJob.title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                color: "white",
                background: "var(--color-accent)",
                padding: "7px 14px",
                borderRadius: 6,
                border: "none",
                cursor: jobSaving || !editingJob.title ? "not-allowed" : "pointer",
                opacity: jobSaving || !editingJob.title ? 0.5 : 1,
              }}
            >
              {jobSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
            <button
              onClick={() => setEditingJob(null)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                background: "transparent",
                border: "0.5px solid var(--color-border-subtle)",
                padding: "7px 14px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Job list */}
      {jobs.length === 0 && !editingJob ? (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: 40,
            textAlign: "center",
          }}
        >
          <Briefcase
            size={26}
            style={{ color: "var(--color-text-tertiary)", margin: "0 auto 10px" }}
          />
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            No job listings yet.
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
            Attract top talent by posting open positions.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 8,
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {job.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 7px",
                      borderRadius: 20,
                      background: job.status === "active" ? "#dcfce7" : "#fee2e2",
                      color: job.status === "active" ? "#166534" : "#991b1b",
                    }}
                  >
                    {job.status}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 7px",
                      borderRadius: 20,
                      background: "var(--color-bg-tertiary)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {job.type}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {job.location && (
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{job.location}</span>
                  )}
                  {job.department && (
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{job.department}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => setEditingJob(job)}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteJob(job.id)}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#dc2626",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function JobsPage() {
  const { claim, company } = useDashboard();

  return (
    <PremiumGate
      plan={claim.plan}
      requiredPlan="professional"
      featureName="Job Postings"
      companySlug={company.slug}
    >
      <JobsContent />
    </PremiumGate>
  );
}
