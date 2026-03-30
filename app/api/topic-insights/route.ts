import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

type InputItem = {
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
  sourceType: string;
};

type ArticleInsight = {
  articleId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  highlights: string[];
  hook: string;
  contentAngle: string;
  platformFit: string[];
};

type StructuredTopicInsight = {
  id: string;
  title: string;
  summary: string;
  whyNow: string;
  growthPotential: string;
  highlightPoints: string[];
  suggestedPlatforms: string[];
  relatedArticleIds: string[];
};

type TopicAnalysisResult = {
  generatedAt: string;
  model: string;
  totalArticles: number;
  articleInsights: ArticleInsight[];
  topicInsights: StructuredTopicInsight[];
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
    const categoryName = String(body?.categoryName ?? "当前分类");
    const items = Array.isArray(body?.items) ? (body.items as InputItem[]) : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "请先加入至少一条选题分析内容。" }, { status: 400 });
    }

    const articlePrompt = [
      `你是一名中文内容运营分析师，正在为「${categoryName}」整理选题素材。`,
      `请对以下 ${items.length} 篇已加入选题分析的候选内容做第一阶段结构化摘录。`,
      "目标不是复述全文，而是提炼后续做选题时真正有价值的信息。",
      "请只返回 JSON，不要输出任何解释、标题或 markdown。",
      "JSON 结构必须为 {\"articleInsights\":[...]}。",
      "articleInsights 中每个对象必须包含字段：articleId,title,summary,keyPoints,keywords,highlights,hook,contentAngle,platformFit。",
      "字段要求：",
      "1. summary：2-3 句中文，概括原文最值得后续借鉴的核心内容。",
      "2. keyPoints：至少 3 条，提炼文章中的关键信息、观点、结论。",
      "3. keywords：至少 3 条，偏主题词和搜索词，不要太泛。",
      "4. highlights：至少 3 条，写清楚这篇内容的亮点、爆点、特别之处。",
      "5. hook：一句话说明这篇内容最抓人的开头、冲突点或表达钩子。",
      "6. contentAngle：一句话总结它的内容切入角度，例如对比测评、清单拆解、案例复盘、方法论总结。",
      "7. platformFit：输出适合复用的中文平台名称数组，例如 抖音 / 小红书 / 微信公众号 / B站。",
      JSON.stringify({ items }, null, 2)
    ].join("\n\n");

    const articleRaw = await callModel(
      "你负责把候选内容整理成适合内容运营团队使用的结构化文章摘录。输出必须是严格 JSON。",
      articlePrompt
    );
    const articleParsed = JSON.parse(extractJsonBlock(articleRaw)) as { articleInsights: ArticleInsight[] };

    const insightPrompt = [
      `你是一名资深中文内容运营与选题策划专家，正在为「${categoryName}」生成选题洞察。`,
      "你会收到一批候选内容的结构化摘录，请基于它们提炼至少 5 条可执行、可复用的结构化选题方向。",
      "请只返回 JSON，不要输出任何解释、标题或 markdown。",
      "JSON 结构必须为 {\"topicInsights\":[...]}。",
      "topicInsights 中每个对象必须包含字段：id,title,summary,whyNow,growthPotential,highlightPoints,suggestedPlatforms,relatedArticleIds。",
      "字段要求：",
      "1. title：明确的选题方向标题，不要太空泛。",
      "2. summary：简要说明这个选题主要想讲什么。",
      "3. whyNow：说明为什么这个方向现在值得做，结合用户关注点、内容趋势或平台信号。",
      "4. growthPotential：说明这个选题的增长空间、传播潜力或延展价值。",
      "5. highlightPoints：至少 3 条，写清这个选题的亮点、可打爆的角度、适合放大的冲突点。",
      "6. suggestedPlatforms：输出建议优先发布的平台数组。",
      "7. relatedArticleIds：必须关联支撑这个洞察的文章 id。",
      "要求：每条洞察都要足够具体，避免空泛建议，输出结果要像内容运营团队能直接继续展开的选题报告。",
      JSON.stringify({ articleInsights: articleParsed.articleInsights }, null, 2)
    ].join("\n\n");

    const topicRaw = await callModel(
      "你负责把文章摘录整合成可执行的中文选题洞察报告。输出必须是严格 JSON。",
      insightPrompt
    );
    const topicParsed = JSON.parse(extractJsonBlock(topicRaw)) as { topicInsights: StructuredTopicInsight[] };

    const result: TopicAnalysisResult = {
      generatedAt: new Date().toISOString(),
      model: OPENAI_MODEL,
      totalArticles: items.length,
      articleInsights: articleParsed.articleInsights,
      topicInsights: topicParsed.topicInsights.slice(0, Math.max(5, topicParsed.topicInsights.length))
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 选题分析失败，请稍后再试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
