export type OutputTopicSource = {
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

export type OutputArticleInsightSource = {
  articleId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  highlights: string[];
  hook: string;
  contentAngle: string;
  platformFit: string[];
  sourceSnippets: string[];
  originalSignals: string[];
};

export type OutputTopicInsightSource = {
  id: string;
  title: string;
  summary: string;
  whyNow: string;
  growthPotential: string;
  highlightPoints: string[];
  suggestedPlatforms: string[];
  relatedArticleIds: string[];
  contentBlueprint: string;
  targetAudience: string;
};

export type OutputArticleDetailSource = {
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

export type TopicListItem = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  goal: string;
  status: OutputTopicSource["status"];
  keywords: string[];
  articleCount: number;
  lastAnalysisAt: string | null;
  analysisSummary: string;
  topInsightTitles: string[];
  updatedAt: string;
};

export type TopicDetailPayload = {
  topic: OutputTopicSource;
  analysis: {
    generatedAt: string;
    model: string;
    totalArticles: number;
  } | null;
  topicInsights: OutputTopicInsightSource[];
  articleInsights: OutputArticleInsightSource[];
  sourceArticles: Array<{
    id: string;
    title: string;
    creator: string;
    platform: string;
    publishTime: string;
    heat: number;
    engagementScore: number;
    summary: string;
    matchedKeywords: string[];
    aiTags: string[];
    topicIds: string[];
  }>;
  recommendedAngles: Array<{
    id: string;
    title: string;
    summary: string;
    targetAudience: string;
    contentBlueprint: string;
  }>;
};

export type ArticleListItem = {
  id: string;
  categoryId: string;
  title: string;
  creator: string;
  platform: string;
  publishTime: string;
  date: string;
  heat: number;
  engagementScore: number;
  summary: string;
  matchedKeywords: string[];
  aiTags: string[];
  topicIds: string[];
  topicTitles: string[];
  hasRawContent: boolean;
  hasInsight: boolean;
};

export type ArticleDetailPayload = {
  article: OutputArticleDetailSource;
  insight: OutputArticleInsightSource | null;
  topics: Array<{
    id: string;
    categoryId: string;
    title: string;
    status: OutputTopicSource["status"];
    keywords: string[];
    lastAnalysisAt: string | null;
  }>;
  relatedTopicInsights: OutputTopicInsightSource[];
  contentReference: {
    summary: string;
    keyPoints: string[];
    keywords: string[];
    highlights: string[];
    hook: string;
    contentAngle: string;
    sourceSnippets: string[];
    originalSignals: string[];
  } | null;
};

export type TopicFilterInput = {
  categoryId?: string | null;
  status?: string | null;
  keyword?: string | null;
};

export type ArticleFilterInput = {
  categoryId?: string | null;
  topicId?: string | null;
  platform?: string | null;
  keyword?: string | null;
};

function includesKeyword(haystack: string[], keyword: string) {
  if (!keyword) return true;
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return haystack.join(" ").toLowerCase().includes(normalized);
}

export function buildTopicListItem(topic: OutputTopicSource, topicInsights: OutputTopicInsightSource[]): TopicListItem {
  return {
    id: topic.id,
    categoryId: topic.categoryId,
    title: topic.title,
    description: topic.description,
    goal: topic.goal,
    status: topic.status,
    keywords: topic.keywords,
    articleCount: topic.articleCount,
    lastAnalysisAt: topic.lastAnalysisAt ?? null,
    analysisSummary: topicInsights[0]?.summary ?? "",
    topInsightTitles: topicInsights.slice(0, 3).map((item) => item.title),
    updatedAt: topic.updatedAt
  };
}

export function filterTopics(items: TopicListItem[], filter: TopicFilterInput) {
  return items.filter((item) => {
    if (filter.categoryId && item.categoryId !== filter.categoryId) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (!includesKeyword([item.title, item.description, item.goal, ...item.keywords], filter.keyword ?? "")) return false;
    return true;
  });
}

export function buildTopicDetailPayload(input: {
  topic: OutputTopicSource;
  analysis: TopicDetailPayload["analysis"];
  topicInsights: OutputTopicInsightSource[];
  articleInsights: OutputArticleInsightSource[];
  sourceArticles: OutputArticleDetailSource[];
}): TopicDetailPayload {
  return {
    topic: input.topic,
    analysis: input.analysis,
    topicInsights: input.topicInsights,
    articleInsights: input.articleInsights,
    sourceArticles: input.sourceArticles.map((item) => ({
      id: item.id,
      title: item.title,
      creator: item.creator,
      platform: item.platform,
      publishTime: `${item.date} ${item.publishTime}`.trim(),
      heat: item.heat,
      engagementScore: item.engagementScore,
      summary: item.summary,
      matchedKeywords: item.matchedKeywords,
      aiTags: item.aiTags,
      topicIds: item.topicIds
    })),
    recommendedAngles: input.topicInsights.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      targetAudience: item.targetAudience,
      contentBlueprint: item.contentBlueprint
    }))
  };
}

export function buildArticleListItem(input: {
  article: OutputArticleDetailSource;
  topicTitles: string[];
  insight: OutputArticleInsightSource | null;
}): ArticleListItem {
  const { article, topicTitles, insight } = input;
  return {
    id: article.id,
    categoryId: article.categoryId,
    title: article.title,
    creator: article.creator,
    platform: article.platform,
    publishTime: article.publishTime,
    date: article.date,
    heat: article.heat,
    engagementScore: article.engagementScore,
    summary: article.summary,
    matchedKeywords: article.matchedKeywords,
    aiTags: article.aiTags,
    topicIds: article.topicIds,
    topicTitles,
    hasRawContent: Boolean(article.rawContent.trim() || article.plainTextContent.trim()),
    hasInsight: Boolean(insight),
  };
}

export function filterArticles(items: ArticleListItem[], filter: ArticleFilterInput) {
  return items.filter((item) => {
    if (filter.categoryId && item.categoryId !== filter.categoryId) return false;
    if (filter.topicId && !item.topicIds.includes(filter.topicId)) return false;
    if (filter.platform && item.platform !== filter.platform) return false;
    if (!includesKeyword([item.title, item.summary, ...item.matchedKeywords, ...item.aiTags], filter.keyword ?? "")) return false;
    return true;
  });
}

export function buildArticleDetailPayload(input: {
  article: OutputArticleDetailSource;
  insight: OutputArticleInsightSource | null;
  topics: OutputTopicSource[];
  relatedTopicInsights: OutputTopicInsightSource[];
}): ArticleDetailPayload {
  return {
    article: input.article,
    insight: input.insight,
    topics: input.topics.map((topic) => ({
      id: topic.id,
      categoryId: topic.categoryId,
      title: topic.title,
      status: topic.status,
      keywords: topic.keywords,
      lastAnalysisAt: topic.lastAnalysisAt ?? null
    })),
    relatedTopicInsights: input.relatedTopicInsights,
    contentReference: input.insight
      ? {
          summary: input.insight.summary,
          keyPoints: input.insight.keyPoints,
          keywords: input.insight.keywords,
          highlights: input.insight.highlights,
          hook: input.insight.hook,
          contentAngle: input.insight.contentAngle,
          sourceSnippets: input.insight.sourceSnippets,
          originalSignals: input.insight.originalSignals
        }
      : null
  };
}
