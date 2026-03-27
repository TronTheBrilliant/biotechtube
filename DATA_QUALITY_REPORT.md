# BiotechTube Data Quality Audit Report

**Date:** 2026-03-27
**Auditor:** Automated audit
**Supabase Project:** niblhjhtkqazfegktnok

---

## 1. Total Market Cap

**Result: PASS**

| Metric | Value |
|--------|-------|
| Latest snapshot date | 2026-03-24 |
| Total market cap | $7.45T |
| Companies tracked | 954 public companies |
| 1-day change | +0.12% |
| 7-day change | -4.14% |
| 30-day change | -8.27% |
| YTD change | -3.54% |

The $7.45T total is within the expected $5T-$10T range for global biotech. The NASDAQ Biotechnology Index alone tracks ~$4T in US biotech; adding global companies makes $7.5T plausible.

---

## 2. Top 10 Company Market Caps

**Result: PASS (with notes)**

| Rank | Company | Ticker | Market Cap (USD) | Price | Currency |
|------|---------|--------|-----------------|-------|----------|
| 1 | Eli Lilly | LLY | $810.6B | $916.31 | USD |
| 2 | Johnson & Johnson | JNJ | $580.1B | $239.93 | USD |
| 3 | AbbVie | ABBV | $369.7B | $207.18 | USD |
| 4 | Roche | ROG.SW | $323.4B | CHF 312 | CHF |
| 5 | Merck | MRK | $296.4B | $119.37 | USD |
| 6 | Novartis | NVS | $291.7B | $150.75 | USD |
| 7 | AstraZeneca | AZN | $288.1B | $187.14 | USD |
| 8 | Amgen | AMGN | $191.2B | $353.93 | USD |
| 9 | Abbott | ABT | $183.7B | $104.83 | USD |
| 10 | Thermo Fisher | TMO | $183.3B | $490.77 | USD |

**Novo Nordisk note:** NVO at $167B (rank 13) appears low vs. the $400-600B expectation. However, cross-referencing with multiple financial sources (companiesmarketcap.com, stockanalysis.com, Yahoo Finance) confirms Novo Nordisk's market cap has genuinely dropped ~57% from its peak due to GLP-1 pricing headwinds and competition. The $162-167B figure is correct for March 2026.

**Sanofi note:** SNY at $114B was also verified against external sources and confirmed correct for March 2026.

All top 10 values are within expected ranges. No company is >2x off from expected values.

---

## 3. Sector Totals

**Result: PASS**

| Sector | Combined Market Cap |
|--------|-------------------|
| Small Molecule Drugs | $4.49T |
| Biologics / Biosimilars | $4.36T |
| Digital Health & Biotech SaaS | $1.45T |
| Cell & Gene Therapy | $1.45T |
| Diagnostics & Precision Medicine | $1.09T |
| AI / Machine Learning | $1.07T |
| RNA Therapeutics (non-mRNA) | $922B |
| Drug Delivery & Formulation | $822B |
| Rare & Orphan Diseases | $340B |
| mRNA Therapeutics | $311B |

**Sum of all sectors:** $17.5T (vs $7.5T total market cap)

The 2.3x overlap ratio is expected and acceptable. Companies belong to multiple sectors (e.g., Eli Lilly appears in both "Small Molecule Drugs" and "Biologics"). No single sector exceeds the total market cap ($7.5T), which would indicate a data error.

---

## 4. Country Totals

**Result: PASS**

| Country | Combined Market Cap |
|---------|-------------------|
| United States | $4.83T |
| Switzerland | $778B |
| United Kingdom | $475B |
| Ireland | $432B |
| Japan | $309B |
| China | $272B |
| Denmark | $263B |
| India | $191B |
| France | $162B |
| South Korea | $95B |

US at $4.83T is within expected $4-5T range. Switzerland at $778B is within $500B-$1T range. UK at $475B is within $300-600B range. All values are reasonable.

---

## 5. Trending Data

**Result: ISSUE FOUND AND FIXED**

### Issue: Penny-stock noise in market_snapshots top_gainer/top_loser

The `top_gainer` and `top_loser` fields in `market_snapshots` were populated from ALL companies regardless of market cap. This caused sub-$1M companies with extreme volatility to appear as the daily top movers:

- VAXX (Vaxxinity, ~$11K market cap): 9900% gain
- EGRX (Eagle Pharmaceuticals, ~$2M market cap): 750% gain
- VRPX (Virpax Pharmaceuticals, $124 market cap): 3600% gain then -99.1% loss
- NAVBQ (Navidea Biopharmaceuticals, $100 market cap): 4900% gain

These are penny stocks trading at fractions of a cent with negligible volume.

### Fix Applied

1. **Code fix:** Added `$100M minimum market cap` filter to top gainer/loser selection in three files:
   - `app/api/cron/update-aggregations/route.ts` (cron job)
   - `scripts/daily-update.ts` (manual script)
   - `scripts/backfill-aggregations.ts` (backfill script)

2. **Data fix:** Ran SQL UPDATE on all historical `market_snapshots` rows to recalculate `top_gainer_id/pct` and `top_loser_id/pct` using the $100M floor.

3. **Verification:** After fix, the 3/24 snapshot correctly shows:
   - Top gainer: Sol-Gel Technologies (SLGL) +20.86% ($225M market cap)
   - Top loser: Achieve Life Sciences (ACHV) -28.40% ($154M market cap)

Note: The trending page (`/trending`) already had a `MIN_MARKET_CAP = $100M` filter and was NOT affected by this issue.

---

## 6. Micro-cap data artifacts

**Status: Informational -- no fix needed**

There are 17 companies with market cap under $1M on the latest trading day, including 2 under $1K. These are legitimate (delisted, near-bankrupt companies) and do not affect aggregations or user-facing data. They are filtered out by the trending page and now by the snapshot movers.

---

## Summary

| Check | Status | Action |
|-------|--------|--------|
| Total market cap ($7.45T) | PASS | None |
| Top company market caps | PASS | None (NVO confirmed correct at $167B) |
| Sector totals | PASS | Overlap ratio 2.3x is expected |
| Country totals | PASS | US $4.83T, CH $778B, UK $475B all reasonable |
| Trending / top movers | FIXED | Added $100M floor, backfilled historical data |
| Data pipeline integrity | PASS | Sub-unit currencies (GBp/ZAc) handled correctly |
