# Database Setup & BioPharmGuy Scraping Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a Supabase database, scrape ~10,000+ biotech companies from BioPharmGuy (EU + US), and serve them through Next.js API routes so the frontend shows real data instead of 8 hardcoded JSON entries.

**Architecture:** Supabase Postgres as the database. A standalone TypeScript scraper script fetches BioPharmGuy country pages via HTTP, parses company data (name, city, country, website, categories), deduplicates by website domain, and batch-inserts into Supabase. Next.js API routes query Supabase and serve paginated, filterable data. The frontend components swap JSON imports for `fetch()` calls to these API routes.

**Tech Stack:** Supabase (Postgres + JS client), Next.js 14 API routes, TypeScript, cheerio (HTML parsing)

---

## Chunk 1: Supabase Setup & Schema

### Task 1: Install Supabase dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @supabase/supabase-js and cheerio**

```bash
cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube
npm install @supabase/supabase-js cheerio
npm install -D @types/cheerio
```

- [ ] **Step 2: Verify installation**

```bash
cat package.json | grep -E "supabase|cheerio"
```

Expected: Both packages appear in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add supabase-js and cheerio for database and scraping"
```

---

### Task 2: Create Supabase client configuration

**Files:**
- Create: `lib/supabase.ts`
- Create: `.env.local` (DO NOT commit)

- [ ] **Step 1: Create .env.local with placeholder values**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Note: The user must create a Supabase project at https://supabase.com/dashboard and fill in real values. The `NEXT_PUBLIC_` vars are safe for the browser. The `SERVICE_ROLE_KEY` is server-only (for scraper and API routes).

- [ ] **Step 2: Verify .env.local is in .gitignore**

```bash
grep ".env" .gitignore || echo ".env*.local" >> .gitignore
```

- [ ] **Step 3: Create lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Browser client (uses anon key, respects RLS)
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server client (uses service role key, bypasses RLS)
// Use ONLY in API routes and scraper scripts
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts .gitignore
git commit -m "feat: add Supabase client configuration"
```

---

### Task 3: Create database types

**Files:**
- Create: `lib/database.types.ts`

- [ ] **Step 1: Create lib/database.types.ts**

This defines the TypeScript types matching our Supabase schema.

```typescript
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          slug: string
          name: string
          country: string
          city: string | null
          website: string | null
          domain: string | null
          categories: string[]
          description: string | null
          founded: number | null
          employee_range: string | null
          stage: string | null
          company_type: string | null
          ticker: string | null
          logo_url: string | null
          total_raised: number | null
          valuation: number | null
          is_estimated: boolean
          trending_rank: number | null
          profile_views: number
          source: string
          source_url: string | null
          enriched_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'],
          'id' | 'created_at' | 'updated_at' | 'profile_views'> & {
          id?: string
          created_at?: string
          updated_at?: string
          profile_views?: number
        }
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      scrape_log: {
        Row: {
          id: string
          source: string
          url: string
          status: string
          company_count: number
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['scrape_log']['Row'], 'id'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['scrape_log']['Insert']>
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/database.types.ts
git commit -m "feat: add Supabase database type definitions"
```

---

### Task 4: Create database schema in Supabase

**Files:**
- Create: `scripts/schema.sql`

This SQL must be run in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).

- [ ] **Step 1: Create scripts/schema.sql**

```sql
-- ============================================
-- BiotechTube Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Companies table (core)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  website TEXT,
  domain TEXT,
  categories TEXT[] DEFAULT '{}',
  description TEXT,
  founded INTEGER,
  employee_range TEXT,
  stage TEXT CHECK (stage IN (
    'Pre-clinical', 'Phase 1', 'Phase 1/2', 'Phase 2', 'Phase 3', 'Approved', NULL
  )),
  company_type TEXT CHECK (company_type IN ('Public', 'Private', NULL)),
  ticker TEXT,
  logo_url TEXT,
  total_raised BIGINT,
  valuation BIGINT,
  is_estimated BOOLEAN DEFAULT false,
  trending_rank INTEGER,
  profile_views INTEGER DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'biopharmguy',
  source_url TEXT,
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country);
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_stage ON companies(stage);
CREATE INDEX IF NOT EXISTS idx_companies_trending ON companies(trending_rank);
CREATE INDEX IF NOT EXISTS idx_companies_categories ON companies USING GIN(categories);

-- Full-text search index
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(country, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_companies_fts ON companies USING GIN(fts);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Scrape log (tracks scraping runs)
CREATE TABLE IF NOT EXISTS scrape_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  company_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Row Level Security (public read, service-role write)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_log ENABLE ROW LEVEL SECURITY;

-- Anyone can read companies
CREATE POLICY "Companies are publicly readable"
  ON companies FOR SELECT
  USING (true);

-- Only service role can insert/update/delete companies
CREATE POLICY "Service role can manage companies"
  ON companies FOR ALL
  USING (auth.role() = 'service_role');

-- Only service role can manage scrape_log
CREATE POLICY "Service role can manage scrape_log"
  ON scrape_log FOR ALL
  USING (auth.role() = 'service_role');

-- Allow anon to read scrape_log
CREATE POLICY "Scrape log is publicly readable"
  ON scrape_log FOR SELECT
  USING (true);
```

