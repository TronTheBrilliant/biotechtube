import { Search } from "lucide-react";

export function SearchBar() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-[7px] border"
      style={{
        background: "var(--color-bg-secondary)",
        borderColor: "var(--color-border-medium)",
      }}
    >
      <Search
        size={14}
        style={{ opacity: 0.4, flexShrink: 0, color: "var(--color-text-secondary)" }}
      />
      <input
        type="text"
        placeholder="Search 14,000+ biotech companies..."
        className="flex-1 text-13 bg-transparent border-0 outline-none"
        style={{ color: "var(--color-text-primary)" }}
      />
    </div>
  );
}
