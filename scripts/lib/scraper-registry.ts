/**
 * Scraper Registry — All biotech directory sources.
 * Each source has metadata for scraping, deduplication, and enrichment.
 */

export interface ScraperSource {
  id: string;
  name: string;
  url: string;
  region: "us" | "europe" | "asia" | "australia" | "global";
  type: "accelerator" | "vc" | "directory" | "clinical" | "database";
  parser: "generic-portfolio" | "yc-api" | "clinicaltrials-api" | "custom-html";
  investor_name?: string;  // Tag company as portfolio company of this investor
  estimated_companies: number;
  enabled: boolean;
  // For generic-portfolio parser:
  css?: {
    container?: string;    // CSS selector for company list container
    item?: string;         // CSS selector for each company card
    name?: string;         // CSS selector for company name within card
    link?: string;         // CSS selector for company link
    description?: string;  // CSS selector for description
  };
}

export const SOURCES: ScraperSource[] = [
  // ─── US Accelerators ───
  {
    id: "yc",
    name: "Y Combinator",
    url: "https://www.ycombinator.com/companies?industry=Biotech&industry=Healthcare",
    region: "us",
    type: "accelerator",
    parser: "yc-api",
    investor_name: "Y Combinator",
    estimated_companies: 200,
    enabled: true,
  },
  {
    id: "indiebio",
    name: "IndieBio / SOSV",
    url: "https://indiebio.co/companies/",
    region: "us",
    type: "accelerator",
    parser: "custom-html",
    investor_name: "IndieBio / SOSV",
    estimated_companies: 800,
    enabled: true,
  },
  {
    id: "jlabs",
    name: "JLABS (Johnson & Johnson)",
    url: "https://jnjinnovation.com/JLABSNavigator",
    region: "global",
    type: "accelerator",
    parser: "custom-html",
    investor_name: "JLABS",
    estimated_companies: 1000,
    enabled: true,
  },

  // ─── US/Global VC Portfolios ───
  {
    id: "flagship",
    name: "Flagship Pioneering",
    url: "https://www.flagshippioneering.com/companies",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "Flagship Pioneering",
    estimated_companies: 147,
    enabled: true,
    css: { item: ".company-card, .portfolio-item, a[href*='/companies/']", name: "h3, .company-name, .title" },
  },
  {
    id: "thirdrock",
    name: "Third Rock Ventures",
    url: "https://www.thirdrockventures.com/portfolio",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "Third Rock Ventures",
    estimated_companies: 72,
    enabled: true,
    css: { item: ".portfolio-company, .company-card, a[href*='/portfolio/']", name: "h3, .company-name" },
  },
  {
    id: "arch",
    name: "ARCH Venture Partners",
    url: "https://www.archventure.com/portfolio/",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "ARCH Venture Partners",
    estimated_companies: 281,
    enabled: true,
    css: { item: ".portfolio-item, .company, a[href*='archventure.com']", name: "h3, .name, .company-name" },
  },
  {
    id: "orbimed",
    name: "OrbiMed",
    url: "https://www.orbimed.com/portfolio/",
    region: "global",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "OrbiMed",
    estimated_companies: 493,
    enabled: true,
    css: { item: ".portfolio-company, .company-item", name: "h3, .company-name" },
  },
  {
    id: "racapital",
    name: "RA Capital Management",
    url: "https://www.racap.com/venture/our-portfolio",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "RA Capital Management",
    estimated_companies: 80,
    enabled: true,
    css: { item: ".portfolio-company, a[href*='racap.com']", name: "h3, .name" },
  },
  {
    id: "polaris",
    name: "Polaris Partners",
    url: "https://polarispartners.com/companies-list/",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "Polaris Partners",
    estimated_companies: 412,
    enabled: true,
    css: { item: ".company-item, .portfolio-item", name: "h3, .company-name, .title" },
  },
  {
    id: "5am",
    name: "5AM Ventures",
    url: "https://5amventures.com/portfolio/",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "5AM Ventures",
    estimated_companies: 96,
    enabled: true,
    css: { item: ".portfolio-company, .company-card", name: "h3, .company-name" },
  },
  {
    id: "atlas",
    name: "Atlas Venture",
    url: "https://atlasventure.com/portfolio/",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "Atlas Venture",
    estimated_companies: 50,
    enabled: true,
    css: { item: ".portfolio-company, a[href*='portfolio']", name: "h3, .name" },
  },
  {
    id: "versant",
    name: "Versant Ventures",
    url: "https://www.versantventures.com/portfolio",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "Versant Ventures",
    estimated_companies: 190,
    enabled: true,
    css: { item: ".portfolio-company, .company-card", name: "h3, .company-name" },
  },
  {
    id: "omega",
    name: "Omega Funds",
    url: "https://omegafunds.com/companies/",
    region: "us",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "Omega Funds",
    estimated_companies: 150,
    enabled: true,
    css: { item: ".company-item, .portfolio-item", name: "h3, .company-name" },
  },
  {
    id: "sofinnova",
    name: "Sofinnova Partners",
    url: "https://sofinnovapartners.com/portfolio",
    region: "europe",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "Sofinnova Partners",
    estimated_companies: 151,
    enabled: true,
    css: { item: ".portfolio-company, .company-card", name: "h3, .company-name" },
  },
  {
    id: "novo",
    name: "Novo Holdings",
    url: "https://novoholdings.dk/investments",
    region: "europe",
    type: "vc",
    parser: "generic-portfolio",
    investor_name: "Novo Holdings",
    estimated_companies: 181,
    enabled: true,
    css: { item: ".investment-item, .portfolio-company", name: "h3, .name" },
  },

  // ─── European Directories ───
  {
    id: "bia-uk",
    name: "BIA (UK BioIndustry Association)",
    url: "https://www.bioindustry.org/membership/directory.html",
    region: "europe",
    type: "directory",
    parser: "custom-html",
    estimated_companies: 600,
    enabled: true,
  },
  {
    id: "swiss-biotech",
    name: "Swiss Biotech",
    url: "https://www.swissbiotech.org/companies/",
    region: "europe",
    type: "directory",
    parser: "custom-html",
    estimated_companies: 300,
    enabled: true,
  },
  {
    id: "france-biotech",
    name: "France Biotech",
    url: "https://france-biotech.fr/annuaire/",
    region: "europe",
    type: "directory",
    parser: "custom-html",
    estimated_companies: 400,
    enabled: true,
  },
  {
    id: "biostock-se",
    name: "BioStock (Sweden/Nordics)",
    url: "https://biostock.se/en/",
    region: "europe",
    type: "directory",
    parser: "custom-html",
    estimated_companies: 200,
    enabled: true,
  },

  // ─── Asian Directories ───
  {
    id: "biojapan",
    name: "BioJapan",
    url: "https://biojapan2025.jcdbizmatch.jp/Lookup/en/List/u0",
    region: "asia",
    type: "directory",
    parser: "custom-html",
    estimated_companies: 1000,
    enabled: true,
  },

  // ─── Australia/NZ ───
  {
    id: "ausbiotech",
    name: "AusBiotech",
    url: "https://www.ausbiotech.org/biotechnology-industry/member-directory",
    region: "australia",
    type: "directory",
    parser: "custom-html",
    estimated_companies: 3000,
    enabled: true,
  },
  {
    id: "mtpconnect",
    name: "MTPConnect",
    url: "https://www.mtpconnect.org.au/directory",
    region: "australia",
    type: "directory",
    parser: "custom-html",
    estimated_companies: 500,
    enabled: true,
  },

  // ─── Clinical Trials ───
  {
    id: "clinicaltrials-gov",
    name: "ClinicalTrials.gov",
    url: "https://clinicaltrials.gov/api/v2/studies",
    region: "global",
    type: "clinical",
    parser: "clinicaltrials-api",
    estimated_companies: 10000,
    enabled: true,
  },

  // ─── General Databases ───
  {
    id: "biospace",
    name: "BioSpace",
    url: "https://www.biospace.com/companies",
    region: "global",
    type: "database",
    parser: "custom-html",
    estimated_companies: 2000,
    enabled: true,
  },
];

/**
 * Get sources by region, type, or specific ID.
 */
export function getSources(filter?: {
  id?: string;
  region?: string;
  type?: string;
  enabled?: boolean;
}): ScraperSource[] {
  let results = SOURCES;
  if (filter?.id) results = results.filter((s) => s.id === filter.id);
  if (filter?.region) results = results.filter((s) => s.region === filter.region);
  if (filter?.type) results = results.filter((s) => s.type === filter.type);
  if (filter?.enabled !== undefined) results = results.filter((s) => s.enabled === filter.enabled);
  return results;
}
