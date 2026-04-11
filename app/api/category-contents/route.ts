import { NextResponse } from "next/server";

import { listContentsByCategory, upsertContents } from "@/lib/repositories/content-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId")?.trim();

  if (!categoryId) {
    return NextResponse.json({ error: "缺少 categoryId。" }, { status: 400 });
  }

  return NextResponse.json({ contents: listContentsByCategory(categoryId) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const categoryId = String(body?.categoryId ?? "").trim();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!categoryId) {
      return NextResponse.json({ error: "缺少 categoryId。" }, { status: 400 });
    }

    upsertContents(items.map((item: Record<string, unknown>) => ({
      id: String(item.id),
      categoryId,
      platform: String(item.platform),
      title: String(item.title),
      summary: String(item.summary),
      rawContent: String(item.rawContent ?? ""),
      plainTextContent: String(item.plainTextContent ?? ""),
      creator: String(item.creator),
      publishTime: String(item.publishTime),
      date: String(item.date),
      heat: Number(item.heat),
      engagementScore: Number(item.engagementScore),
      stats: item.stats as { likes: string; comments: string; saves: string; shares: string },
      matchedKeywords: (item.matchedKeywords as string[]) ?? [],
      matchedCreators: (item.matchedCreators as string[]) ?? [],
      aiTags: (item.aiTags as string[]) ?? [],
      sourceType: String(item.sourceType),
      defaultStatus: String(item.defaultStatus ?? "candidate") === "selected" || String(item.defaultStatus ?? "candidate") === "ignored" ? String(item.defaultStatus) as "selected" | "ignored" : "candidate",
      topicIds: []
    })));

    return NextResponse.json({ contents: listContentsByCategory(categoryId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存内容池失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

