# Dashboard Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing content monitoring homepage into a more mature, unified operations dashboard without changing feature logic.

**Architecture:** Keep the current data flow and interaction logic intact inside `app/page.tsx`, but rebuild the system-overview layout and the shared visual language around a clearer SaaS dashboard hierarchy. Centralize the redesign in `app/globals.css` using a stricter token system for surfaces, typography, buttons, cards, badges, and light/dark theme parity.

**Tech Stack:** Next.js App Router, React, TypeScript, global CSS

---

### Task 1: Redesign the system overview information architecture

**Files:**
- Modify: `app/page.tsx`
- Test: manual browser verification on `/`

- [ ] **Step 1: Refactor the overview JSX into the new hierarchy**

Create a top header area, compact metric cards, a dual-column status/insights section, uniform category cards, and a trend-plus-ranking section while preserving existing data sources.

- [ ] **Step 2: Keep all overview calculations stable**

Retain the current computed totals, rankings, platform summaries, and category entry actions so the redesign changes structure and emphasis only, not behavior.

- [ ] **Step 3: Add simple supporting UI state for the trend module**

Introduce lightweight client-side state for trend range and metric switching if needed, backed by already-available timeline data rather than new APIs.


### Task 2: Replace the page shell and navigation styling system

**Files:**
- Modify: `app/globals.css`
- Test: manual browser verification on `/`

- [ ] **Step 1: Define a new dashboard token system**

Replace the current warm, soft palette with a cooler blue-cyan SaaS palette and explicit tokens for app background, surface layers, text hierarchy, borders, shadows, accents, and semantic states in both light and dark themes.

- [ ] **Step 2: Rebuild the shell, sidebar, header, and tab styles**

Shift the sidebar from card-heavy navigation to lighter list-style navigation, reduce its visual weight, and strengthen the top-level page structure around a standard backend header and cleaner content spacing.

- [ ] **Step 3: Unify component primitives**

Normalize buttons, badges, status pills, cards, chips, panel headers, and metrics so they all follow one spacing, radius, border, and emphasis system.


### Task 3: Productize the overview modules

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: manual browser verification on `/`

- [ ] **Step 1: Rebuild the operations status and AI insight panels**

Make the left status panel scan-friendly and the right AI insight panel structured into short cards instead of paragraph-heavy text.

- [ ] **Step 2: Rebuild category cards into a consistent product component**

Ensure each card has a stable height and repeated internal rhythm with title, priority, summary, metrics, judgement, and actions.

- [ ] **Step 3: Replace placeholder trend visuals with a chart-like module**

Use CSS-driven bars/lines and compact control chips to make the trend area feel like a real analytics panel without introducing a new chart dependency.

- [ ] **Step 4: Tighten the ranking block**

Convert the ranking area into compact, high-density leaderboard rows with stronger numeric emphasis and lighter supporting text.


### Task 4: Preserve consistency outside the overview

**Files:**
- Modify: `app/globals.css`
- Test: manual browser verification on `/`, category detail view, report tab, settings tab

- [ ] **Step 1: Restyle shared cards used by report/settings/content modules**

Apply the new surface, border, badge, and button language to downstream cards so the page no longer mixes old and new visual systems.

- [ ] **Step 2: Review responsive behavior**

Ensure the redesigned overview, sidebar, and panels collapse cleanly on narrower widths while keeping information density and hierarchy intact.


### Task 5: Verify the redesign

**Files:**
- Test: browser and local dev server

- [ ] **Step 1: Run the dev server and confirm the page renders**

Run: `npm run dev`

- [ ] **Step 2: Validate the main dashboard path manually**

Check: header hierarchy, six summary metrics, status panel, AI insights, category cards, trend controls, ranking area, and light/dark theme parity.

- [ ] **Step 3: Smoke-check existing detail surfaces**

Check: category detail tabs, report cards, topic workspace, and settings cards still render with the new shared styling and without layout regressions.
