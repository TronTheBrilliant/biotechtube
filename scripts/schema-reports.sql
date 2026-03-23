-- ============================================
-- BiotechTube — Company Reports Table
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS company_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,

  -- Structured data extracted from report
  summary TEXT,                          -- 2-3 paragraph overview
  deep_report TEXT,                      -- Full AI analysis (markdown)

  -- Company details
  founded INTEGER,
  headquarters_city TEXT,
  headquarters_country TEXT,
  employee_estimate TEXT,                -- "10-50", "50-100", "500-1000"
  business_model TEXT,                   -- "Clinical-stage biopharma", "CDMO", "Diagnostics"
  revenue_status TEXT,                   -- "Pre-revenue", "Revenue-generating", "Profitable"

  -- Classification
  stage TEXT,                            -- Most advanced pipeline stage
  company_type TEXT,                     -- Public / Private
  ticker TEXT,
  exchange TEXT,                         -- "NASDAQ", "Oslo Børs", "LSE"

  -- Science & Pipeline
  therapeutic_areas TEXT[],              -- ["Oncology", "Radiopharmaceuticals"]
  technology_platform TEXT,              -- Core tech description
  pipeline_programs JSONB,              -- [{name, indication, phase, status}]

  -- People & Contact
  key_people JSONB,                      -- [{name, role, email}]
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,

  -- Financial
  funding_mentions TEXT[],               -- Raw funding mentions from website
  total_raised_estimate BIGINT,          -- Estimated total raised in USD
  investors TEXT[],                       -- Known investors

  -- Partnerships & IP
  partners TEXT[],                        -- Partner/collaborator names

  -- Analysis
  opportunities TEXT,                    -- Opportunity analysis (markdown)
  risks TEXT,                            -- Risk factors (markdown)
  competitive_landscape TEXT,            -- Competitive analysis

  -- Source tracking
  pages_scraped TEXT[],                  -- URLs that were scraped
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_company_report UNIQUE(company_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_slug ON company_reports(slug);
CREATE INDEX IF NOT EXISTS idx_reports_company ON company_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_stage ON company_reports(stage);
CREATE INDEX IF NOT EXISTS idx_reports_areas ON company_reports USING GIN(therapeutic_areas);

-- RLS
ALTER TABLE company_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports are publicly readable"
  ON company_reports FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage reports"
  ON company_reports FOR ALL
  USING (auth.role() = 'service_role');
