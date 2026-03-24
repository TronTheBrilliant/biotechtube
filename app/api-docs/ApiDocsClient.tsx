"use client";

import { useState } from "react";

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; description: string }[];
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/companies",
    description: "List companies with optional search and filtering.",
    params: [
      { name: "q", type: "string", description: "Search query (name, ticker)" },
      { name: "sector", type: "string", description: "Filter by sector slug" },
      { name: "country", type: "string", description: "Filter by country" },
      { name: "limit", type: "integer", description: "Results per page (default: 20, max: 100)" },
      { name: "offset", type: "integer", description: "Pagination offset" },
    ],
    response: `{
  "data": [
    {
      "id": "uuid",
      "name": "Moderna Inc",
      "slug": "moderna",
      "ticker": "MRNA",
      "country": "United States",
      "sector": "mRNA Therapeutics",
      "market_cap": 45200000000,
      "pipeline_count": 47
    }
  ],
  "total": 14253,
  "limit": 20,
  "offset": 0
}`,
  },
  {
    method: "GET",
    path: "/api/v1/companies/:slug",
    description: "Get detailed company profile including pipeline, funding, and team data.",
    params: [
      { name: "slug", type: "string", description: "Company URL slug (path parameter)" },
    ],
    response: `{
  "id": "uuid",
  "name": "Moderna Inc",
  "slug": "moderna",
  "description": "...",
  "ticker": "MRNA",
  "country": "United States",
  "founded_year": 2010,
  "market_cap": 45200000000,
  "pipeline_count": 47,
  "funding_total": 6100000000,
  "website": "https://modernatx.com"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/products",
    description: "List products with hype scores, filtering by type and stage.",
    params: [
      { name: "type", type: "string", description: "Product type: drug, device, ai_ml, approved_drug" },
      { name: "stage", type: "string", description: "Clinical stage filter" },
      { name: "min_score", type: "integer", description: "Minimum hype score (0-100)" },
      { name: "sort", type: "string", description: "Sort by: hype_score, name, stage" },
      { name: "limit", type: "integer", description: "Results per page (default: 20, max: 100)" },
    ],
    response: `{
  "data": [
    {
      "id": "uuid",
      "name": "mRNA-1273",
      "product_type": "drug",
      "company_name": "Moderna Inc",
      "stage": "Approved",
      "hype_score": 92,
      "trending_direction": "up",
      "indication": "COVID-19 vaccine"
    }
  ],
  "total": 86889,
  "limit": 20,
  "offset": 0
}`,
  },
  {
    method: "GET",
    path: "/api/v1/products/:slug",
    description: "Get detailed product data including scores breakdown and clinical trial info.",
    params: [
      { name: "slug", type: "string", description: "Product URL slug (path parameter)" },
    ],
    response: `{
  "id": "uuid",
  "name": "mRNA-1273",
  "product_type": "drug",
  "company_name": "Moderna Inc",
  "stage": "Approved",
  "hype_score": 92,
  "clinical_score": 88,
  "activity_score": 76,
  "community_score": 95,
  "indication": "COVID-19 vaccine",
  "mechanism_of_action": "mRNA-based",
  "nct_ids": ["NCT04470427"]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/funding",
    description: "List recent funding rounds with company and deal details.",
    params: [
      { name: "company_id", type: "uuid", description: "Filter by company" },
      { name: "round_type", type: "string", description: "Filter by round type (Series A, IPO, etc.)" },
      { name: "min_amount", type: "integer", description: "Minimum round amount in USD" },
      { name: "since", type: "date", description: "Filter by date (ISO 8601)" },
      { name: "limit", type: "integer", description: "Results per page (default: 20)" },
    ],
    response: `{
  "data": [
    {
      "id": "uuid",
      "company_name": "Moderna Inc",
      "amount": 500000000,
      "round_type": "Series B",
      "date": "2024-03-15",
      "investors": ["Flagship Pioneering"]
    }
  ],
  "total": 26379,
  "limit": 20,
  "offset": 0
}`,
  },
  {
    method: "GET",
    path: "/api/v1/market",
    description: "Get market snapshot data including sector performance and indices.",
    params: [
      { name: "sector", type: "string", description: "Filter by sector" },
      { name: "date", type: "date", description: "Specific date (default: latest)" },
    ],
    response: `{
  "date": "2026-03-24",
  "biotech_index": 4521.3,
  "total_market_cap": 2145000000000,
  "sectors": [
    {
      "name": "Oncology",
      "market_cap": 523000000000,
      "company_count": 2341,
      "avg_change_24h": 1.2
    }
  ]
}`,
  },
];

