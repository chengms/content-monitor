import { getContentById, listAllContents, listContentsByTopic, type StoredContentItem } from "@/lib/repositories/content-repository";
import { getTopicAnalysis, getTopicById, listAllTopics, listTopicAnalyses, type TopicCardRecord } from "@/lib/repositories/topic-repository";
import {
  buildArticleDetailPayload,
  buildArticleListItem,
  buildTopicDetailPayload,
  buildTopicListItem,
  filterArticles,
  filterTopics,
  type ArticleDetailPayload,
  type ArticleListItem,
  type ArticleFilterInput,
  type TopicDetailPayload,
  type TopicListItem,
  type TopicFilterInput
} from "@/lib/output/transformers";

type PaginationInput = {
  limit?: number;
  offset?: number;
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

function toTopicSource(topic: TopicCardRecord) {
  return {
    id: topic.id,
    categoryId: topic.categoryId,
    title: topic.title,
    description: topic.description,
    goal: topic.goal,
    status: topic.status,
    keywords: topic.keywords,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
    lastAnalysisAt: topic.lastAnalysisAt ?? null,
    articleCount: topic.articleCount
  };
}

function paginate<T>(items: T[], { limit = 20, offset = 0 }: PaginationInput): PaginatedResult<T> {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
  const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;
  return {
    items: items.slice(safeOffset, safeOffset + safeLimit),
    total: items.length,
    limit: safeLimit,
    offset: safeOffset
  };
}

function sortTopics(items: TopicListItem[]) {
  return items.slice().sort((a, b) => {
    const aTime = a.lastAnalysisAt || a.updatedAt;
    const bTime = b.lastAnalysisAt || b.updatedAt;
    return bTime.localeCompare(aTime) || b.updatedAt.localeCompare(a.updatedAt);
  });
}

function sortArticles(items: ArticleListItem[]) {
  return items.slice().sort((a, b) => {
    if (b.heat !== a.heat) return b.heat - a.heat;
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.publishTime.localeCompare(a.publishTime);
  });
}

function buildInsightMaps() {
  const analyses = listTopicAnalyses();
  const latestArticleInsightById = new Map<string, { generatedAt: string; insight: NonNullable<ArticleDetailPayload["insight"]> }>();
  const topicInsightsByArticleId = new Map<string, Array<{ generatedAt: string; insight: TopicDetailPayload["topicInsights"][number] }>>();

  for (const analysis of analyses) {
    for (const insight of analysis.articleInsights) {
      const current = latestArticleInsightById.get(insight.articleId);
      if (!current || analysis.generatedAt > current.generatedAt) {
        latestArticleInsightById.set(insight.articleId, { generatedAt: analysis.generatedAt, insight });
      }
    }

    for (const topicInsight of analysis.topicInsights) {
      for (const articleId of topicInsight.relatedArticleIds) {
        const current = topicInsightsByArticleId.get(articleId) ?? [];
        current.push({ generatedAt: analysis.generatedAt, insight: topicInsight });
        topicInsightsByArticleId.set(articleId, current);
      }
    }
  }

  return { latestArticleInsightById, topicInsightsByArticleId };
}

function buildTopicTitleMap(topics: TopicCardRecord[]) {
  return new Map(topics.map((topic) => [topic.id, topic.title]));
}

export function listOutputTopics(
  filter: TopicFilterInput & PaginationInput
): PaginatedResult<TopicListItem> {
  const topics = listAllTopics();
  const items = topics.map((topic) => {
    const analysis = getTopicAnalysis(topic.id);
    return buildTopicListItem(toTopicSource(topic), analysis?.topicInsights ?? []);
  });

  const filtered = filterTopics(items, filter);
  return paginate(sortTopics(filtered), filter);
}

export function getOutputTopicDetail(topicId: string): TopicDetailPayload | null {
  const topic = getTopicById(topicId);
  if (!topic) return null;

  const analysis = getTopicAnalysis(topicId);
  const sourceArticles = listContentsByTopic(topicId);
  const orderedArticles = analysis?.articleInsights?.length
    ? analysis.articleInsights
        .map((item) => sourceArticles.find((article) => article.id === item.articleId))
        .filter((item): item is StoredContentItem => Boolean(item))
    : sourceArticles.slice().sort((a, b) => b.heat - a.heat || b.date.localeCompare(a.date));

  return buildTopicDetailPayload({
    topic: toTopicSource(topic),
    analysis: analysis
      ? {
          generatedAt: analysis.generatedAt,
          model: analysis.model,
          totalArticles: analysis.totalArticles
        }
      : null,
    topicInsights: analysis?.topicInsights ?? [],
    articleInsights: analysis?.articleInsights ?? [],
    sourceArticles: orderedArticles
  });
}

export function listOutputArticles(
  filter: ArticleFilterInput & PaginationInput
): PaginatedResult<ArticleListItem> {
  const articles = filter.topicId ? listContentsByTopic(filter.topicId) : listAllContents();
  const topics = listAllTopics();
  const topicTitleMap = buildTopicTitleMap(topics);
  const { latestArticleInsightById } = buildInsightMaps();

  const items = articles.map((article) =>
    buildArticleListItem({
      article,
      topicTitles: article.topicIds.map((topicId) => topicTitleMap.get(topicId) ?? topicId),
      insight: latestArticleInsightById.get(article.id)?.insight ?? null
    })
  );

  const filtered = filterArticles(items, filter);
  return paginate(sortArticles(filtered), filter);
}

export function getOutputArticleDetail(articleId: string): ArticleDetailPayload | null {
  const article = getContentById(articleId);
  if (!article) return null;

  const allTopics = listAllTopics();
  const articleTopics = allTopics.filter((topic) => article.topicIds.includes(topic.id));
  const analyses = listTopicAnalyses()
    .filter((analysis) => article.topicIds.includes(analysis.topicId ?? ""))
    .filter((analysis) => analysis.articleInsights.some((item) => item.articleId === articleId))
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  const latestInsight = analyses[0]?.articleInsights.find((item) => item.articleId === articleId) ?? null;
  const relatedTopicInsights = analyses
    .flatMap((analysis) => analysis.topicInsights.filter((item) => item.relatedArticleIds.includes(articleId)))
    .filter((item, index, self) => self.findIndex((entry) => entry.id === item.id) === index);

  return buildArticleDetailPayload({
    article,
    insight: latestInsight,
    topics: articleTopics.map(toTopicSource),
    relatedTopicInsights
  });
}
