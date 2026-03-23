# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sidebar navigation with a top bar + mega-menu navigation, fix mobile nav, add pricing page.

**Architecture:** Single Nav component rewrite (top bar with hover mega-menus on desktop, accordion overlay on mobile). CSS cleanup to remove sidebar layout. New pricing page. No structural changes to existing pages — they already import `<Nav />`.

**Tech Stack:** Next.js 14, React, Tailwind CSS, lucide-react, CSS custom properties for theming.

**Spec:** `docs/superpowers/specs/2026-03-22-navigation-redesign-design.md`

---

## Chunk 1: CSS + Layout cleanup, Nav rewrite, Pricing page

### Task 1: Clean up sidebar CSS and layout script

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace sidebar CSS with top-nav CSS in globals.css**

Replace lines 82-115 (everything from `/* Sidebar layout offset */` to end of file) with:

```css
/* Top nav layout offset */
.page-content {
  padding-top: 56px;
}

@media (max-width: 767px) {
  .page-content {
    padding-top: 48px;
  }
}
```

- [ ] **Step 2: Remove sidebar localStorage script from layout.tsx**

In `app/layout.tsx`, remove the entire `<head>` block (lines 53-58):

```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `try{var s=localStorage.getItem("btb-sidebar");document.documentElement.setAttribute("data-sidebar",s==="closed"?"closed":"open")}catch(e){}`,
    }}
  />
</head>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (Nav.tsx will have unused import warnings but won't error since we haven't changed it yet)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "refactor: remove sidebar CSS and layout script, add top-nav offset"
```

---

### Task 2: Rewrite Nav.tsx — Top bar + mega-menus + mobile accordion

**Files:**
- Rewrite: `components/Nav.tsx`

- [ ] **Step 1: Write the complete Nav.tsx**

Full rewrite of `components/Nav.tsx`. The component must:

**Data structures:**
- Define menu categories: Data, Discover, News, Company
- Each category has: label, items (with href, emoji, title, subtitle), and optionally featured items (for the right sidebar panel)
- Data items: Companies, Pipeline, Funding, Markets. Featured: top countries.
- Discover items: Therapeutic Areas, Drugs, People, Investors. Featured: popular areas.
- News items: Latest News, Events. No featured.
- Company items: About, Pricing. No featured.

**Desktop (md+ / 768px+):**
- Sticky top bar, 56px, `z-index: 50`, bg `var(--color-bg-primary)`, bottom border `var(--color-border-subtle)`
- Left: Logo (Next.js Image + "BiotechTube" text link to /)
- Center-left: 4 trigger buttons (Data, Discover, News, Company)
- Right: Search pill (opens SearchOverlay), "Pricing" link, "Sign in" green button
- Hover on trigger → open mega-menu panel after 200ms delay
- Mouse leave → close after 150ms grace
- Rich panels (Data, Discover): full-width dropdown with 2-column grid of items (left) + featured sidebar (right, `var(--color-bg-secondary)` bg). Each item has colored icon box (32x32, rounded-lg) + title + subtitle.
- Small popovers (News, Company): ~200px dropdown positioned below trigger, simple list with emoji + label
- Panel: `z-index: 40`, `box-shadow: 0 8px 24px rgba(0,0,0,0.08)`, fade in 150ms
- Keyboard: Enter/Space on trigger toggles panel, Tab navigates within panel, Escape closes
- Close on route change (`usePathname`)

**Mobile (<768px):**
- Sticky top bar, 48px, logo left, search icon + hamburger right
- Hamburger opens full-screen overlay (`position: fixed; inset: 0; z-index: 50`)
- Body scroll lock: add `overflow: hidden` to `document.body` when open, remove on close
- Overlay content area (below header) gets `overflow-y: auto` so it scrolls if content exceeds viewport
- Overlay content: header (logo + X), search bar, accordion sections (Data/Discover/News/Company), plain links (About/Pricing), Sign in CTA
- Accordion: tap to toggle, only one open at a time, chevron rotates
- Close on: X button, link click, Escape key, route change

**Imports needed:** useState, useEffect, useCallback, useRef, usePathname, Link, Image, SearchOverlay, lucide-react icons (Search, Menu, X, ChevronDown, LogIn)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean (no errors)

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds, no lint errors (no unused imports)

- [ ] **Step 4: Commit**

```bash
git add components/Nav.tsx
git commit -m "feat: rewrite nav — top bar with mega-menus, mobile accordion"
```

---

### Task 3: Create Pricing page

**Files:**
- Create: `app/pricing/page.tsx`
- Modify: `app/sitemap.ts` (add /pricing to static pages)

- [ ] **Step 1: Create the pricing page**

Create `app/pricing/page.tsx` with:
- Import Nav, Footer, Link, Metadata, Check icon from lucide-react
- Export metadata with title "Pricing — BiotechTube" and description
- Page structure: `page-content` wrapper → Nav → main content → Footer
- Hero section: "Simple, transparent pricing" h1, subtitle
- 3-tier card layout (horizontal on desktop via grid-cols-3, stacked on mobile):
  - Free (Explorer): basic features, "Get started" → /signup
  - Pro ($49/mo): highlighted with accent border, full features, "Get started" → /signup
  - Enterprise (Custom): premium features, "Contact us" → mailto:hello@biotechtube.com
- Each card: rounded-lg, border, list of features with Check icons
- "For Companies" section below: 2 side-by-side cards
  - Claim profile (Free): description + CTA → /claim (existing claim flow)
  - Promoted listing ($299/mo): description + CTA → mailto
- Use CSS variables for all colors (dark mode compatible)
- Style matches about page patterns (text sizes, spacing, card styling)

- [ ] **Step 2: Add /pricing to sitemap**

In `app/sitemap.ts`, add to the staticPages array:
```typescript
{ url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
```

- [ ] **Step 3: Verify TypeScript and build**

Run: `npx tsc --noEmit && npm run build 2>&1 | tail -5`
Expected: Clean compile and successful build

- [ ] **Step 4: Commit**

```bash
git add app/pricing/page.tsx app/sitemap.ts
git commit -m "feat: add pricing page with three tiers and company offerings"
```

---

### Task 4: Deploy and verify

- [ ] **Step 1: Deploy to Vercel**

Run: `npx vercel --prod`
Expected: Successful deployment

- [ ] **Step 2: Verify on production**

Check these URLs work:
- Homepage: top nav visible, no sidebar
- /pricing: pricing page renders with cards
- /companies: nav works, content not hidden behind header
- /therapeutic-areas: nav visible
- Mobile: hamburger opens accordion overlay, sections expand/collapse properly

- [ ] **Step 3: Final commit if any fixes needed**