- [ ] **Step 2: Instruct user to run schema**

Print: "Please go to your Supabase Dashboard > SQL Editor, paste the contents of `scripts/schema.sql`, and click Run. Then confirm it succeeded."

- [ ] **Step 3: Commit**

```bash
git add scripts/schema.sql
git commit -m "feat: add Supabase database schema for companies"
```

---

## Chunk 2: BioPharmGuy Scraper

### Task 5: Create URL registry for BioPharmGuy pages

**Files:**
- Create: `scripts/scrape-config.ts`

- [ ] **Step 1: Create scripts/scrape-config.ts**

This lists all BioPharmGuy pages to scrape, organized by region. We scrape by country/region to get name + city + website, then separately scrape category pages to tag companies.

```typescript
// BioPharmGuy pages to scrape for EU + US companies
export const COUNTRY_PAGES: { url: string; country: string; region: string }[] = [
  // === Europe ===
  { url: 'https://biopharmguy.com/links/company-by-location-austria.php', country: 'Austria', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-belgium-all-location.php', country: 'Belgium', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/company-by-location-czech-republic.php', country: 'Czech Republic', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-denmark-all-location.php', country: 'Denmark', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/company-by-location-finland.php', country: 'Finland', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-france-all-location.php', country: 'France', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-germany-all-location.php', country: 'Germany', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/company-by-location-hungary.php', country: 'Hungary', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-ireland-all-location.php', country: 'Ireland', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-italy-all-location.php', country: 'Italy', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-netherlands-all-location.php', country: 'Netherlands', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/company-by-location-norway.php', country: 'Norway', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/company-by-location-poland.php', country: 'Poland', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/company-by-location-portugal.php', country: 'Portugal', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-spain-all-location.php', country: 'Spain', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-sweden-all-location.php', country: 'Sweden', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-switzerland-all-location.php', country: 'Switzerland', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/country-united-kingdom-all-location.php', country: 'United Kingdom', region: 'Europe' },
  { url: 'https://biopharmguy.com/links/company-by-location-europe.php', country: 'Europe - Other', region: 'Europe' },
  // === United States (by region) ===
  { url: 'https://biopharmguy.com/links/company-by-location-dc-area.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-new-england.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-njnypa.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-northwest.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-northern-california.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-southern-california.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-southwest.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-midwest.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-mountain-west.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-south.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-carolinas.php', country: 'United States', region: 'US' },
  { url: 'https://biopharmguy.com/links/company-by-location-other.php', country: 'United States', region: 'US' },
]

// Category pages — we scrape these to tag companies with categories
// We match by website domain to associate categories with existing company rows
export const CATEGORY_PAGES: { url: string; category: string }[] = [
  { url: 'https://biopharmguy.com/links/company-by-location-ai.php', category: 'AI / Machine Learning' },
  { url: 'https://biopharmguy.com/links/company-by-location-antibodies.php', category: 'Antibodies' },
  { url: 'https://biopharmguy.com/links/company-by-location-biologics.php', category: 'Biologics' },
  { url: 'https://biopharmguy.com/links/company-by-location-biosimilars.php', category: 'Biosimilars' },
  { url: 'https://biopharmguy.com/links/company-by-location-diagnostics.php', category: 'Diagnostics' },
  { url: 'https://biopharmguy.com/links/company-by-location-drug-delivery.php', category: 'Drug Delivery' },
  { url: 'https://biopharmguy.com/links/company-by-location-generics.php', category: 'Generic Drugs' },
  { url: 'https://biopharmguy.com/links/company-by-location-genetics.php', category: 'Genetics & Genomics' },
  { url: 'https://biopharmguy.com/links/company-by-location-microbiome.php', category: 'Microbiome' },
  { url: 'https://biopharmguy.com/links/company-by-location-nano-biotech.php', category: 'Nanotechnology' },
  { url: 'https://biopharmguy.com/links/company-by-location-radiopharmaceuticals.php', category: 'Radiopharmaceuticals' },
  { url: 'https://biopharmguy.com/links/company-by-location-dna-rna.php', category: 'RNA & Gene Therapy' },
  { url: 'https://biopharmguy.com/links/company-by-location-small-molecules.php', category: 'Small Molecules' },
  { url: 'https://biopharmguy.com/links/company-by-location-stem-cells.php', category: 'Cell & Gene Therapy' },
  { url: 'https://biopharmguy.com/links/company-by-location-vaccines.php', category: 'Vaccines' },
  { url: 'https://biopharmguy.com/links/company-by-location-viral-technology.php', category: 'Viral Technology' },
  { url: 'https://biopharmguy.com/links/company-by-location-psychedelics.php', category: 'Psychedelics' },
  { url: 'https://biopharmguy.com/links/company-by-location-tissue-engineering.php', category: 'Tissue Engineering' },
]
```

