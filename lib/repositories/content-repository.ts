import { db, parseJson, serializeJson } from "@/lib/db";

export type StoredContentItem = {
  id: string;
  categoryId: string;
  platform: string;
  title: string;
  summary: string;
  rawContent: string;
  plainTextContent: string;
  creator: string;
  publishTime: string;
  date: string;
  heat: number;
  engagementScore: number;
  stats: { likes: string; comments: string; saves: string; shares: string };
  matchedKeywords: string[];
  matchedCreators: string[];
  aiTags: string[];
  sourceType: string;
  defaultStatus: "candidate" | "selected" | "ignored";
  topicIds: string[];
};

const upsertStmt = db.prepare(`
  INSERT INTO contents (
    id, category_id, platform, title, summary, raw_content, plain_text_content, creator, publish_time, date, heat, engagement_score,
    stats_json, matched_keywords_json, matched_creators_json, ai_tags_json, source_type, pool_status, created_at, updated_at
  ) VALUES (
    @id, @category_id, @platform, @title, @summary, @raw_content, @plain_text_content, @creator, @publish_time, @date, @heat, @engagement_score,
    @stats_json, @matched_keywords_json, @matched_creators_json, @ai_tags_json, @source_type, @pool_status, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    category_id = excluded.category_id,
    platform = excluded.platform,
    title = excluded.title,
    summary = excluded.summary,
    raw_content = excluded.raw_content,
    plain_text_content = excluded.plain_text_content,
    creator = excluded.creator,
    publish_time = excluded.publish_time,
    date = excluded.date,
    heat = excluded.heat,
    engagement_score = excluded.engagement_score,
    stats_json = excluded.stats_json,
    matched_keywords_json = excluded.matched_keywords_json,
    matched_creators_json = excluded.matched_creators_json,
    ai_tags_json = excluded.ai_tags_json,
    source_type = excluded.source_type,
    pool_status = excluded.pool_status,
    updated_at = excluded.updated_at
`);

const byTopicStmt = db.prepare(`
  SELECT c.*, GROUP_CONCAT(tc2.topic_id) AS topic_ids
  FROM contents c
  INNER JOIN topic_contents tc ON tc.content_id = c.id
  LEFT JOIN topic_contents tc2 ON tc2.content_id = c.id
  WHERE tc.topic_id = ?
  GROUP BY c.id
  ORDER BY c.heat DESC, c.date DESC, c.publish_time DESC
`);

const byCategoryStmt = db.prepare(`
  SELECT c.*, GROUP_CONCAT(tc.topic_id) AS topic_ids
  FROM contents c
  LEFT JOIN topic_contents tc ON tc.content_id = c.id
  WHERE c.category_id = ?
  GROUP BY c.id
  ORDER BY c.date DESC, c.publish_time DESC
`);
const deleteTopicLinksByCategoryStmt = db.prepare(`
  DELETE FROM topic_contents
  WHERE content_id IN (SELECT id FROM contents WHERE category_id = ?)
`);
const deleteContentsByCategoryStmt = db.prepare(`DELETE FROM contents WHERE category_id = ?`);

function mapRow(row: Record<string, unknown>): StoredContentItem {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    platform: String(row.platform),
    title: String(row.title),
    summary: String(row.summary),
    rawContent: String(row.raw_content ?? ""),
    plainTextContent: String(row.plain_text_content ?? ""),
    creator: String(row.creator),
    publishTime: String(row.publish_time),
    date: String(row.date),
    heat: Number(row.heat),
    engagementScore: Number(row.engagement_score),
    stats: parseJson(String(row.stats_json ?? "{}"), { likes: "0", comments: "0", saves: "0", shares: "0" }),
    matchedKeywords: parseJson(String(row.matched_keywords_json ?? "[]"), []),
    matchedCreators: parseJson(String(row.matched_creators_json ?? "[]"), []),
    aiTags: parseJson(String(row.ai_tags_json ?? "[]"), []),
    sourceType: String(row.source_type),
    defaultStatus: ((String(row.pool_status ?? "candidate") === "selected" || String(row.pool_status ?? "candidate") === "ignored") ? String(row.pool_status ?? "candidate") : "candidate") as "candidate" | "selected" | "ignored",
    topicIds: String(row.topic_ids ?? "")
      .split(",")
      .filter(Boolean)
  };
}

export function upsertContents(items: StoredContentItem[]) {
  const transaction = db.transaction((payload: StoredContentItem[]) => {
    for (const item of payload) {
      const now = new Date().toISOString();
      upsertStmt.run({
        id: item.id,
        category_id: item.categoryId,
        platform: item.platform,
        title: item.title,
        summary: item.summary,
        raw_content: item.rawContent,
        plain_text_content: item.plainTextContent,
        creator: item.creator,
        publish_time: item.publishTime,
        date: item.date,
        heat: item.heat,
        engagement_score: item.engagementScore,
        stats_json: serializeJson(item.stats),
        matched_keywords_json: serializeJson(item.matchedKeywords),
        matched_creators_json: serializeJson(item.matchedCreators),
        ai_tags_json: serializeJson(item.aiTags),
        source_type: item.sourceType,
        pool_status: item.defaultStatus,
        created_at: now,
        updated_at: now
      });
    }
  });

  transaction(items);
}

export function listContentsByCategory(categoryId: string) {
  return (byCategoryStmt.all(categoryId) as Record<string, unknown>[]).map(mapRow);
}

export function listContentsByTopic(topicId: string) {
  return (byTopicStmt.all(topicId) as Record<string, unknown>[]).map(mapRow);
}

export function deleteContentsByCategory(categoryId: string) {
  const transaction = db.transaction((id: string) => {
    deleteTopicLinksByCategoryStmt.run(id);
    deleteContentsByCategoryStmt.run(id);
  });

  transaction(categoryId);
}

