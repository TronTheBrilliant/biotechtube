"use client";

import { useState } from "react";
import { X, RotateCcw } from "lucide-react";

export interface Filters {
  therapeuticArea: string;
  stage: string;
  country: string;
  type: string;
  raisedMin: string;
  raisedMax: string;
  foundedMin: string;
  foundedMax: string;
  employees: string;
}

export const defaultFilters: Filters = {
  therapeuticArea: "All",
  stage: "All",
  country: "All",
  type: "All",
  raisedMin: "",
  raisedMax: "",
  foundedMin: "",
  foundedMax: "",
  employees: "All",
};

const therapeuticAreas = [
  "All", "Oncology", "Immunotherapy", "Gene Therapy", "Diagnostics",
  "Drug Delivery", "Radiopharmaceuticals", "Cell Therapy", "AI Diagnostics",
  "Monoclonal Antibodies", "DNA Vaccine", "Photochemistry",
];

const stages = ["All", "Pre-clinical", "Phase 1", "Phase 1/2", "Phase 2", "Phase 3", "Approved"];
const countries = ["All", "Norway", "Sweden", "Denmark", "UK", "Germany", "USA", "Switzerland", "France"];
const types = ["All", "Public", "Private"];
const employeeRanges = ["All", "1-10", "10-25", "25-50", "50-100", "100-250", "250+"];

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (filters: Filters) => void;
}

export function FiltersModal({ isOpen, onClose, filters, onApply }: FiltersModalProps) {
  const [local, setLocal] = useState<Filters>(filters);

  if (!isOpen) return null;

  const update = (key: keyof Filters, value: string) => setLocal((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleReset = () => {
    setLocal(defaultFilters);
  };

  const activeCount = Object.entries(local).filter(
    ([key, value]) => value !== "" && value !== "All" && value !== defaultFilters[key as keyof Filters]
  ).length;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative mx-auto mt-0 md:mt-16 w-full md:max-w-[480px] md:rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--color-bg-primary)",
          maxHeight: "calc(100vh - 0px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 h-[48px] flex-shrink-0"
          style={{ borderBottom: "0.5px solid var(--color-border-subtle)" }}
        >
          <h2 className="text-14 font-medium" style={{ color: "var(--color-text-primary)" }}>
            Filters
            {activeCount > 0 && (
              <span
                className="ml-2 text-[9px] font-medium px-1.5 py-[2px] rounded-full text-white"
                style={{ background: "var(--color-accent)" }}
              >
                {activeCount}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="p-1" style={{ color: "var(--color-text-tertiary)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
          <div className="flex flex-col gap-5">
            <FilterSelect label="Therapeutic Area" value={local.therapeuticArea} options={therapeuticAreas} onChange={(v) => update("therapeuticArea", v)} />
            <FilterSelect label="Stage" value={local.stage} options={stages} onChange={(v) => update("stage", v)} />
            <FilterSelect label="Country" value={local.country} options={countries} onChange={(v) => update("country", v)} />
            <FilterSelect label="Company Type" value={local.type} options={types} onChange={(v) => update("type", v)} />
            <FilterSelect label="Employees" value={local.employees} options={employeeRanges} onChange={(v) => update("employees", v)} />

            {/* Raised Range */}
            <div>
              <label className="text-11 font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>
                Total Raised
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Min $"
                  value={local.raisedMin}
                  onChange={(e) => update("raisedMin", e.target.value)}
                  className="flex-1 text-12 px-3 py-2 rounded border outline-none"
                  style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                />
                <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                <input
                  type="text"
                  placeholder="Max $"
                  value={local.raisedMax}
                  onChange={(e) => update("raisedMax", e.target.value)}
                  className="flex-1 text-12 px-3 py-2 rounded border outline-none"
                  style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                />
              </div>
            </div>

            {/* Founded Range */}
            <div>
              <label className="text-11 font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>
                Founded Year
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="From"
                  value={local.foundedMin}
                  onChange={(e) => update("foundedMin", e.target.value)}
                  className="flex-1 text-12 px-3 py-2 rounded border outline-none"
                  style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                />
                <span className="text-11" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                <input
                  type="text"
                  placeholder="To"
                  value={local.foundedMax}
                  onChange={(e) => update("foundedMax", e.target.value)}
                  className="flex-1 text-12 px-3 py-2 rounded border outline-none"
                  style={{ borderColor: "var(--color-border-medium)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 h-[56px] flex-shrink-0"
          style={{ borderTop: "0.5px solid var(--color-border-subtle)" }}
        >
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-12"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            onClick={handleApply}
            className="text-12 font-medium px-5 py-2 rounded text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-11 font-medium mb-1.5 block" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-12 px-3 py-2.5 rounded border outline-none appearance-none"
        style={{
          borderColor: "var(--color-border-medium)",
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239e9e96' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
