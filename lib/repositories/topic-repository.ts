import { db, parseJson, serializeJson } from "@/lib/db";
import type { ArticleInsight, StructuredTopicInsight, TopicAnalysisResult } from "@/lib/topic-types";

export type TopicCardRecord = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  goal: string;
  status: "draft" | "collecting" | "ready" | "analyzed";
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  lastAnalysisAt?: string | null;
  articleCount: number;
};

const listTopicsStmt = db.prepare(`
  SELECT t.*, COUNT(tc.content_id) AS article_count
  FROM topics t
  LEFT JOIN topic_contents tc ON tc.topic_id = t.id
  WHERE t.category_id = ?
  GROUP BY t.id
  ORDER BY t.updated_at DESC
`);

const createTopicStmt = db.prepare(`
  INSERT INTO topics (id, category_id, title, description, goal, status, keywords_json, created_at, updated_at, last_analysis_at)
  VALUES (@id, @category_id, @title, @description, @goal, @status, @keywords_json, @created_at, @updated_at, @last_analysis_at)
`);

const updateTopicStmt = db.prepare(`
  UPDATE topics
  SET title = @title,
      description = @description,
      goal = @goal,
      status = @status,
      keywords_json = @keywords_json,
      updated_at = @updated_at
  WHERE id = @id
`);

const attachStmt = db.prepare(`
  INSERT OR REPLACE INTO topic_contents (topic_id, content_id, added_at)
  VALUES (@topic_id, @content_id, @added_at)
`);

const detachStmt = db.prepare(`
  DELETE FROM topic_contents WHERE topic_id = @topic_id AND content_id = @content_id
`);

const markTopicStmt = db.prepare(`
  UPDATE topics SET status = @status, updated_at = @updated_at, last_analysis_at = @last_analysis_at
  WHERE id = @id
`);

const saveAnalysisStmt = db.prepare(`
  INSERT INTO topic_analysis_results (topic_id, generated_at, model, total_articles, article_insights_json, topic_insights_json)
  VALUES (@topic_id, @generated_at, @model, @total_articles, @article_insights_json, @topic_insights_json)
  ON CONFLICT(topic_id) DO UPDATE SET
    generated_at = excluded.generated_at,
    model = excluded.model,
    total_articles = excluded.total_articles,
    article_insights_json = excluded.article_insights_json,
    topic_insights_json = excluded.topic_insights_json
`);

const getAnalysisStmt = db.prepare(`SELECT * FROM topic_analysis_results WHERE topic_id = ?`);
const listTopicIdsByCategoryStmt = db.prepare(`SELECT id FROM topics WHERE category_id = ?`);
const deleteTopicContentsStmt = db.prepare(`DELETE FROM topic_contents WHERE topic_id = ?`);
const deleteTopicAnalysisStmt = db.prepare(`DELETE FROM topic_analysis_results WHERE topic_id = ?`);
const deleteTopicStmt = db.prepare(`DELETE FROM topics WHERE id = ?`);

function mapTopic(row: Record<string, unknown>): TopicCardRecord {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    title: String(row.title),
    description: String(row.description),
    goal: String(row.goal),
    status: String(row.status) as TopicCardRecord["status"],
    keywords: parseJson(String(row.keywords_json ?? "[]"), []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastAnalysisAt: row.last_analysis_at ? String(row.last_analysis_at) : null,
    articleCount: Number(row.article_count ?? 0)
  };
}

export function listTopics(categoryId: string) {
  return (listTopicsStmt.all(categoryId) as Record<string, unknown>[]).map(mapTopic);
}

export function createTopic(input: {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  goal: string;
  keywords: string[];
}) {
  const now = new Date().toISOString();
  createTopicStmt.run({
    id: input.id,
    category_id: input.categoryId,
    title: input.title,
    description: input.description,
    goal: input.goal,
    status: "draft",
    keywords_json: serializeJson(input.keywords),
    created_at: now,
    updated_at: now,
    last_analysis_at: null
  });

  return listTopics(input.categoryId).find((topic) => topic.id === input.id) ?? null;
}

export function updateTopic(input: {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  goal: string;
  status: TopicCardRecord["status"];
  keywords: string[];
}) {
  updateTopicStmt.run({
    id: input.id,
    title: input.title,
    description: input.description,
    goal: input.goal,
    status: input.status,
    keywords_json: serializeJson(input.keywords),
    updated_at: new Date().toISOString()
  });

  return listTopics(input.categoryId).find((topic) => topic.id === input.id) ?? null;
}

export function attachContentToTopic(topicId: string, contentId: string) {
  attachStmt.run({ topic_id: topicId, content_id: contentId, added_at: new Date().toISOString() });
  markTopicStmt.run({ id: topicId, status: "collecting", updated_at: new Date().toISOString(), last_analysis_at: null });
}

export function detachContentFromTopic(topicId: string, contentId: string) {
  detachStmt.run({ topic_id: topicId, content_id: contentId });
  markTopicStmt.run({ id: topicId, status: "collecting", updated_at: new Date().toISOString(), last_analysis_at: null });
}

export function deleteTopic(topicId: string) {
  const transaction = db.transaction((id: string) => {
    deleteTopicContentsStmt.run(id);
    deleteTopicAnalysisStmt.run(id);
    deleteTopicStmt.run(id);
  });

  transaction(topicId);
}

export function deleteTopicsByCategory(categoryId: string) {
  const topicIds = (listTopicIdsByCategoryStmt.all(categoryId) as Array<{ id: string }>).map((row) => row.id);
  const transaction = db.transaction((ids: string[]) => {
    ids.forEach((id) => {
      deleteTopicContentsStmt.run(id);
      deleteTopicAnalysisStmt.run(id);
      deleteTopicStmt.run(id);
    });
  });

  transaction(topicIds);
}

export function saveTopicAnalysis(topicId: string, result: TopicAnalysisResult) {
  saveAnalysisStmt.run({
    topic_id: topicId,
    generated_at: result.generatedAt,
    model: result.model,
    total_articles: result.totalArticles,
    article_insights_json: serializeJson(result.articleInsights),
    topic_insights_json: serializeJson(result.topicInsights)
  });

  markTopicStmt.run({ id: topicId, status: "analyzed", updated_at: new Date().toISOString(), last_analysis_at: result.generatedAt });
}

export function getTopicAnalysis(topicId: string): TopicAnalysisResult | null {
  const row = getAnalysisStmt.get(topicId) as
    | {
        topic_id: string;
        generated_at: string;
        model: string;
        total_articles: number;
        article_insights_json: string;
        topic_insights_json: string;
      }
    | undefined;

  if (!row) return null;

  return {
    topicId: row.topic_id,
    generatedAt: row.generated_at,
    model: row.model,
    totalArticles: row.total_articles,
    articleInsights: parseJson<ArticleInsight[]>(row.article_insights_json, []),
    topicInsights: parseJson<StructuredTopicInsight[]>(row.topic_insights_json, [])
  };
}

