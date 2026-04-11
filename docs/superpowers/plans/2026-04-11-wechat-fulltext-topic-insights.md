# Wechat Full-Text Topic Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade topic analysis so it uses the top 5 WeChat official-account articles with full text, produces richer article extracts, and then generates at least 5 structured topic insights from those extracts.

**Architecture:** Preserve the current two-stage AI pipeline, but move the source of truth to persisted topic content. Store WeChat full text in SQLite-backed content records, let the topic-insights route load and filter topic contents server-side, run stage-one article extraction on cleaned full text, then run stage-two aggregation on the stage-one output. The report UI stays in the existing page but shows that analysis is WeChat-only Top 5.

**Tech Stack:** Next.js App Router, React, TypeScript, better-sqlite3, OpenAI-compatible chat completions API

---

## File Map

- Modify: `lib/db.ts` - add content body columns with safe migration
- Modify: `lib/repositories/content-repository.ts` - read/write persisted full text fields
- Modify: `lib/topic-types.ts` - expand article and topic insight result shapes
- Modify: `app/page.tsx` - preserve WeChat full text in content items and update report rendering/copy
- Modify: `app/api/topic-insights/route.ts` - load topic contents server-side, filter WeChat, rank Top 5, run richer two-stage analysis
- Modify: `app/globals.css` - support extra article/topic insight blocks if needed
- Modify: `docs-ai-topic-insights.md` - align human-facing setup and behavior notes

## Task 1: Persist WeChat full text

**Files:**
- Modify: `lib/db.ts`
- Modify: `lib/repositories/content-repository.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the failing persistence test or verification script**
Create a minimal verification path that reads a stored content record and expects `rawContent` to round-trip. If no test harness exists for repositories, add a focused script or repository-level assertion target instead of skipping red-green.

- [ ] **Step 2: Run the red check**
Run the narrow verification command and confirm it fails because `rawContent` is not persisted yet.

- [ ] **Step 3: Add DB migration and repository support**
Add `raw_content` and, if helpful, `plain_text_content` columns to `contents`, then update repository types, insert, update, and row mapping.

- [ ] **Step 4: Preserve WeChat article body in the client payload**
Update `ContentItem`, `buildWechatContentItems`, `buildStoredContentPayload`, and `normalizeContentItem` so synced WeChat items include stored full text.

- [ ] **Step 5: Run the green check**
Re-run the narrow verification command and confirm the full-text field now survives persistence and reload.

## Task 2: Make topic analysis load authoritative topic content server-side

**Files:**
- Modify: `app/api/topic-insights/route.ts`
- Modify: `lib/repositories/content-repository.ts`

- [ ] **Step 1: Write the failing route-level behavior test or script**
Add a narrow check for this behavior: given a topic with mixed platform content, the route chooses only `wechatOfficial` records and ranks by `heat`.

- [ ] **Step 2: Run the red check**
Run the targeted command and confirm it fails with the current request-body-driven implementation.

- [ ] **Step 3: Add repository query support if needed**
Expose a way to fetch full persisted contents for a topic, including topic relationships and body fields.

- [ ] **Step 4: Rework the route**
Change `POST /api/topic-insights` so it reads contents by `topicId`, filters WeChat items, sorts by `heat` descending, and slices to the top 5 records. Keep the user-facing response explicit when fewer than 5 valid articles are available.

- [ ] **Step 5: Run the green check**
Verify the route now ignores non-WeChat content and consistently picks the top 5 by `heat`.

## Task 3: Enrich stage-one article extraction

**Files:**
- Modify: `lib/topic-types.ts`
- Modify: `app/api/topic-insights/route.ts`

- [ ] **Step 1: Write the failing shape check**
Add a narrow check that the stage-one parse result includes the new required fields such as `sourceSnippets` and `originalSignals`.

- [ ] **Step 2: Run the red check**
Run the targeted command and confirm the current type/prompt/parse flow does not satisfy the richer schema.

- [ ] **Step 3: Update types and prompts**
Expand `ArticleInsight` with the new fields, clean article full text before sending it to the model, and tighten the JSON prompt so the model returns richer article-level extracts.

- [ ] **Step 4: Add defensive normalization**
Normalize missing arrays/strings after parsing so the UI does not break on partial model output.

- [ ] **Step 5: Run the green check**
Verify the route can produce stage-one results in the richer schema for valid WeChat full-text input.

## Task 4: Enrich stage-two topic insights

**Files:**
- Modify: `lib/topic-types.ts`
- Modify: `app/api/topic-insights/route.ts`

- [ ] **Step 1: Write the failing shape check**
Add a narrow check that stage-two results include at least 5 topic insights and the richer fields `contentBlueprint` and `targetAudience`.

- [ ] **Step 2: Run the red check**
Run the targeted command and confirm the current schema/prompt does not satisfy the requirement.

- [ ] **Step 3: Update topic insight schema and prompt**
Expand `StructuredTopicInsight`, update the second prompt, and require traceable `relatedArticleIds`.

- [ ] **Step 4: Add minimum-count handling**
Ensure the route always returns up to all valid generated insights while enforcing the “at least try to generate 5” requirement and preserving failures honestly when the model output is insufficient.

- [ ] **Step 5: Run the green check**
Verify the response contains the richer topic insight fields and traceable article links.

## Task 5: Update report UI messaging and rendering

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing UI expectation**
Add a focused UI check or manual verification checklist covering: WeChat-only Top 5 messaging, richer article cards, richer topic insight cards.

- [ ] **Step 2: Run the red check**
Confirm the current UI lacks the required messaging and fields.

- [ ] **Step 3: Update UI data structures and copy**
Show that analysis uses WeChat Top 5 only, render new article insight fields, render new topic insight fields, and keep graceful empty states.

- [ ] **Step 4: Adjust styling**
Add only the styles needed to keep the new blocks readable on desktop and mobile.

- [ ] **Step 5: Run the green check**
Verify the report view renders the enriched result shape cleanly.

## Task 6: Update docs and perform full verification

**Files:**
- Modify: `docs-ai-topic-insights.md`
- Modify if needed based on verification failures

- [ ] **Step 1: Update human-facing docs**
Document required env vars, the WeChat full-text behavior, and the Top 5 rule.

- [ ] **Step 2: Run targeted verification**
Run the narrow test or verification commands added in earlier tasks.

- [ ] **Step 3: Run integration verification**
Run `npm run build` from the repo root.

- [ ] **Step 4: Run manual workflow verification**
Spot-check this flow: sync WeChat articles, persist full text, add articles to a topic, run analysis, load the saved report after refresh.

- [ ] **Step 5: Record any residual gaps**
If any checks cannot be automated, note them explicitly in the final report instead of implying they passed.
