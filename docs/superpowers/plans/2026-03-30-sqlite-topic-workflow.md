# SQLite Topic Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a SQLite-backed workflow so each category can persist settings, sync content, create topic cards, collect articles into topics, and run topic-scoped AI analysis.

**Architecture:** Add a small server-side repository layer around a local SQLite database, expose focused API routes for settings/topics/content relationships, and keep the current Next.js page as the main UI shell while replacing in-memory topic flow with persisted topic-centric state. Existing wechat sync and AI analysis routes stay in place but write to and read from SQLite-backed records.

**Tech Stack:** Next.js App Router, React, TypeScript, better-sqlite3, local SQLite file

---

## File Map

- Create: `lib/db.ts` - initialize SQLite database and helper serialization utilities
- Create: `lib/repositories/category-repository.ts` - load/save category settings
- Create: `lib/repositories/topic-repository.ts` - create/update topics, attach contents, persist analysis results
- Create: `lib/repositories/content-repository.ts` - upsert synced contents and query by category/topic
- Create: `app/api/category-settings/route.ts` - CRUD for editable monitor settings
- Create: `app/api/topics/route.ts` - create/list topics and attach content items
- Modify: `app/api/wechat-articles/route.ts` - optional persistence hooks for synced content
- Modify: `app/api/topic-insights/route.ts` - read/write by topic id and persist results
- Modify: `app/page.tsx` - replace temporary topic-analysis selection flow with persisted topic workflow
- Modify: `app/globals.css` - styles for editable settings, topic cards, join-topic UI
- Modify: `package.json` - add SQLite dependency

## Task 1: Add SQLite dependency and DB bootstrap

**Files:**
- Modify: `package.json`
- Create: `lib/db.ts`

- [ ] Add `better-sqlite3` dependency.
- [ ] Create DB bootstrap that ensures `data/content-monitor.db` exists.
- [ ] Create tables for `category_settings`, `contents`, `topics`, `topic_contents`, `topic_analysis_results`.
- [ ] Export tiny helpers for JSON columns.

## Task 2: Create repositories

**Files:**
- Create: `lib/repositories/category-repository.ts`
- Create: `lib/repositories/content-repository.ts`
- Create: `lib/repositories/topic-repository.ts`

- [ ] Add category settings load/save functions.
- [ ] Add content upsert/query functions by category and topic.
- [ ] Add topic create/list/update/attach-content functions.
- [ ] Add analysis result save/load functions by topic.

## Task 3: Expose persistence APIs

**Files:**
- Create: `app/api/category-settings/route.ts`
- Create: `app/api/topics/route.ts`
- Modify: `app/api/topic-insights/route.ts`
- Modify: `app/api/wechat-articles/route.ts`

- [ ] Add category settings GET/POST route.
- [ ] Add topics GET/POST route and attach-content action.
- [ ] Update topic insights route to accept `topicId` and persist analysis result.
- [ ] Let wechat sync optionally persist mapped content items for a category.

## Task 4: Rehydrate UI from SQLite-backed APIs

**Files:**
- Modify: `app/page.tsx`

- [ ] Load editable category settings from API on page start.
- [ ] Load topics per active category.
- [ ] Replace `analysisSelections` temporary flow with topic-centric state.
- [ ] Load persisted topic analysis result when selecting a topic.

## Task 5: Make settings editable and saveable

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] Turn settings tab into editable platform toggles.
- [ ] Add keyword add/remove UI.
- [ ] Add creator add/remove UI.
- [ ] Add save settings action and save status feedback.
- [ ] Add sync action that uses saved keywords.

## Task 6: Add topic creation and article collection flow

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] Add topic card list UI.
- [ ] Add create-topic form with title/description/goal.
- [ ] Replace “加入选题分析” with “加入选题”.
- [ ] Add chooser for existing topic or create-and-add shortcut.
- [ ] Show each content item's assigned topics.

## Task 7: Rework report tab around a selected topic

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] Show topic cards before any report content.
- [ ] Show selected topic overview and collected articles.
- [ ] Run AI analysis only for selected topic's articles.
- [ ] Render persisted article insights and at least five topic insights.
- [ ] Preserve old result if a rerun fails.

## Task 8: Verify

**Files:**
- Modify if needed based on failures

- [ ] Run `npm.cmd install` if dependency changed.
- [ ] Run `npm.cmd run build`.
- [ ] Spot-check create topic -> join content -> run analysis flow.
