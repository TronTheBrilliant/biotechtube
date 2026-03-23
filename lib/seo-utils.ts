/**
 * Shared utilities for SEO entity pages (drugs, people, investors, therapeutic areas).
 * Handles slugification, deduplication, and Supabase queries.
 */

import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// --- Slugification ---

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Drug Deduplication ---

export function normalizeDrugName(name: string): string {
  return name.toLowerCase().trim();
}

export function drugSlug(name: string): string {
  return slugify(name);
}

// --- People Deduplication ---

const TITLE_PREFIXES = /^(dr\.?|prof\.?|professor|mr\.?|mrs\.?|ms\.?)\s+/i;
const TITLE_SUFFIXES = /,?\s*(phd|md|mba|jr\.?|sr\.?|iii?|iv|dds|do|pharmd|rn|bsc|msc|facs|facc)\.?$/gi;

export function normalizePersonName(name: string): string {
  return name
    .trim()
    .replace(TITLE_PREFIXES, "")
    .replace(TITLE_SUFFIXES, "")
    .replace(TITLE_SUFFIXES, "") // run twice for "PhD, MD" combos
    .trim()
    .toLowerCase();
}

export function personSlug(name: string, companySuffix?: string): string {
  const base = slugify(normalizePersonName(name));
  return companySuffix ? `${base}-${slugify(companySuffix)}` : base;
}

// --- Investor Deduplication ---

const COMPANY_SUFFIXES = /,?\s*(llc|lp|inc\.?|corp\.?|ltd\.?|plc|gmbh|ag|sa|bv|nv|co\.?)\.?$/gi;

export function normalizeInvestorName(name: string): string {
  return name
    .trim()
    .replace(COMPANY_SUFFIXES, "")
    .trim()
    .toLowerCase();
}

export function investorSlug(name: string): string {
  return slugify(name);
}

// --- Data Fetching Helpers ---

export interface DrugWithCompany {
  name: string;
  indication: string;
  phase: string;
  status: string;
  trial_id?: string;
  companySlug: string;
  companyName: string;
  companySummary?: string;
  therapeuticAreas?: string[];
}

export interface PersonWithCompany {
  name: string;
  role: string;
  companySlug: string;
  companyName: string;
  therapeuticAreas?: string[];
}

export interface InvestorWithCompanies {
  name: string;
  slug: string;
  companies: {
    slug: string;
    name: string;
    valuation?: number;
    stage?: string;
    therapeuticAreas?: string[];
  }[];
}

/**
 * Fetch all pipeline programs across all company reports, joined with company data.
 */
export async function getAllDrugs(): Promise<DrugWithCompany[]> {
  const supabase = getSupabase();

  // Paginate to get all reports
  const allReports: Array<{
    report_slug: string;
    pipeline_programs: Array<{ name: string; indication: string; phase: string; status: string; trial_id?: string }> | null;
    summary: string | null;
    therapeutic_areas: string[] | null;
  }> = [];

  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("company_reports")
      .select("report_slug, pipeline_programs, summary, therapeutic_areas")
      .not("pipeline_programs", "is", null)
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    allReports.push(...data);
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  // Get company names for slug lookup
  const slugs = allReports.map((r) => r.report_slug);
  const companyMap = new Map<string, string>();

  for (let i = 0; i < slugs.length; i += 100) {
    const batch = slugs.slice(i, i + 100);
    const { data } = await supabase
      .from("companies")
      .select("slug, name")
      .in("slug", batch);
    if (data) data.forEach((c) => companyMap.set(c.slug, c.name));
  }

  const drugs: DrugWithCompany[] = [];
  for (const report of allReports) {
    if (!report.pipeline_programs) continue;
    for (const prog of report.pipeline_programs) {
      if (!prog.name || !prog.indication) continue;
      drugs.push({
        name: prog.name,
        indication: prog.indication,
        phase: prog.phase || "Unknown",
        status: prog.status || "Unknown",
        trial_id: prog.trial_id || undefined,
        companySlug: report.report_slug,
        companyName: companyMap.get(report.report_slug) || report.report_slug,
        companySummary: report.summary || undefined,
        therapeuticAreas: report.therapeutic_areas || undefined,
      });
    }
  }

  return drugs;
}

/**
 * Fetch all key people across all company reports.
 */
export async function getAllPeople(): Promise<PersonWithCompany[]> {
  const supabase = getSupabase();

  const allReports: Array<{
    report_slug: string;
    key_people: Array<{ name: string; role: string }> | null;
    therapeutic_areas: string[] | null;
  }> = [];

  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("company_reports")
      .select("report_slug, key_people, therapeutic_areas")
      .not("key_people", "is", null)
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    allReports.push(...data);
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  const slugs = allReports.map((r) => r.report_slug);
  const companyMap = new Map<string, string>();

  for (let i = 0; i < slugs.length; i += 100) {
    const batch = slugs.slice(i, i + 100);
    const { data } = await supabase
      .from("companies")
      .select("slug, name")
      .in("slug", batch);
    if (data) data.forEach((c) => companyMap.set(c.slug, c.name));
  }

  const people: PersonWithCompany[] = [];
  for (const report of allReports) {
    if (!report.key_people) continue;
    for (const person of report.key_people) {
      if (!person.name || !person.role) continue;
      people.push({
        name: person.name,
        role: person.role,
        companySlug: report.report_slug,
        companyName: companyMap.get(report.report_slug) || report.report_slug,
        therapeuticAreas: report.therapeutic_areas || undefined,
      });
    }
  }

  return people;
}

/**
 * Fetch all investors and their portfolio companies.
 */
export async function getAllInvestors(): Promise<InvestorWithCompanies[]> {
  const supabase = getSupabase();

  const allReports: Array<{
    report_slug: string;
    investors: string[] | null;
    therapeutic_areas: string[] | null;
    stage: string | null;
  }> = [];

  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from("company_reports")
      .select("report_slug, investors, therapeutic_areas, stage")
      .not("investors", "is", null)
      .range(offset, offset + pageSize - 1);
    if (!data || data.length === 0) break;
    allReports.push(...data);
    offset += pageSize;
    if (data.length < pageSize) break;
  }

  // Company lookup
  const slugs = allReports.map((r) => r.report_slug);
  const companyMap = new Map<string, { name: string; valuation?: number }>();

  for (let i = 0; i < slugs.length; i += 100) {
    const batch = slugs.slice(i, i + 100);
    const { data } = await supabase
      .from("companies")
      .select("slug, name, valuation")
      .in("slug", batch);
    if (data) data.forEach((c) => companyMap.set(c.slug, { name: c.name, valuation: c.valuation }));
  }

  // Group by investor
  const investorMap = new Map<string, InvestorWithCompanies>();

  for (const report of allReports) {
    if (!report.investors) continue;
    for (const inv of report.investors) {
      const normalized = normalizeInvestorName(inv);
      const slug = investorSlug(inv);

      if (!investorMap.has(normalized)) {
        investorMap.set(normalized, {
          name: inv, // keep original casing from first occurrence
          slug,
          companies: [],
        });
      }

      const company = companyMap.get(report.report_slug);
      const entry = investorMap.get(normalized)!;

      // Avoid duplicate companies
      if (!entry.companies.some((c) => c.slug === report.report_slug)) {
        entry.companies.push({
          slug: report.report_slug,
          name: company?.name || report.report_slug,
          valuation: company?.valuation || undefined,
          stage: report.stage || undefined,
          therapeuticAreas: report.therapeutic_areas || undefined,
        });
      }
    }
  }

  return Array.from(investorMap.values());
}
