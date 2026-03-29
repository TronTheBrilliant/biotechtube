"use client";

import { useState, useEffect, useCallback } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useDashboard } from "@/app/manage/layout";

interface PipelineProduct {
  id: string;
  product_name: string;
  indication: string | null;
  stage: string | null;
}

/* ─── Stage badge colors (matches DESIGN_SYSTEM.md) ─── */
function stageBadgeStyle(stage: string | null): React.CSSProperties {
  const s = (stage || "").toLowerCase();
  if (s.includes("approved")) {
    return { background: "#e8f5f0", color: "#0a3d2e", border: "0.5px solid #5DCAA5" };
  }
  if (s.includes("phase 3")) {
    return { background: "#eff6ff", color: "#1d4ed8", border: "0.5px solid #93c5fd" };
  }
  if (s.includes("phase 2")) {
    return { background: "#eff6ff", color: "#1d4ed8", border: "0.5px solid #93c5fd" };
  }
  if (s.includes("phase 1")) {
    return { background: "#f5f3ff", color: "#5b21b6", border: "0.5px solid #c4b5fd" };
  }
  // Pre-clinical / default
  return {
    background: "var(--color-bg-secondary)",
    color: "var(--color-text-secondary)",
    border: "0.5px solid var(--color-border-medium)",
  };
}

export default function PipelinePage() {
  const { company } = useDashboard();
  const supabase = createBrowserClient();

  const [products, setProducts] = useState<PipelineProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pipelines")
      .select("id, product_name, indication, stage")
      .eq("company_id", company.id)
      .order("stage");
    setProducts(data || []);
    setLoading(false);
  }, [company.id, supabase]);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          Pipeline
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            marginTop: 4,
          }}
        >
          Read-only view — pipeline data is sourced from clinical trial registries
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </div>
      ) : products.length === 0 ? (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <FlaskConical
            size={28}
            style={{ color: "var(--color-text-tertiary)", margin: "0 auto 12px" }}
          />
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            No pipeline products found
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              marginTop: 4,
              maxWidth: 320,
              margin: "6px auto 0",
            }}
          >
            Pipeline data is automatically sourced from clinical trial registries. Contact support if
            your pipeline is missing.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "0.5px solid var(--color-border-subtle)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 140px",
              padding: "8px 16px",
              borderBottom: "0.5px solid var(--color-border-subtle)",
              background: "var(--color-bg-primary)",
            }}
          >
            {["Product", "Indication", "Stage"].map((col) => (
              <span
                key={col}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--color-text-tertiary)",
                }}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {products.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 140px",
                padding: "10px 16px",
                borderBottom:
                  idx < products.length - 1
                    ? "0.5px solid var(--color-border-subtle)"
                    : "none",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                }}
              >
                {p.product_name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  paddingRight: 12,
                }}
              >
                {p.indication || "—"}
              </span>
              <div>
                {p.stage ? (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "3px 8px",
                      borderRadius: 4,
                      ...stageBadgeStyle(p.stage),
                    }}
                  >
                    {p.stage}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product count footer */}
      {products.length > 0 && (
        <p
          style={{
            fontSize: 11,
            color: "var(--color-text-tertiary)",
            marginTop: 10,
          }}
        >
          {products.length} product{products.length !== 1 ? "s" : ""} in pipeline
        </p>
      )}
    </div>
  );
}
