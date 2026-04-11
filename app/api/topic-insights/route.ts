import { NextResponse } from "next/server";

import { listContentsByTopic } from "@/lib/repositories/content-repository";
import { saveTopicAnalysis } from "@/lib/repositories/topic-repository";
import type { ArticleInsight, StructuredTopicInsight, TopicAnalysisResult } from "@/lib/topic-types";

export const dynamic = "force-dynamic";

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const WECHAT_PLATFORM = "wechatOfficial";
const TOP_ARTICLE_LIMIT = 5;
const MAX_FULLTEXT_CHARS = 12000;

type TopicContentInput = {
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
  rawContent: string;
  plainTextContent: string;
};

type OpenAICompatibleResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function extractTextContent(content: OpenAICompatibleResponse["choices"]) {
  const messageContent = content?.[0]?.message?.content;
  if (typeof messageContent === "string") return messageContent;
  if (Array.isArray(messageContent)) {
    return messageContent.map((part) => part.text ?? "").join("\n");
  }
  return "";
}

function extractJsonBlock(raw: string) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  throw new Error("模型未返回可解析的 JSON 内容。");
}

function stripHtml(raw: string) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function compressFullText(raw: string) {
  const text = stripHtml(raw);
  if (text.length <= MAX_FULLTEXT_CHARS) return text;

  const first = text.slice(0, 4500);
  const middleStart = Math.max(0, Math.floor(text.length / 2) - 1500);
  const middle = text.slice(middleStart, middleStart + 3000);
  const last = text.slice(-4500);
  return `${first}\n\n[中段摘录]\n${middle}\n\n[结尾摘录]\n${last}`;
}

function normalizeStringArray(value: unknown, minLength = 0) {
  const list = Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
  if (list.length >= minLength) return list;
  return list;
}

function normalizeArticleInsight(input: Partial<ArticleInsight> & { articleId?: string; title?: string }, fallbackTitle: string): ArticleInsight {
  return {
    articleId: String(input.articleId ?? "").trim(),
    title: String(input.title ?? fallbackTitle).trim() || fallbackTitle,
    summary: String(input.summary ?? "").trim(),
    keyPoints: normalizeStringArray(input.keyPoints, 0),
    keywords: normalizeStringArray(input.keywords, 0),
    highlights: normalizeStringArray(input.highlights, 0),
    hook: String(input.hook ?? "").trim(),
    contentAngle: String(input.contentAngle ?? "").trim(),
    platformFit: normalizeStringArray(input.platformFit, 0),
    sourceSnippets: normalizeStringArray(input.sourceSnippets, 0),
    originalSignals: normalizeStringArray(input.originalSignals, 0)
  };
}

function normalizeTopicInsight(input: Partial<StructuredTopicInsight>, index: number): StructuredTopicInsight {
  return {
    id: String(input.id ?? `topic-insight-${index + 1}`).trim() || `topic-insight-${index + 1}`,
    title: String(input.title ?? `选题洞察 ${index + 1}`).trim() || `选题洞察 ${index + 1}`,
    summary: String(input.summary ?? "").trim(),
    whyNow: String(input.whyNow ?? "").trim(),
    growthPotential: String(input.growthPotential ?? "").trim(),
    highlightPoints: normalizeStringArray(input.highlightPoints, 0),
    suggestedPlatforms: normalizeStringArray(input.suggestedPlatforms, 0),
    relatedArticleIds: normalizeStringArray(input.relatedArticleIds, 0),
    contentBlueprint: String(input.contentBlueprint ?? "").trim(),
    targetAudience: String(input.targetAudience ?? "").trim()
  };
}

