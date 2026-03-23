"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { createBrowserClient } from "@/lib/supabase";

const supabase = createBrowserClient();

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  // Form state
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCompany(profile.company || "");
      setRole(profile.role || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  // Fetch watchlist count
  useEffect(() => {
    if (!user) return;
    async function fetchWatchlistCount() {
      const { count } = await supabase
        .from("watchlists")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      setWatchlistCount(count || 0);
    }
    fetchWatchlistCount();
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(false);
    setSaving(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        company: company || null,
        role: role || null,
        bio: bio || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setEditing(false);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  if (authLoading || !user) {
    return (
      <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
        <Nav />
        <main className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 120px)" }}>
          <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  const tierLabel = profile?.tier === "pro" ? "Pro" : profile?.tier === "enterprise" ? "Enterprise" : "Free";

  return (
    <div className="page-content" style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}>
      <Nav />

      <main
        className="flex flex-col items-center px-4 py-16"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        <div className="w-full" style={{ maxWidth: 600 }}>
          <h1
            className="text-[28px] font-medium mb-1 tracking-tight"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
          >
            Profile
          </h1>
          <p className="text-13 mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Manage your account information
          </p>

          {/* Success */}
          {success && (
            <div
              className="text-13 mb-4 px-3 py-2 rounded"
              style={{
                background: "rgba(34,197,94,0.08)",
                color: "#16a34a",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              Profile updated successfully
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="text-13 mb-4 px-3 py-2 rounded"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#dc2626",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </div>
          )}

          {/* Profile card */}
          <div
            className="rounded-lg p-6 mb-6"
            style={{
              background: "var(--color-bg-secondary)",
              border: "0.5px solid var(--color-border-subtle)",
            }}
          >
            {/* Avatar + name header */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full text-[20px] font-semibold text-white shrink-0"
                style={{ background: "var(--color-accent)" }}
              >
                {profile?.full_name
                  ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                  : (user.email?.[0] ?? "U").toUpperCase()}
              </div>
              <div>
                <p className="text-[18px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {profile?.full_name || "No name set"}
                </p>
                <p className="text-13" style={{ color: "var(--color-text-tertiary)" }}>
                  {user.email}
                </p>
              </div>
            </div>

            {editing ? (
              <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
                      Full name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-13 px-3 py-2 rounded border outline-none"
                      style={{
                        borderColor: "var(--color-border-medium)",
                        background: "var(--color-bg-primary)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
                      Company
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full text-13 px-3 py-2 rounded border outline-none"
                      style={{
                        borderColor: "var(--color-border-medium)",
                        background: "var(--color-bg-primary)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
                      Role
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full text-13 px-3 py-2 rounded border outline-none"
                      style={{
                        borderColor: "var(--color-border-medium)",
                        background: "var(--color-bg-primary)",
                        color: "var(--color-text-primary)",
                      }}
                      placeholder="e.g. Portfolio Manager"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-11 font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full text-13 px-3 py-2 rounded border outline-none resize-none"
                    style={{
                      borderColor: "var(--color-border-medium)",
                      background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="text-13 font-medium px-4 py-2 rounded text-white transition-opacity"
                    style={{ background: "var(--color-accent)", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFullName(profile?.full_name || "");
                      setCompany(profile?.company || "");
                      setRole(profile?.role || "");
                      setBio(profile?.bio || "");
                    }}
                    className="text-13 font-medium px-4 py-2 rounded transition-colors"
                    style={{
                      color: "var(--color-text-secondary)",
                      border: "1px solid var(--color-border-medium)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-11 font-medium mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                      Company
                    </p>
                    <p className="text-13" style={{ color: "var(--color-text-primary)" }}>
                      {profile?.company || "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="text-11 font-medium mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                      Role
                    </p>
                    <p className="text-13" style={{ color: "var(--color-text-primary)" }}>
                      {profile?.role || "\u2014"}
                    </p>
                  </div>
                </div>
                {profile?.bio && (
                  <div className="mb-4">
                    <p className="text-11 font-medium mb-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                      Bio
                    </p>
                    <p className="text-13" style={{ color: "var(--color-text-primary)" }}>
                      {profile.bio}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="text-13 font-medium px-4 py-2 rounded text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  Edit profile
                </button>
              </>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="rounded-lg p-4"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <p className="text-11 font-medium mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                Plan
              </p>
              <p className="text-[18px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                {tierLabel}
              </p>
            </div>
            <div
              className="rounded-lg p-4"
              style={{
                background: "var(--color-bg-secondary)",
                border: "0.5px solid var(--color-border-subtle)",
              }}
            >
              <p className="text-11 font-medium mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                Watchlists
              </p>
              <p className="text-[18px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                {watchlistCount}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
