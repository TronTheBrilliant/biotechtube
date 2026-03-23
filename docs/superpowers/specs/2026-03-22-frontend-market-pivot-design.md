# Frontend Market Pivot — Design Spec

## Goal

Transform BiotechTube from a "biotech intelligence" directory into a **biotech financial market tracker** (CoinMarketCap/Yahoo Finance for biotech). The database foundation is complete — 10,517 daily market snapshots, 175K sector rows, 195K country rows, 2.3M price history rows across 861 tickers, 20 sectors with 13.5K company-sector mappings. Now the frontend needs to surface this data.

## Phases

This is a multi-phase project. Each phase is independently shippable.

### Phase 1: Markets Page — Real Data (highest impact)

Replace the current markets page (100% hardcoded demo data) with real data from the database.

**What changes:**
- The markets page becomes a server component that fetches from `market_snapshots`, `sector_market_data`, and `country_market_data`
- The main index chart shows real historical total market cap from `market_snapshots`
- Stats strip shows real values: total market cap, 1d/7d/30d change, company count, total volume
- Sector performance table replaces the fake "quarterly funding" chart — shows all 20 sectors with market cap, change percentages, company counts
- Country performance table replaces the fake "clinical trials" chart — shows top countries by market cap
- Top movers section (gainers/losers) from market snapshot data
- Keep timescale selector (1Y, 3Y, 5Y, 10Y, Max) but fetch real chart data

**API routes needed:**
- `GET /api/market/snapshot` — latest market snapshot + recent history for chart
- `GET /api/market/sectors` — latest sector_market_data for all sectors
- `GET /api/market/countries` — latest country_market_data for top countries

**Data flow:**
- Server component fetches latest snapshot + sector/country data at render time
- Client component handles timescale switching (fetches historical data on change)
- All monetary values formatted with proper $B/$M/$K abbreviations

### Phase 2: Homepage Pivot

Transform the homepage hero and index cards to lead with market data.

**What changes:**
- Hero text changes from "Global Biotech Intelligence" to market-first messaging (e.g., "Global Biotech Markets" or "The Biotech Market Tracker")
- Feature pills update to reflect market data focus
- IndexCards component (currently commented out) becomes live with real data:
  - Global Biotech Market Cap (from latest market_snapshot)
  - 24h Volume
  - Companies Tracked (public count)
  - Best Performer (top gainer)
- Each card links to /markets
- RankingTable "Top" mode sorts by market cap with real-time price data (already works)

**Data flow:**
- Homepage server component fetches latest market_snapshot alongside companies
- Passes snapshot data to IndexCards as props
- No new API routes needed — just server-side Supabase queries

### Phase 3: Sector Pages

Create individual sector pages at `/sectors` and `/sectors/[slug]`.

**What changes:**
- `/sectors` — overview page showing all 20 sectors as cards with market cap, change %, company count, sparkline chart
- `/sectors/[slug]` — individual sector page showing:
  - Sector hero with name, description, key stats
  - Historical market cap chart (from sector_market_data)
  - Member companies ranked by market cap (from company_sectors + companies)
  - Sector comparison vs global index

**API routes needed:**
- `GET /api/market/sectors/[slug]` — sector detail + historical data
- Or: server component fetches directly from Supabase (preferred)

**Data:**
- sectors table (20 rows, already has name, slug, description, company_count, public_company_count)
- sector_market_data (175K rows, has combined_market_cap, change_1d/7d/30d_pct per date)
- company_sectors (13.5K mappings with is_primary, confidence)

### Phase 4: Company Stock Charts

Add stock price charts to individual company pages using company_price_history.

**What changes:**
- Company detail page gets a new "Stock" tab (or inline chart on Overview tab)
- Historical price chart with timescale selector (1M, 3M, 6M, 1Y, 5Y, All)
- Key stats: market cap, 52-week high/low, volume, daily change
- Sector badge(s) shown on company card (from company_sectors)

**API routes needed:**
- `GET /api/market/company/[id]/history` — price history for chart
- Or: server component fetches directly

**Data:**
- company_price_history (2.3M rows — company_id, date, open, high, low, close, adj_close, volume, market_cap_usd, change_pct)
- company_sectors for sector badges

### Phase 5: Enhanced Navigation

Update navigation to reflect the market-first positioning.

**What changes:**
- "Markets" becomes a top-level nav item (not buried under "Data")
- Add "Sectors" to nav
- Markets mega-menu shows: Global Overview, Sector Performance, Top Movers, Country Breakdown
- Ticker bar (already exists) could show real market data instead of static tickers

## Architecture Decisions

**Server vs Client components:**
- All data fetching happens in server components (Next.js App Router)
- Client components handle interactivity (timescale switching, filters, chart interactions)
- Pattern: `page.tsx` (server) fetches data → `PageClient.tsx` (client) renders with interactivity

**API routes vs direct Supabase queries:**
- Server components query Supabase directly (no API route overhead)
- API routes only needed for client-side dynamic fetching (e.g., changing timescale on charts)
- Keep API routes minimal — most data can be server-rendered

**Chart library:**
- Continue using Recharts (already in project, well-integrated)
- AreaChart for price/market cap history
- BarChart for volume
- Consistent styling with existing charts

**Number formatting:**
- Market cap: $12.9T, $842B, $1.2M
- Volume: 2.5B, 142M, 8.3K
- Percentages: +3.21%, -0.54%
- Use consistent formatting utility across all pages

## Non-Goals (for now)

- Real-time WebSocket price updates (daily data is fine)
- User portfolios/watchlists with real P&L tracking
- Options/derivatives data
- News sentiment analysis
- Mobile app
- Dark mode toggle (already has theme support)

## Success Criteria

1. Markets page shows real data — no hardcoded values
2. Homepage leads with market data positioning
3. All 20 sectors have browsable pages with charts
4. Company pages show historical stock charts
5. `npx tsc --noEmit` passes
6. `npm run build` succeeds
7. All pages render at 375px mobile without overflow
