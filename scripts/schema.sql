-- ============================================
-- BiotechTube Database Schema
-- Run this in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
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
  stage TEXT,
  company_type TEXT,
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

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON companies;
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

-- Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_log ENABLE ROW LEVEL SECURITY;

-- Anyone can read companies (public data)
CREATE POLICY "Companies are publicly readable"
  ON companies FOR SELECT
  USING (true);

-- Only service role can insert/update/delete companies
CREATE POLICY "Service role can manage companies"
  ON companies FOR ALL
  USING (auth.role() = 'service_role');

-- Anyone can read scrape log
CREATE POLICY "Scrape log is publicly readable"
  ON scrape_log FOR SELECT
  USING (true);

-- Only service role can manage scrape log
CREATE POLICY "Service role can manage scrape_log"
  ON scrape_log FOR ALL
  USING (auth.role() = 'service_role');

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
