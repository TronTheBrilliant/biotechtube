-- ============================================
-- BiotechTube Pivot Schema
-- Adds financial market tracker tables
-- ============================================

-- 1. Alter existing companies table
ALTER TABLE companies ALTER COLUMN valuation TYPE NUMERIC USING valuation::NUMERIC;
ALTER TABLE companies ALTER COLUMN total_raised TYPE NUMERIC USING total_raised::NUMERIC;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS shares_outstanding BIGINT;

-- 1b. Ensure sectors table has needed columns (may already exist)
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS company_count INT DEFAULT 0;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS public_company_count INT DEFAULT 0;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS combined_market_cap NUMERIC DEFAULT 0;

-- 2. company_sectors (many-to-many)
CREATE TABLE IF NOT EXISTS company_sectors (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, sector_id)
);

CREATE INDEX IF NOT EXISTS idx_company_sectors_sector ON company_sectors(sector_id);
CREATE INDEX IF NOT EXISTS idx_company_sectors_company ON company_sectors(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_sectors_primary
  ON company_sectors (company_id) WHERE is_primary = true;

-- 3. company_price_history (daily OHLCV)
CREATE TABLE IF NOT EXISTS company_price_history (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ticker TEXT NOT NULL,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  close NUMERIC,
  adj_close NUMERIC NOT NULL,
  volume BIGINT,
  currency TEXT NOT NULL DEFAULT 'USD',
  market_cap_usd NUMERIC,
  change_pct NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_company_date
  ON company_price_history(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_date
  ON company_price_history(date);
CREATE INDEX IF NOT EXISTS idx_price_history_gainers
  ON company_price_history(date DESC, change_pct DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_price_history_losers
  ON company_price_history(date DESC, change_pct ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_price_history_ticker
  ON company_price_history(ticker);

-- 4. market_snapshots (daily global index)
CREATE TABLE IF NOT EXISTS market_snapshots (
  date DATE PRIMARY KEY,
  total_market_cap NUMERIC NOT NULL,
  public_company_count INT NOT NULL,
  total_volume NUMERIC,
  change_1d_pct NUMERIC,
  change_7d_pct NUMERIC,
  change_30d_pct NUMERIC,
  change_ytd_pct NUMERIC,
  top_gainer_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  top_gainer_pct NUMERIC,
  top_loser_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  top_loser_pct NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_date
  ON market_snapshots(date DESC);

-- 5. sector_market_data (daily per-sector)
CREATE TABLE IF NOT EXISTS sector_market_data (
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  combined_market_cap NUMERIC NOT NULL,
  company_count INT NOT NULL,
  public_company_count INT NOT NULL,
  total_volume NUMERIC,
  change_1d_pct NUMERIC,
  change_7d_pct NUMERIC,
  change_30d_pct NUMERIC,
  top_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sector_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sector_market_data_sector_date
  ON sector_market_data(sector_id, date DESC);

-- 6. country_market_data (daily per-country)
CREATE TABLE IF NOT EXISTS country_market_data (
  country TEXT NOT NULL,
  date DATE NOT NULL,
  combined_market_cap NUMERIC NOT NULL,
  company_count INT NOT NULL,
  public_company_count INT NOT NULL,
  total_volume NUMERIC,
  change_1d_pct NUMERIC,
  change_7d_pct NUMERIC,
  change_30d_pct NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (country, date)
);

CREATE INDEX IF NOT EXISTS idx_country_market_data_country_date
  ON country_market_data(country, date DESC);

-- 7. RLS policies
ALTER TABLE company_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_sectors_public_read" ON company_sectors FOR SELECT USING (true);
CREATE POLICY "company_sectors_service_manage" ON company_sectors FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "price_history_public_read" ON company_price_history FOR SELECT USING (true);
CREATE POLICY "price_history_service_manage" ON company_price_history FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "market_snapshots_public_read" ON market_snapshots FOR SELECT USING (true);
CREATE POLICY "market_snapshots_service_manage" ON market_snapshots FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "sector_market_data_public_read" ON sector_market_data FOR SELECT USING (true);
CREATE POLICY "sector_market_data_service_manage" ON sector_market_data FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "country_market_data_public_read" ON country_market_data FOR SELECT USING (true);
CREATE POLICY "country_market_data_service_manage" ON country_market_data FOR ALL USING (auth.role() = 'service_role');

-- 8. updated_at triggers (reuse existing function from schema.sql)
DROP TRIGGER IF EXISTS company_sectors_updated_at ON company_sectors;
CREATE TRIGGER company_sectors_updated_at
  BEFORE UPDATE ON company_sectors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS price_history_updated_at ON company_price_history;
CREATE TRIGGER price_history_updated_at
  BEFORE UPDATE ON company_price_history FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS market_snapshots_updated_at ON market_snapshots;
CREATE TRIGGER market_snapshots_updated_at
  BEFORE UPDATE ON market_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS sector_market_data_updated_at ON sector_market_data;
CREATE TRIGGER sector_market_data_updated_at
  BEFORE UPDATE ON sector_market_data FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS country_market_data_updated_at ON country_market_data;
CREATE TRIGGER country_market_data_updated_at
  BEFORE UPDATE ON country_market_data FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. Helper function for distinct dates (used by backfill-aggregations)
CREATE OR REPLACE FUNCTION get_distinct_price_dates()
RETURNS TABLE(d DATE) LANGUAGE sql AS $$
  SELECT DISTINCT date AS d FROM company_price_history ORDER BY d;
$$;
