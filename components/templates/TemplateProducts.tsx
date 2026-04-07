"use client";
import { Package, ExternalLink, Calendar, Shield, ChevronRight } from "lucide-react";
import type { CommercialProduct } from "@/lib/template-types";

interface Props {
  products: CommercialProduct[];
  brandColor: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  marketed: { label: "Marketed", color: "#059669", bg: "#ecfdf5" },
  "pre-launch": { label: "Pre-Launch", color: "#d97706", bg: "#fffbeb" },
  mature: { label: "Mature", color: "#2563eb", bg: "#eff6ff" },
  declining: { label: "Declining", color: "#9ca3af", bg: "#f3f4f6" },
  withdrawn: { label: "Withdrawn", color: "#dc2626", bg: "#fef2f2" },
  discontinued: { label: "Discontinued", color: "#6b7280", bg: "#f3f4f6" },
};

const TYPE_LABELS: Record<string, string> = {
  drug: "Small Molecule",
  biologic: "Biologic",
  vaccine: "Vaccine",
  generic: "Generic",
  biosimilar: "Biosimilar",
  cell_therapy: "Cell Therapy",
  gene_therapy: "Gene Therapy",
};

export function TemplateProducts({ products, brandColor }: Props) {
  if (products.length === 0) return null;

  return (
    <section id="products" className="py-20 sm:py-28" style={{ background: "var(--color-bg-secondary)" }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex items-center gap-2">
          <Package size={14} style={{ color: brandColor }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: brandColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Commercial Products
          </span>
        </div>
        <h2 className="mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 300, color: "var(--color-text-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          Products on Market
        </h2>
        <p className="mt-3" style={{ fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          {products.length} approved product{products.length !== 1 ? "s" : ""} generating revenue.
        </p>

        <div className="flex flex-col gap-4 mt-10">
          {products.map((product) => {
            const status = STATUS_CONFIG[product.commercial_status] || STATUS_CONFIG.marketed;
            const typeLabel = TYPE_LABELS[product.product_type] || product.product_type;

            return (
              <div
                key={product.id}
                className="rounded-xl overflow-hidden transition-all hover:shadow-md"
                style={{
                  background: "var(--color-bg-primary)",
                  border: "0.5px solid var(--color-border-subtle)",
                }}
              >
                {/* Header bar with brand color accent */}
                <div
                  className="h-1"
                  style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}60)` }}
                />

                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left: product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>
                          {product.brand_name}
                        </h3>
                        <span
                          className="px-2.5 py-0.5 rounded-full"
                          style={{ fontSize: 11, fontWeight: 500, color: status.color, background: status.bg }}
                        >
                          {status.label}
                        </span>
                      </div>

                      {product.generic_name && (
                        <p className="mt-1" style={{ fontSize: 14, color: "var(--color-text-tertiary)" }}>
                          {product.generic_name}
                          {product.active_ingredient && product.active_ingredient !== product.generic_name && (
                            <span> ({product.active_ingredient})</span>
                          )}
                        </p>
                      )}

                      {/* Therapeutic area + type badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {product.therapeutic_area && (
                          <span
                            className="px-2.5 py-1 rounded-lg"
                            style={{ fontSize: 11, color: brandColor, background: `${brandColor}08`, border: `0.5px solid ${brandColor}20` }}
                          >
                            {product.therapeutic_area}
                          </span>
                        )}
                        <span
                          className="px-2.5 py-1 rounded-lg"
                          style={{ fontSize: 11, color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)" }}
                        >
                          {typeLabel}
                        </span>
                        {product.molecule_type && product.molecule_type !== product.product_type && (
                          <span
                            className="px-2.5 py-1 rounded-lg"
                            style={{ fontSize: 11, color: "var(--color-text-tertiary)", background: "var(--color-bg-secondary)" }}
                          >
                            {product.molecule_type.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {product.description && (
                        <p className="mt-4" style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
                          {product.description}
                        </p>
                      )}

                      {/* Indications */}
                      {product.indications && product.indications.length > 0 && (
                        <div className="mt-4">
                          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Approved Indications
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {product.indications.map((ind, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full"
                                style={{ fontSize: 11, color: "var(--color-text-secondary)", background: "var(--color-bg-secondary)", border: "0.5px solid var(--color-border-subtle)" }}
                              >
                                {ind}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mechanism of action */}
                      {product.mechanism_of_action && (
                        <div className="mt-4">
                          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Mechanism of Action
                          </span>
                          <p className="mt-1" style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                            {product.mechanism_of_action}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: key dates and stats */}
                    <div className="shrink-0 sm:w-48">
                      <div className="flex flex-col gap-3">
                        {product.first_approval_date && (
                          <div className="flex items-center gap-2">
                            <Calendar size={13} style={{ color: "var(--color-text-tertiary)" }} />
                            <div>
                              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>First Approved</div>
                              <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>
                                {new Date(product.first_approval_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                              </div>
                            </div>
                          </div>
                        )}

                        {product.patent_expiry_date && (
                          <div className="flex items-center gap-2">
                            <Shield size={13} style={{ color: "var(--color-text-tertiary)" }} />
                            <div>
                              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>Patent Expiry</div>
                              <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>
                                {new Date(product.patent_expiry_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                              </div>
                            </div>
                          </div>
                        )}

                        {(product.has_biosimilar_competition || product.has_generic_competition) && (
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 11, color: "#d97706", fontWeight: 500 }}>
                              ⚠ {product.has_biosimilar_competition ? "Biosimilar" : "Generic"} competition
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
