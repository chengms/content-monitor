import test from "node:test";
import assert from "node:assert/strict";

import {
  buildArticleListItem,
  buildArticleDetailPayload,
  buildTopicListItem,
  buildTopicDetailPayload,
  filterArticles,
  filterTopics
} from "../lib/output/transformers.ts";

const topic = {
  id: "topic-1",
  categoryId: "cat-ai",
  title: "AI Agent 选题",
  description: "聚焦智能体工作流",
  goal: "给内容平台供稿",
  status: "analyzed",
  keywords: ["agent", "workflow"],
  createdAt: "2026-04-10T00:00:00.000Z",
  updatedAt: "2026-04-12T00:00:00.000Z",
  lastAnalysisAt: "2026-04-12T10:00:00.000Z",
  articleCount: 2
};

const topicInsights = [
  {
    id: "insight-1",
    title: "Agent 编排提效",
    summary: "把 Agent 编排讲清楚",
    whyNow: "团队都在落地",
    growthPotential: "可延展成系列",
    highlightPoints: ["落地快", "话题热"],
    suggestedPlatforms: ["公众号", "知乎"],
    relatedArticleIds: ["article-1"],
    contentBlueprint: "先讲问题，再讲流程，最后给模版。",
    targetAudience: "产品和开发团队"
  },
  {
    id: "insight-2",
    title: "多 Agent 协作实践",
    summary: "拆成多个角色协作",
    whyNow: "工具成熟",
    growthPotential: "适合案例型内容",
    highlightPoints: ["角色清晰"],
    suggestedPlatforms: ["公众号"],
    relatedArticleIds: ["article-1", "article-2"],
    contentBlueprint: "用案例对比单 Agent 与多 Agent。",
    targetAudience: "技术运营"
  }
];

const articleInsight = {
  articleId: "article-1",
  title: "用多 Agent 做内容生产",
  summary: "总结了内容生产链路里多 Agent 的分工。",
  keyPoints: ["拆角色", "设流程", "做复盘"],
  keywords: ["multi-agent", "content"],
  highlights: ["案例完整", "结构清楚"],
  hook: "一套流程让内容团队少走弯路。",
  contentAngle: "案例拆解",
  platformFit: ["公众号", "即刻"],
  sourceSnippets: ["作者把流程拆成采集、判断、写作三段。"],
  originalSignals: ["方法论结构", "可复用模板"]
};

const articles = [
  {
    id: "article-1",
    categoryId: "cat-ai",
    title: "用多 Agent 做内容生产",
    summary: "文章摘要",
    rawContent: "<p>正文原文</p>",
    plainTextContent: "正文原文",
    creator: "内容实验室",
    platform: "wechatOfficial",
    publishTime: "09:30",
    date: "2026-04-11",
    heat: 96,
    engagementScore: 88,
    stats: { likes: "120", comments: "30", saves: "20", shares: "10" },
    matchedKeywords: ["agent"],
    matchedCreators: ["内容实验室"],
    aiTags: ["工作流"],
    sourceType: "keyword",
    defaultStatus: "selected",
    topicIds: ["topic-1"]
  },
  {
    id: "article-2",
    categoryId: "cat-ai",
    title: "Agent 编排指南",
    summary: "第二篇摘要",
    rawContent: "",
    plainTextContent: "",
    creator: "AI 周刊",
    platform: "wechatOfficial",
    publishTime: "12:00",
    date: "2026-04-10",
    heat: 90,
    engagementScore: 79,
    stats: { likes: "90", comments: "15", saves: "12", shares: "6" },
    matchedKeywords: ["workflow"],
    matchedCreators: ["AI 周刊"],
    aiTags: ["编排"],
    sourceType: "creator",
    defaultStatus: "candidate",
    topicIds: ["topic-1"]
  }
];

test("filterTopics matches keyword across title and keywords", () => {
  const result = filterTopics([buildTopicListItem(topic, topicInsights)], { keyword: "workflow" });
  assert.equal(result.length, 1);
});

test("buildTopicDetailPayload exposes recommended angles and source articles", () => {
  const payload = buildTopicDetailPayload({
    topic,
    analysis: {
      generatedAt: "2026-04-12T10:00:00.000Z",
      model: "gpt-test",
      totalArticles: 1
    },
    topicInsights,
    articleInsights: [articleInsight],
    sourceArticles: articles
  });

  assert.equal(payload.recommendedAngles.length, 2);
  assert.equal(payload.sourceArticles[0]?.id, "article-1");
  assert.equal(payload.analysis?.model, "gpt-test");
});

test("buildArticleListItem marks raw content and insight availability", () => {
  const item = buildArticleListItem({
    article: articles[0],
    topicTitles: ["AI Agent 选题"],
    insight: articleInsight
  });

  assert.equal(item.hasRawContent, true);
  assert.equal(item.hasInsight, true);
  assert.deepEqual(item.topicTitles, ["AI Agent 选题"]);
});

test("filterArticles matches topic id and keyword", () => {
  const list = [
    buildArticleListItem({ article: articles[0], topicTitles: ["AI Agent 选题"], insight: articleInsight }),
    buildArticleListItem({ article: articles[1], topicTitles: ["AI Agent 选题"], insight: null })
  ];

  const result = filterArticles(list, { topicId: "topic-1", keyword: "编排" });
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "article-2");
});

test("buildArticleDetailPayload includes related topic insights and content reference", () => {
  const payload = buildArticleDetailPayload({
    article: articles[0],
    insight: articleInsight,
    topics: [topic],
    relatedTopicInsights: topicInsights
  });

  assert.equal(payload.article.id, "article-1");
  assert.equal(payload.relatedTopicInsights.length, 2);
  assert.equal(payload.contentReference?.hook, articleInsight.hook);
});
