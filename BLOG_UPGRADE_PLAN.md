# Blog 100x Upgrade Plan

## Phase 1: Article Template Redesign (Agent 1)
File: `app/blog/[slug]/page.tsx`

### 1.1 Hero Section
- Gradient background based on article category (green for market-analysis, blue for sector-reports, etc.)
- Article title large and bold
- Author, date, reading time, category badge
- Share buttons (Twitter, LinkedIn, Copy link)

### 1.2 Reading Progress Bar
- Thin green bar at very top of viewport (position: fixed)
- Width = scroll percentage
- Smooth animation

### 1.3 Sticky Table of Contents
- Parse h2/h3 headings from content
- Sidebar on desktop (sticky, follows scroll)
- Highlights current section as user scrolls
- On mobile: collapsible TOC at top of article

### 1.4 Article Body Styling
- Improve the `.prose` CSS for better typography
- Pull quotes: `> blockquote` styled as large italic text with accent bar
- Data tables: zebra striping, hover rows, proper borders
- Code blocks: syntax highlighting if any
- Images: full-width with captions

### 1.5 Newsletter CTA
- Inline after ~40% of article: "Enjoying this analysis? Get weekly biotech insights."
- Email input + subscribe button
- Stores in a `newsletter_subscribers` table

### 1.6 Related Articles
- Query 3 articles with matching category or tags
- Show at bottom with title, excerpt, date

### 1.7 Estimated Reading Time
- Calculate from word count (avg 200 words/min)
- Display in header

---

## Phase 2: Company Hover Cards (Agent 2)
Files: New component + blog article renderer

### 2.1 CompanyMention Component
- When article content contains `[Company Name](/company/slug)` links
- On hover: show a floating card with:
  - Company logo (24px)
  - Name + ticker
  - Market cap
  - 1D price change (green/red)
  - "View profile →" link
- On mobile: tap shows the card, tap again follows link
- Card has subtle shadow, rounded corners, appears below/above the link

### 2.2 Data Fetching
- Server component fetches all company slugs mentioned in the article
- Batch query to get their current data (name, ticker, market_cap, logo, change_pct)
- Pass as props to the client component

### 2.3 Article Content Renderer
- Parse the markdown HTML for company links
- Replace with `<CompanyMention>` components
- Handle edge cases (links in headings, links in tables)

---

## Phase 3: Embedded Charts (Agent 3)
Files: New component + article content parser

### 3.1 Chart Embed Syntax
- In article markdown, support a special syntax:
  `[chart:market-index]` → renders the biotech market index chart
  `[chart:company:eli-lilly]` → renders Eli Lilly's stock chart
  `[chart:sector:small-molecules]` → renders sector chart
  `[chart:funding]` → renders funding season chart

### 3.2 ChartEmbed Component
- Reuses existing TvAreaChart component
- Fetches data for the specific chart type
- Responsive, works inline in article
- Height: 300px, full article width

### 3.3 Content Parser
- Scan rendered HTML for `[chart:...]` patterns
- Replace with actual chart components
- Handle SSR (charts are client-side only, need dynamic import)

---

## Phase 4: Share Buttons + Social (included in Phase 1)
- Twitter: pre-filled tweet with article title + URL
- LinkedIn: share URL
- Copy link: copies URL to clipboard with feedback
- Position: in hero area + floating sidebar on desktop

---

## Execution Order:
1. Agent 1: Article template redesign (hero, progress bar, TOC, newsletter, related, share buttons)
2. Agent 2: Company hover cards
3. Agent 3: Embedded charts in articles

All three can run in parallel — they touch different files.