- [ ] **Step 2: Commit**

```bash
git add scripts/scrape-config.ts
git commit -m "feat: add BioPharmGuy URL registry for scraping"
```

---

### Task 6: Create HTML parser for BioPharmGuy pages

**Files:**
- Create: `scripts/parse-bpg.ts`

- [ ] **Step 1: Create scripts/parse-bpg.ts**

BioPharmGuy pages list companies as links grouped by city/state. The format from our WebFetch test was:
```
Company Name | City | https://website.com
```

The raw HTML uses `<a>` tags with company names as text and their website as href, grouped under city/location headings. We parse the HTML with cheerio.

```typescript
import * as cheerio from 'cheerio'

export interface ParsedCompany {
  name: string
  city: string
  website: string
  domain: string
}

/**
 * Extract domain from a URL, normalizing www. prefix
 * e.g. "https://www.oncoinvent.com/" -> "oncoinvent.com"
 */
export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Generate a URL-safe slug from a company name
 * e.g. "Oncoinvent AS" -> "oncoinvent-as"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

/**
 * Parse a BioPharmGuy country/region page HTML.
 *
 * BPG pages structure company links as <a> tags with the company website
 * as the href and company name as text. They're grouped under location
 * headings (cities or states).
 *
 * We extract: company name, city (from nearest heading), website URL, domain.
 */
export function parseBPGPage(html: string): ParsedCompany[] {
  const $ = cheerio.load(html)
  const companies: ParsedCompany[] = []
  const seen = new Set<string>()

  // BPG uses a main content area with company links
  // Each link to an external company website is a company entry
  // Find all external links (not biopharmguy.com links)
  let currentCity = ''

  // Walk through the main content looking for headings and links
  $('h2, h3, h4, a').each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase()

    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      // This might be a city/location heading
      const text = $(el).text().trim()
      if (text && !text.includes('Subscribe') && !text.includes('Thanks')) {
        currentCity = text
      }
      return
    }

    if (tag === 'a') {
      const href = $(el).attr('href') || ''
      const name = $(el).text().trim()

      // Skip internal BPG links, empty links, mailto, etc.
      if (!href || !name) return
      if (href.includes('biopharmguy.com')) return
      if (href.startsWith('#') || href.startsWith('mailto:')) return
      if (href.includes('constantcontact.com')) return
      if (href.includes('google.com')) return
      if (href.includes('linkedin.com') && !name) return

      // Must be an http(s) link
      if (!href.startsWith('http')) return

      const domain = extractDomain(href)
      if (!domain) return

      // Skip duplicates within same page (same domain)
      if (seen.has(domain)) return
      seen.add(domain)

      // Skip very generic domains that aren't company websites
      const skipDomains = [
        'linkedin.com', 'twitter.com', 'facebook.com', 'youtube.com',
        'google.com', 'wikipedia.org', 'sec.gov', 'nih.gov',
        'constantcontact.com', 'ctctcdn.com'
      ]
      if (skipDomains.some(d => domain.includes(d))) return

      companies.push({
        name,
        city: currentCity,
        website: href.replace(/\/$/, ''), // remove trailing slash
        domain,
      })
    }
  })

  return companies
}

/**
 * Parse a BPG category page — same format but we only need
 * company name + domain (to match against existing company rows).
 */
export function parseBPGCategoryPage(html: string): { name: string; domain: string }[] {
  const $ = cheerio.load(html)
  const results: { name: string; domain: string }[] = []
  const seen = new Set<string>()

  $('a').each((_, el) => {
    const href = $(el).attr('href') || ''
    const name = $(el).text().trim()
    if (!href || !name || !href.startsWith('http')) return
    if (href.includes('biopharmguy.com')) return

    const domain = extractDomain(href)
    if (!domain || seen.has(domain)) return
    seen.add(domain)

    const skipDomains = [
      'linkedin.com', 'twitter.com', 'facebook.com', 'youtube.com',
      'google.com', 'wikipedia.org', 'constantcontact.com', 'ctctcdn.com'
    ]
    if (skipDomains.some(d => domain.includes(d))) return

    results.push({ name, domain })
  })

  return results
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/parse-bpg.ts
git commit -m "feat: add BioPharmGuy HTML parser with cheerio"
```

