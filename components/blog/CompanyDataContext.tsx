"use client";
import { createContext, useContext, ReactNode } from "react";

export interface CompanyData {
  slug: string;
  name: string;
  ticker: string | null;
  market_cap: number | null;
  change_pct: number | null;
  logo_url: string | null;
  website: string | null;
  country: string | null;
}

const CompanyDataContext = createContext<Map<string, CompanyData>>(new Map());

export function CompanyDataProvider({
  companies,
  children,
}: {
  companies: CompanyData[];
  children: ReactNode;
}) {
  const map = new Map<string, CompanyData>();
  for (const c of companies) {
    map.set(c.slug, c);
  }
  return (
    <CompanyDataContext.Provider value={map}>
      {children}
    </CompanyDataContext.Provider>
  );
}

export function useCompanyData() {
  return useContext(CompanyDataContext);
}