async function callModel(system: string, user: string) {
  if (!OPENAI_API_KEY) {
    throw new Error("缺少 OPENAI_API_KEY，暂时无法进行 AI 选题分析。");
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    }),
    cache: "no-store"
  });

  const payload = (await response.json()) as OpenAICompatibleResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "AI 模型调用失败，请检查兼容接口配置。");
  }

  return extractTextContent(payload.choices);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topicId = String(body?.topicId ?? "").trim();
    const categoryName = String(body?.categoryName ?? "当前分类");
    const topicTitle = String(body?.topicTitle ?? "当前选题");

    if (!topicId) {
      return NextResponse.json({ error: "缺少 topicId。" }, { status: 400 });
    }

    const topicContents = listContentsByTopic(topicId) as TopicContentInput[];
    if (topicContents.length === 0) {
      return NextResponse.json({ error: "请先为当前选题加入至少一条内容。" }, { status: 400 });
    }

    const rankedWechatArticles = topicContents
      .filter((item) => item.platform === WECHAT_PLATFORM)
      .map((item) => {
        const cleaned = item.plainTextContent?.trim() || compressFullText(item.rawContent ?? "");
        return {
          ...item,
          cleanedContent: cleaned
        };
      })
      .filter((item) => item.cleanedContent.length > 0)
      .sort((a, b) => b.heat - a.heat || b.engagementScore - a.engagementScore)
      .slice(0, TOP_ARTICLE_LIMIT);

    if (rankedWechatArticles.length === 0) {
      return NextResponse.json({ error: "当前选题下还没有可用于深度分析的公众号正文，请先同步公众号内容并加入该选题。" }, { status: 400 });
    }

    const articlePrompt = [
      `你是一名中文内容运营分析师，正在为分类「${categoryName}」下的选题「${topicTitle}」整理公众号长文素材。`,
      `请对以下 ${rankedWechatArticles.length} 篇公众号文章做第一阶段结构化摘录。`,
      `这些文章已按热度排序，只保留 Top ${TOP_ARTICLE_LIMIT} 的公众号文章进入分析。`,
      "你的目标不是复述全文，而是提炼后续做选题时真正有价值的信息。",
      "请只返回 JSON，不要输出任何解释、标题或 markdown。",
      'JSON 结构必须为 {"articleInsights":[...]}。',
      "articleInsights 中每个对象必须包含字段：articleId,title,summary,keyPoints,keywords,highlights,hook,contentAngle,platformFit,sourceSnippets,originalSignals。",
      "字段要求：",
      "1. articleId：必须与输入文章 id 完全一致。",
      "2. summary：2-3 句中文，概括原文最值得借鉴的核心内容。",
      "3. keyPoints：至少 3 条，提炼文章中的关键信息、观点或结论。",
      "4. keywords：至少 3 条，偏主题词和搜索词，不要太泛。",
      "5. highlights：至少 3 条，写清楚文章亮点、爆点、特别之处。",
      "6. hook：一句话说明最抓人的开头、冲突点或表达钩子。",
      "7. contentAngle：一句话总结内容切入角度，例如对比测评、清单拆解、案例复盘、方法论总结。",
      "8. platformFit：输出适合复用的中文平台名称数组。",
      "9. sourceSnippets：至少 2 条，摘录最值得后续复用的原文关键信息片段，尽量简短。",
      "10. originalSignals：至少 3 条，说明这篇文章最值得借鉴的原文信号，例如论据、结构、情绪张力、表达方式。",
      JSON.stringify({
        items: rankedWechatArticles.map((item) => ({
          articleId: item.id,
          title: item.title,
          creator: item.creator,
          publishTime: item.publishTime,
          heat: item.heat,
          engagementScore: item.engagementScore,
          matchedKeywords: item.matchedKeywords,
          aiTags: item.aiTags,
          content: compressFullText(item.cleanedContent)
        }))
      }, null, 2)
    ].join("\n\n");

    const articleRaw = await callModel(
      "你负责把公众号候选内容整理成适合内容运营团队使用的结构化文章摘录。输出必须是严格 JSON。",
      articlePrompt
    );
    const articleParsed = JSON.parse(extractJsonBlock(articleRaw)) as { articleInsights: ArticleInsight[] };
    const titleMap = new Map(rankedWechatArticles.map((item) => [item.id, item.title]));
    const articleInsights = (articleParsed.articleInsights ?? [])
      .map((item) => normalizeArticleInsight(item, titleMap.get(String(item.articleId ?? "")) ?? "未命名文章"))
      .filter((item) => item.articleId);

    if (articleInsights.length === 0) {
      throw new Error("AI 未返回可用的文章摘录结果。");
    }

    const insightPrompt = [
      `你是一名资深中文内容运营与选题策划专家，正在为分类「${categoryName}」下的选题「${topicTitle}」生成选题洞察。`,
      "你会收到一批公众号文章的结构化摘录，请基于它们提炼至少 5 条可执行、可复用的结构化选题方向。",
      "请只返回 JSON，不要输出任何解释、标题或 markdown。",
      'JSON 结构必须为 {"topicInsights":[...]}。',
      "topicInsights 中每个对象必须包含字段：id,title,summary,whyNow,growthPotential,highlightPoints,suggestedPlatforms,relatedArticleIds,contentBlueprint,targetAudience。",
      "字段要求：",
      "1. title：明确的选题方向标题，不要太空泛。",
      "2. summary：简要说明这个选题主要想讲什么。",
      "3. whyNow：说明为什么这个方向现在值得做，结合用户关注点、内容趋势或平台信号。",
      "4. growthPotential：说明这个选题的增长空间、传播潜力或延展价值。",
      "5. highlightPoints：至少 3 条，写清亮点、可打爆角度、适合放大的冲突点。",
      "6. suggestedPlatforms：输出建议优先发布的平台数组。",
      "7. relatedArticleIds：必须关联支撑这个洞察的文章 id。",
      "8. contentBlueprint：用 2-4 句写清这个选题后续可以怎么展开。",
      "9. targetAudience：一句话说明最适合触达的目标受众。",
      "要求：每条洞察都要具体、可执行，像内容运营团队能直接继续展开的选题报告。",
      JSON.stringify({ articleInsights }, null, 2)
    ].join("\n\n");

    const topicRaw = await callModel(
      "你负责把文章摘录整合成可执行的中文选题洞察报告。输出必须是严格 JSON。",
      insightPrompt
    );
    const topicParsed = JSON.parse(extractJsonBlock(topicRaw)) as { topicInsights: StructuredTopicInsight[] };
    const topicInsights = (topicParsed.topicInsights ?? []).map((item, index) => normalizeTopicInsight(item, index));

    const result: TopicAnalysisResult = {
      topicId,
      generatedAt: new Date().toISOString(),
      model: OPENAI_MODEL,
      totalArticles: articleInsights.length,
      articleInsights,
      topicInsights: topicInsights.slice(0, Math.max(5, topicInsights.length))
    };

    saveTopicAnalysis(topicId, result);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 选题分析失败，请稍后再试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
