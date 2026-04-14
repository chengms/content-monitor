import { NextResponse } from "next/server";

import { corsResponse } from "@/lib/cors";
import { getTopicById } from "@/lib/repositories/topic-repository";
import { listContentsByTopic } from "@/lib/repositories/content-repository";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ topicId: string }>;
};

export async function GET(
  _: Request,
  context: RouteContext,
) {
  const { topicId } = await context.params;

  if (!topicId) {
    return corsResponse({ error: "缺少 topicId。" }, { status: 400 });
  }

  const topic = getTopicById(topicId);
  if (!topic) {
    return corsResponse({ error: "选题不存在。" }, { status: 404 });
  }

  const contents = listContentsByTopic(topicId);

  if (contents.length === 0) {
    return corsResponse({
      topic,
      articles: [],
      message: "该选题下暂无内容，请先执行收集或在内容池中关联文章。",
    });
  }

  // 按热度排序返回
  const sorted = [...contents].sort((a, b) => b.heat - a.heat);

  return corsResponse({
    topic,
    total: sorted.length,
    articles: sorted.map((item) => ({
      id: item.id,
      title: item.title,
      creator: item.creator,
      platform: item.platform,
      publishTime: item.publishTime,
      heat: item.heat,
      engagementScore: item.engagementScore,
      summary: item.summary,
      plainTextContent: item.plainTextContent,
      rawContent: item.rawContent,
      matchedKeywords: item.matchedKeywords,
      aiTags: item.aiTags,
      stats: item.stats,
    })),
  });
}