---

### Task 7: Create the main scraper script

**Files:**
- Create: `scripts/scrape-biopharmguy.ts`
- Create: `scripts/tsconfig.json` (for running scripts with tsx)

- [ ] **Step 1: Install tsx for running TypeScript scripts**

```bash
cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube
npm install -D tsx
```

- [ ] **Step 2: Create scripts/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "..",
    "baseUrl": "..",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["./**/*.ts", "../lib/**/*.ts"]
}
```

- [ ] **Step 3: Create scripts/scrape-biopharmguy.ts**

```typescript
import { createClient } from '@supabase/supabase-js'
import { COUNTRY_PAGES, CATEGORY_PAGES } from './scrape-config'
import { parseBPGPage, parseBPGCategoryPage, slugify, extractDomain } from './parse-bpg'
import type { Database } from '../lib/database.types'

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const LOGO_TOKEN = 'pk_FNHUWoZORpiR_7j_vzFnmQ'
const BATCH_SIZE = 100
const DELAY_MS = 2000 // be polite to BPG servers

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateLogoUrl(domain: string): string {
  return `https://img.logo.dev/${domain}?token=${LOGO_TOKEN}`
}

// --- Phase 1: Scrape country pages ---
async function scrapeCountryPages() {
  console.log('\n=== Phase 1: Scraping country pages ===\n')

  const allCompanies: {
    name: string; city: string; country: string;
    website: string; domain: string; sourceUrl: string
  }[] = []

  const globalSeen = new Set<string>() // dedupe by domain across all pages

  for (const page of COUNTRY_PAGES) {
    console.log(`Fetching: ${page.country} — ${page.url}`)

    // Log scrape start
    const { data: logEntry } = await supabase
      .from('scrape_log')
      .insert({
        source: 'biopharmguy',
        url: page.url,
        status: 'running',
        company_count: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    try {
      const response = await fetch(page.url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const html = await response.text()
      const parsed = parseBPGPage(html)

      let newCount = 0
      for (const company of parsed) {
        if (globalSeen.has(company.domain)) continue
        globalSeen.add(company.domain)
        newCount++

        allCompanies.push({
          name: company.name,
          city: company.city,
          country: page.country,
          website: company.website,
          domain: company.domain,
          sourceUrl: page.url,
        })
      }

      console.log(`  → Found ${parsed.length} companies, ${newCount} new (${globalSeen.size} total)`)

      // Update log
      if (logEntry) {
        await supabase
          .from('scrape_log')
          .update({
            status: 'done',
            company_count: newCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logEntry.id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ Failed: ${msg}`)

      if (logEntry) {
        await supabase
          .from('scrape_log')
          .update({
            status: 'failed',
            error_message: msg,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logEntry.id)
      }
    }

    await sleep(DELAY_MS) // rate limit
  }

  console.log(`\nTotal unique companies found: ${allCompanies.length}`)
  return allCompanies
}

// --- Phase 2: Insert into Supabase ---
async function insertCompanies(companies: {
  name: string; city: string; country: string;
  website: string; domain: string; sourceUrl: string
}[]) {
  console.log('\n=== Phase 2: Inserting into Supabase ===\n')

  // Process slugs — handle duplicates by appending city
  const slugCounts = new Map<string, number>()

  const rows = companies.map(c => {
    let slug = slugify(c.name)
    const count = slugCounts.get(slug) || 0
    if (count > 0) {
      slug = `${slug}-${slugify(c.city || c.country)}`
    }
    slugCounts.set(slug, count + 1)

    return {
      slug,
      name: c.name,
      country: c.country,
      city: c.city || null,
      website: c.website,
      domain: c.domain,
      categories: [] as string[],
      logo_url: generateLogoUrl(c.domain),
      source: 'biopharmguy',
      source_url: c.sourceUrl,
      is_estimated: false,
    }
  })

  // Batch insert with upsert (on conflict by slug, update name/website)
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('companies')
      .upsert(batch, { onConflict: 'slug' })

    if (error) {
      console.error(`  ✗ Batch ${i}-${i + batch.length} failed:`, error.message)
    } else {
      inserted += batch.length
      console.log(`  ✓ Inserted batch ${i}-${i + batch.length} (${inserted}/${rows.length})`)
    }
  }

  console.log(`\nInserted ${inserted} companies into Supabase`)
}

// --- Phase 3: Scrape category pages & tag companies ---
async function scrapeCategories() {
  console.log('\n=== Phase 3: Scraping category pages ===\n')

  for (const page of CATEGORY_PAGES) {
    console.log(`Fetching category: ${page.category}`)

    try {
      const response = await fetch(page.url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const html = await response.text()
      const parsed = parseBPGCategoryPage(html)

      // For each company in this category, update their categories array
      let matched = 0
      for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
        const batch = parsed.slice(i, i + BATCH_SIZE)
        const domains = batch.map(c => c.domain)

        // Find matching companies by domain
        const { data: existing } = await supabase
          .from('companies')
          .select('id, domain, categories')
          .in('domain', domains)

        if (existing) {
          for (const company of existing) {
            const cats = company.categories || []
            if (!cats.includes(page.category)) {
              cats.push(page.category)
              await supabase
                .from('companies')
                .update({ categories: cats })
                .eq('id', company.id)
              matched++
            }
          }
        }
      }

      console.log(`  → ${parsed.length} companies in category, ${matched} matched & tagged`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ Failed: ${msg}`)
    }

    await sleep(DELAY_MS)
  }
}

// --- Main ---
async function main() {
  console.log('BiotechTube — BioPharmGuy Scraper')
  console.log('==================================\n')

  // Phase 1: Scrape country pages
  const companies = await scrapeCountryPages()

  if (companies.length === 0) {
    console.error('No companies found. Check BPG page structure.')
    process.exit(1)
  }

  // Phase 2: Insert into database
  await insertCompanies(companies)

  // Phase 3: Tag with categories
  await scrapeCategories()

  console.log('\n==================================')
  console.log('Scraping complete!')

  // Print summary
  const { count } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  console.log(`Total companies in database: ${count}`)
}

main().catch(console.error)
```

- [ ] **Step 4: Add scrape script to package.json**

Add to package.json scripts:
```json
"scrape:bpg": "tsx scripts/scrape-biopharmguy.ts"
```

- [ ] **Step 5: Commit**

```bash
git add scripts/scrape-biopharmguy.ts scripts/tsconfig.json package.json
git commit -m "feat: add BioPharmGuy scraper script"
```

---

### Task 8: Run the scraper and verify data

- [ ] **Step 1: Load environment variables and run**

```bash
cd /Users/trondmariusbrilskattum/Desktop/Biotechtube/biotechtube
source .env.local 2>/dev/null || true
npx tsx scripts/scrape-biopharmguy.ts
```

Expected output: Progress logs showing countries being scraped, companies being inserted, categories being tagged. Should take 2-5 minutes.

- [ ] **Step 2: Verify data in Supabase**

Go to Supabase Dashboard > Table Editor > companies. Should see thousands of rows with name, country, city, website, domain, logo_url.

- [ ] **Step 3: Quick count check**

```bash
# Run a quick query script
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { count } = await sb.from('companies').select('*', { count: 'exact', head: true });
console.log('Total companies:', count);
const { data } = await sb.from('companies').select('country').then(r => r);
const byCty: Record<string,number> = {};
data?.forEach(r => { byCty[r.country] = (byCty[r.country]||0)+1; });
Object.entries(byCty).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log('  ' + c + ': ' + n));
"
```

- [ ] **Step 4: Commit any fixes if parser needed adjustment**

---

## Chunk 3: API Routes

### Task 9: Create companies API route (list with pagination, filters, search)

**Files:**
- Create: `app/api/companies/route.ts`

- [ ] **Step 1: Create app/api/companies/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const country = searchParams.get('country')
  const category = searchParams.get('category')
  const stage = searchParams.get('stage')
  const search = searchParams.get('q')
  const sort = searchParams.get('sort') || 'name' // name, trending, newest, funded

  const supabase = createServerClient()

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })

  // Filters
  if (country) {
    query = query.eq('country', country)
  }
  if (category) {
    query = query.contains('categories', [category])
  }
  if (stage) {
    query = query.eq('stage', stage)
  }

  // Full-text search
  if (search) {
    query = query.textSearch('fts', search, { type: 'websearch' })
  }

  // Sorting
  switch (sort) {
    case 'trending':
      query = query.order('trending_rank', { ascending: true, nullsFirst: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'funded':
      query = query.order('total_raised', { ascending: false, nullsFirst: false })
      break
    case 'name':
    default:
      query = query.order('name', { ascending: true })
      break
  }

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    companies: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p app/api/companies
git add app/api/companies/route.ts
git commit -m "feat: add companies API route with pagination, filters, search"
```

---

### Task 10: Create single company API route

**Files:**
- Create: `app/api/companies/[slug]/route.ts`

- [ ] **Step 1: Create app/api/companies/[slug]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Company not found' },
      { status: 404 }
    )
  }

  // Increment profile views (fire and forget)
  supabase
    .from('companies')
    .update({ profile_views: (data.profile_views || 0) + 1 })
    .eq('id', data.id)
    .then(() => {})

  return NextResponse.json(data)
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p app/api/companies/\[slug\]
git add "app/api/companies/[slug]/route.ts"
git commit -m "feat: add single company API route by slug"
```

---

### Task 11: Create search API route

**Files:**
- Create: `app/api/companies/search/route.ts`

- [ ] **Step 1: Create app/api/companies/search/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createServerClient()

  // Try full-text search first
  let { data } = await supabase
    .from('companies')
    .select('slug, name, country, city, categories, logo_url, stage, company_type')
    .textSearch('fts', q, { type: 'websearch' })
    .limit(10)

  // Fallback to ILIKE if FTS returns nothing (handles partial matches)
  if (!data || data.length === 0) {
    const { data: ilikeData } = await supabase
      .from('companies')
      .select('slug, name, country, city, categories, logo_url, stage, company_type')
      .ilike('name', `%${q}%`)
      .limit(10)

    data = ilikeData
  }

  return NextResponse.json({ results: data || [] })
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p app/api/companies/search
git add app/api/companies/search/route.ts
git commit -m "feat: add company search API with full-text and fallback"
```

---

### Task 12: Create stats API route

**Files:**
- Create: `app/api/stats/route.ts`

- [ ] **Step 1: Create app/api/stats/route.ts**

This powers the IndexCards on the homepage.

```typescript
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()

  // Get total company count
  const { count: totalCompanies } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  // Get count by country (top 10)
  const { data: countryCounts } = await supabase
    .rpc('get_country_counts')
    .limit(10)

  // Get count by category
  // (We'll use a simpler approach — just count non-null stages)
  const { count: withPipeline } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .not('stage', 'is', null)

  return NextResponse.json({
    totalCompanies: totalCompanies || 0,
    companiesWithPipeline: withPipeline || 0,
    countryCounts: countryCounts || [],
  })
}
```

- [ ] **Step 2: Create the RPC function in Supabase**

Add to `scripts/schema.sql` and run in Supabase SQL Editor:

```sql
-- Helper function: count companies by country
CREATE OR REPLACE FUNCTION get_country_counts()
RETURNS TABLE(country TEXT, count BIGINT)
LANGUAGE sql
AS $$
  SELECT country, COUNT(*) as count
  FROM companies
  GROUP BY country
  ORDER BY count DESC;
$$;
```

- [ ] **Step 3: Commit**

```bash
mkdir -p app/api/stats
git add app/api/stats/route.ts scripts/schema.sql
git commit -m "feat: add stats API route for homepage cards"
```

---

## Chunk 4: Frontend Migration

### Task 13: Create a data-fetching hook

**Files:**
- Create: `lib/hooks.ts`

- [ ] **Step 1: Create lib/hooks.ts**

```typescript
'use client'

import { useState, useEffect } from 'react'

interface CompaniesResponse {
  companies: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UseCompaniesOptions {
  page?: number
  limit?: number
  country?: string
  category?: string
  stage?: string
  sort?: string
  search?: string
}

export function useCompanies(options: UseCompaniesOptions = {}) {
  const [data, setData] = useState<CompaniesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (options.page) params.set('page', String(options.page))
    if (options.limit) params.set('limit', String(options.limit))
    if (options.country) params.set('country', options.country)
    if (options.category) params.set('category', options.category)
    if (options.stage) params.set('stage', options.stage)
    if (options.sort) params.set('sort', options.sort)
    if (options.search) params.set('q', options.search)

    setLoading(true)
    fetch(`/api/companies?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [
    options.page, options.limit, options.country,
    options.category, options.stage, options.sort, options.search
  ])

  return { data, loading, error }
}

