import assert from "node:assert/strict";

import { db } from "../lib/db.ts";

const columns = db.prepare("PRAGMA table_info(contents)").all() as Array<{ name: string }>;
assert.ok(columns.some((column) => column.name === "raw_content"), "expected contents.raw_content column to exist");

const id = `verify-content-${Date.now()}`;
const rawContent = "<p>第一段</p><p>第二段</p>";

db.prepare(`
  INSERT INTO contents (
    id, category_id, platform, title, summary, creator, publish_time, date, heat, engagement_score,
    stats_json, matched_keywords_json, matched_creators_json, ai_tags_json, source_type, pool_status, raw_content, created_at, updated_at
  ) VALUES (
    @id, @category_id, @platform, @title, @summary, @creator, @publish_time, @date, @heat, @engagement_score,
    @stats_json, @matched_keywords_json, @matched_creators_json, @ai_tags_json, @source_type, @pool_status, @raw_content, @created_at, @updated_at
  )
`).run({
  id,
  category_id: "verify-fulltext-category",
  platform: "wechatOfficial",
  title: "验证公众号正文持久化",
  summary: "验证摘要",
  creator: "验证账号",
  publish_time: "08:00",
  date: "2026-04-11",
  heat: 99,
  engagement_score: 88,
  stats_json: JSON.stringify({ likes: "10", comments: "5", saves: "3", shares: "2" }),
  matched_keywords_json: JSON.stringify(["验证"]),
  matched_creators_json: JSON.stringify(["验证账号"]),
  ai_tags_json: JSON.stringify(["验证"]),
  source_type: "keyword",
  pool_status: "candidate",
  raw_content: rawContent,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

const stored = db.prepare("SELECT raw_content FROM contents WHERE id = ?").get(id) as { raw_content?: string } | undefined;
assert.equal(stored?.raw_content, rawContent, "expected raw_content to round-trip through persistence");

console.log("verify-content-fulltext: ok");