const CODE_EXAMPLES: Record<string, string> = {
  curl: `curl -X GET "https://api.biotechtube.com/v1/companies?q=moderna&limit=5" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
  python: `import requests

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(
    "https://api.biotechtube.com/v1/companies",
    params={"q": "moderna", "limit": 5},
    headers=headers
)

data = response.json()
for company in data["data"]:
    print(f"{company['name']} - {company['ticker']}")`,
  javascript: `const response = await fetch(
  "https://api.biotechtube.com/v1/companies?q=moderna&limit=5",
  {
    headers: {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json"
    }
  }
);

const data = await response.json();
data.data.forEach(company => {
  console.log(\`\${company.name} - \${company.ticker}\`);
});`,
};

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    GET: { bg: "rgba(34,197,94,0.1)", color: "#16a34a" },
    POST: { bg: "rgba(59,130,246,0.1)", color: "#2563eb" },
    PUT: { bg: "rgba(245,158,11,0.1)", color: "#d97706" },
    DELETE: { bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
  };
  const c = colors[method] || colors.GET;
  return (
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded font-mono"
      style={{ background: c.bg, color: c.color }}
    >
      {method}
    </span>
  );
}

export function ApiDocsClient() {
  const [activeEndpoint, setActiveEndpoint] = useState(0);
  const [codeTab, setCodeTab] = useState<"curl" | "python" | "javascript">("curl");

  const ep = ENDPOINTS[activeEndpoint];

  return (
    <div>
      <h2
        className="text-[20px] font-bold mb-4"
        style={{ color: "var(--color-text-primary)" }}
      >
        Endpoints
      </h2>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <div className="md:w-64 flex-shrink-0">
          <div className="flex flex-col gap-1">
            {ENDPOINTS.map((e, i) => (
              <button
                key={e.path}
                onClick={() => setActiveEndpoint(i)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-[13px]"
                style={{
                  background: i === activeEndpoint ? "var(--color-bg-secondary)" : "transparent",
                  color: i === activeEndpoint ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  border: i === activeEndpoint ? "1px solid var(--color-border-subtle)" : "1px solid transparent",
                }}
              >
                <MethodBadge method={e.method} />
                <span className="font-mono truncate">{e.path.replace("/api/v1", "")}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0">
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--color-border-subtle)" }}
          >
            {/* Header */}
            <div
              className="px-5 py-4"
              style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <MethodBadge method={ep.method} />
                <code className="text-[14px] font-mono font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {ep.path}
                </code>
              </div>
              <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                {ep.description}
              </p>
            </div>

            {/* Parameters */}
            {ep.params && ep.params.length > 0 && (
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                  Parameters
                </h4>
                <div className="flex flex-col gap-2">
                  {ep.params.map((p) => (
                    <div key={p.name} className="flex items-start gap-3">
                      <code className="text-[12px] font-mono font-medium shrink-0 mt-0.5" style={{ color: "#6366f1" }}>
                        {p.name}
                      </code>
                      <span className="text-[11px] px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-tertiary)" }}>
                        {p.type}
                      </span>
                      <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                        {p.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response */}
            <div className="px-5 py-4">
              <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                Response
              </h4>
              <pre
                className="rounded-lg px-4 py-3 text-[12px] font-mono overflow-x-auto"
                style={{ background: "var(--color-bg-tertiary)", color: "var(--color-text-primary)" }}
              >
                {ep.response}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="mt-8">
        <h2 className="text-[20px] font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
          Code Examples
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--color-border-subtle)" }}
        >
          <div
            className="flex gap-0"
            style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            {(["curl", "python", "javascript"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCodeTab(tab)}
                className="px-4 py-2.5 text-[13px] font-medium transition-colors"
                style={{
                  color: codeTab === tab ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                  borderBottom: codeTab === tab ? "2px solid #6366f1" : "2px solid transparent",
                }}
              >
                {tab === "curl" ? "cURL" : tab === "python" ? "Python" : "JavaScript"}
              </button>
            ))}
          </div>
          <pre
            className="px-5 py-4 text-[12px] font-mono overflow-x-auto"
            style={{ background: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}
          >
            {CODE_EXAMPLES[codeTab]}
          </pre>
        </div>
      </div>
    </div>
  );
}
