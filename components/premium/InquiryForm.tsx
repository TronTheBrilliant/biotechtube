"use client";

import { useState } from "react";
import { Send, CheckCircle, Loader2, MessageSquare } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface InquiryFormProps {
  companyId: string;
  companyName: string;
  brandColor?: string;
}

export function InquiryForm({ companyId, companyName, brandColor = "#1a7a5e" }: InquiryFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senderCompany, setSenderCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSubmitting(true);
    setError(null);

    const supabase = createBrowserClient();
    const { error: insertError } = await supabase.from("company_inquiries").insert({
      company_id: companyId,
      name: name.trim(),
      email: email.trim(),
      sender_company: senderCompany.trim() || null,
      message: message.trim(),
    });

    setSubmitting(false);

    if (insertError) {
      setError("Failed to send inquiry. Please try again.");
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          background: "var(--color-bg-primary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <CheckCircle size={32} className="mx-auto mb-3" style={{ color: brandColor }} />
        <h3
          className="text-[16px] font-semibold mb-1"
          style={{ color: "var(--color-text-primary)" }}
        >
          Inquiry Sent
        </h3>
        <p className="text-13" style={{ color: "var(--color-text-secondary)" }}>
          Your message has been sent to {companyName}. They will follow up directly.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare size={16} style={{ color: brandColor }} />
        <h2
          className="text-[17px] font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Contact {companyName}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border p-6"
        style={{
          background: "var(--color-bg-primary)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              className="text-12 font-medium mb-1.5 block"
              style={{ color: "var(--color-text-primary)" }}
            >
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full text-13 px-3.5 py-2.5 rounded-lg border outline-none transition-colors focus:ring-1"
              style={{
                borderColor: "var(--color-border-medium)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
                "--tw-ring-color": brandColor,
              } as React.CSSProperties}
            />
          </div>
          <div>
            <label
              className="text-12 font-medium mb-1.5 block"
              style={{ color: "var(--color-text-primary)" }}
            >
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full text-13 px-3.5 py-2.5 rounded-lg border outline-none transition-colors focus:ring-1"
              style={{
                borderColor: "var(--color-border-medium)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
                "--tw-ring-color": brandColor,
              } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="mb-4">
          <label
            className="text-12 font-medium mb-1.5 block"
            style={{ color: "var(--color-text-primary)" }}
          >
            Company
          </label>
          <input
            type="text"
            value={senderCompany}
            onChange={(e) => setSenderCompany(e.target.value)}
            placeholder="Your organization (optional)"
            className="w-full text-13 px-3.5 py-2.5 rounded-lg border outline-none transition-colors focus:ring-1"
            style={{
              borderColor: "var(--color-border-medium)",
              background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
              "--tw-ring-color": brandColor,
            } as React.CSSProperties}
          />
        </div>

        <div className="mb-5">
          <label
            className="text-12 font-medium mb-1.5 block"
            style={{ color: "var(--color-text-primary)" }}
          >
            Message *
          </label>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your interest, partnership opportunity, or investment inquiry..."
            rows={4}
            className="w-full text-13 px-3.5 py-2.5 rounded-lg border outline-none resize-y transition-colors focus:ring-1"
            style={{
              borderColor: "var(--color-border-medium)",
              background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
              "--tw-ring-color": brandColor,
            } as React.CSSProperties}
          />
        </div>

        {error && (
          <p className="text-12 mb-3" style={{ color: "#dc2626" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !email.trim() || !message.trim()}
          className="flex items-center gap-2 text-13 font-semibold px-5 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: brandColor }}
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Send Inquiry
        </button>
      </form>
    </div>
  );
}