export function useCompanySearch(query: string) {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()
    setLoading(true)

    fetch(`/api/companies/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => setResults(d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [query])

  return { results, loading }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks.ts
git commit -m "feat: add useCompanies and useCompanySearch hooks"
```

---

### Task 14: Create adapter to map DB rows to existing Company type

**Files:**
- Create: `lib/adapters.ts`

The existing frontend components expect the `Company` interface from `lib/types.ts`. The database rows have different field names (snake_case). This adapter converts between them so we don't need to rewrite every component.

- [ ] **Step 1: Create lib/adapters.ts**

```typescript
import type { Company } from './types'

/**
 * Convert a Supabase company row to the frontend Company interface.
 * This lets us swap from JSON to API without rewriting every component.
 */
export function dbRowToCompany(row: any): Company {
  return {
    slug: row.slug,
    name: row.name,
    country: row.country,
    city: row.city || '',
    founded: row.founded || 0,
    stage: row.stage || 'Pre-clinical',
    type: row.company_type || 'Private',
    ticker: row.ticker || undefined,
    focus: row.categories || [],
    employees: row.employee_range || '',
    totalRaised: row.total_raised || 0,
    valuation: row.valuation || undefined,
    isEstimated: row.is_estimated || false,
    description: row.description || '',
    website: row.domain || row.website || '',
    logoUrl: row.logo_url || undefined,
    trending: row.trending_rank || null,
    profileViews: row.profile_views || 0,
  }
}

/**
 * Convert an array of DB rows to Company[]
 */
export function dbRowsToCompanies(rows: any[]): Company[] {
  return rows.map(dbRowToCompany)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/adapters.ts
git commit -m "feat: add DB-to-Company adapter for frontend compatibility"
```

---

### Task 15: Update SearchOverlay to use live search API

**Files:**
- Modify: `components/SearchOverlay.tsx`

- [ ] **Step 1: Read current SearchOverlay.tsx**

Read the file to understand current implementation.

- [ ] **Step 2: Update SearchOverlay to use useCompanySearch hook**

Replace the static JSON-based filtering with the live API search hook. The key change is:

Before:
```typescript
import companiesData from '@/data/companies.json'
// ... filter companiesData based on query
```

After:
```typescript
import { useCompanySearch } from '@/lib/hooks'
import { dbRowToCompany } from '@/lib/adapters'

// Inside component:
const { results, loading } = useCompanySearch(query)
const companies = results.map(dbRowToCompany)
```

Keep the same UI/layout. Only change the data source.

- [ ] **Step 3: Verify search works**

```bash
npm run dev
```

Open http://localhost:3000, click search, type a company name. Should show results from the database.

- [ ] **Step 4: Commit**

```bash
git add components/SearchOverlay.tsx
git commit -m "feat: connect SearchOverlay to live search API"
```

---

### Task 16: Update HomePageClient to fetch from API

**Files:**
- Modify: `components/HomePageClient.tsx`

- [ ] **Step 1: Read current HomePageClient.tsx**

Read the file to understand how it currently imports and uses company data.

- [ ] **Step 2: Replace JSON import with API fetch**

The homepage currently does:
```typescript
import companiesData from '@/data/companies.json'
```

Replace with `useCompanies` hook. The component already has tabs (Top, Trending, Funded, New, Watchlist) that sort/filter — map the active tab to the `sort` parameter:

- Top → `sort=name`
- Trending → `sort=trending`
- Funded → `sort=funded`
- New → `sort=newest`

Add pagination state so users can load more than the first page.

Keep all existing tab UI, filter dropdowns, and country selector intact. Only change the data source.

- [ ] **Step 3: Verify homepage renders with real data**

```bash
npm run dev
```

Open http://localhost:3000. The ranking table should show companies from the database. Tabs should switch sorting. Country dropdown should filter.

- [ ] **Step 4: Commit**

```bash
git add components/HomePageClient.tsx
git commit -m "feat: connect homepage ranking to live companies API"
```

---

### Task 17: Update company profile page to fetch from API

**Files:**
- Modify: `app/company/[slug]/CompanyPageClient.tsx`
- Modify: `app/company/[slug]/page.tsx`

- [ ] **Step 1: Read current page.tsx and CompanyPageClient.tsx**

Understand how they currently load company data from JSON.

- [ ] **Step 2: Update page.tsx to fetch from API**

The page.tsx (server component) should fetch company data from the API route:

```typescript
async function getCompany(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : 'http://localhost:3000'}/api/companies/${slug}`,
    { next: { revalidate: 60 } } // cache for 60 seconds
  )
  if (!res.ok) return null
  return res.json()
}
```

Or directly query Supabase in the server component (better for SSR):

```typescript
import { createServerClient } from '@/lib/supabase'
import { dbRowToCompany } from '@/lib/adapters'

