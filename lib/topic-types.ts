export type ArticleInsight = {
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

export type StructuredTopicInsight = {
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

export type TopicAnalysisResult = {
  topicId?: string;
  generatedAt: string;
  model: string;
  totalArticles: number;
  articleInsights: ArticleInsight[];
  topicInsights: StructuredTopicInsight[];
};