async function getCompany(slug: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .single()
  return data ? dbRowToCompany(data) : null
}
```

- [ ] **Step 3: Verify company pages work**

Navigate to http://localhost:3000/company/oncoinvent — should show company data from the database.

- [ ] **Step 4: Commit**

```bash
git add app/company/\[slug\]/page.tsx app/company/\[slug\]/CompanyPageClient.tsx
git commit -m "feat: connect company profile page to database"
```

---

### Task 18: Update CompaniesPageClient (directory) to use API

**Files:**
- Modify: `app/companies/CompaniesPageClient.tsx`

- [ ] **Step 1: Read current CompaniesPageClient.tsx**

- [ ] **Step 2: Replace JSON imports with API calls**

The directory page shows categories, regions, and search. Connect:
- Search bar → `/api/companies/search?q=...`
- Category links → `/companies?category=Biologics` (or client-side filter via API)
- Country links still go to `/companies/[country]` pages

- [ ] **Step 3: Verify directory page works**

- [ ] **Step 4: Commit**

```bash
git add app/companies/CompaniesPageClient.tsx
git commit -m "feat: connect companies directory to live API"
```

---

### Task 19: Update CountryPageClient to use API

**Files:**
- Modify: `app/companies/[country]/CountryPageClient.tsx`

- [ ] **Step 1: Read current CountryPageClient.tsx**

- [ ] **Step 2: Replace JSON import with API fetch**

Use `useCompanies({ country: countryName, sort: activeSort })` to load companies filtered by country.

- [ ] **Step 3: Verify country pages work**

Navigate to http://localhost:3000/companies/norway — should show all Norwegian companies from the database.

- [ ] **Step 4: Commit**

```bash
git add app/companies/\[country\]/CountryPageClient.tsx
git commit -m "feat: connect country pages to live API"
```

---

### Task 20: Update IndexCards to show real stats

**Files:**
- Modify: `components/IndexCards.tsx`

- [ ] **Step 1: Read current IndexCards.tsx**

- [ ] **Step 2: Fetch real stats from /api/stats**

Replace hardcoded numbers with live data from the stats API. The "Companies Tracked" card should show the real count from the database.

- [ ] **Step 3: Commit**

```bash
git add components/IndexCards.tsx
git commit -m "feat: connect homepage stats cards to live data"
```

---

### Task 21: Build, test, and deploy

- [ ] **Step 1: Add Supabase env vars to Vercel**

```bash
# In Vercel dashboard or via CLI:
# Settings > Environment Variables
# Add: NEXT_PUBLIC_SUPABASE_URL
# Add: NEXT_PUBLIC_SUPABASE_ANON_KEY
# Add: SUPABASE_SERVICE_ROLE_KEY
```

- [ ] **Step 2: Run build locally**

```bash
npm run build
```

Fix any TypeScript or build errors.

- [ ] **Step 3: Test locally**

```bash
npm run dev
```

Verify:
- Homepage shows companies from database
- Search returns live results
- Company pages load from database
- Country pages show filtered companies
- Stats cards show real numbers

- [ ] **Step 4: Commit all remaining changes and push**

```bash
git add -A
git commit -m "feat: complete database integration — live data from Supabase"
git push origin main
```

- [ ] **Step 5: Verify deployment**

Check https://biotechtube.vercel.app — should show thousands of real biotech companies instead of 8 hardcoded ones.
