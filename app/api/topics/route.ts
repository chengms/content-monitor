import { NextResponse } from "next/server";

import { attachContentToTopic, createTopic, deleteTopic, detachContentFromTopic, getTopicAnalysis, listTopics, updateTopic } from "@/lib/repositories/topic-repository";

export const dynamic = "force-dynamic";

function makeId() {
  return `topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId")?.trim();
  const topicId = searchParams.get("topicId")?.trim();

  if (topicId) {
    return NextResponse.json({ analysis: getTopicAnalysis(topicId) });
  }

  if (!categoryId) {
    return NextResponse.json({ error: "缺少 categoryId。" }, { status: 400 });
  }

  return NextResponse.json({ topics: listTopics(categoryId) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "create");
    const categoryId = String(body?.categoryId ?? "").trim();

    if (action === "attach" || action === "detach") {
      const topicId = String(body?.topicId ?? "").trim();
      const contentId = String(body?.contentId ?? "").trim();

      if (!topicId || !contentId || !categoryId) {
        return NextResponse.json({ error: "缺少 topicId、contentId 或 categoryId。" }, { status: 400 });
      }

      if (action === "attach") {
        attachContentToTopic(topicId, contentId);
      } else {
        detachContentFromTopic(topicId, contentId);
      }
      return NextResponse.json({ topics: listTopics(categoryId) });
    }

    if (action === "update") {
      const topicId = String(body?.topicId ?? "").trim();
      const title = String(body?.title ?? "").trim();
      const description = String(body?.description ?? "").trim();
      const goal = String(body?.goal ?? "").trim();
      const status = String(body?.status ?? "draft").trim() as "draft" | "collecting" | "ready" | "analyzed";
      const keywords = Array.isArray(body?.keywords) ? body.keywords.map((item: unknown) => String(item).trim()).filter(Boolean) : [];

      if (!topicId || !categoryId || !title) {
        return NextResponse.json({ error: "缺少 topicId、categoryId 或标题。" }, { status: 400 });
      }

      const topic = updateTopic({ id: topicId, categoryId, title, description, goal, status, keywords });
      return NextResponse.json({ topic, topics: listTopics(categoryId) });
    }

    if (action === "delete") {
      const topicId = String(body?.topicId ?? "").trim();
      if (!topicId || !categoryId) {
        return NextResponse.json({ error: "缺少 topicId 或 categoryId。" }, { status: 400 });
      }
      deleteTopic(topicId);
      return NextResponse.json({ topics: listTopics(categoryId) });
    }

    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const goal = String(body?.goal ?? "").trim();
    const keywords = Array.isArray(body?.keywords) ? body.keywords.map((item: unknown) => String(item).trim()).filter(Boolean) : [];

    if (!categoryId || !title) {
      return NextResponse.json({ error: "缺少 categoryId 或标题。" }, { status: 400 });
    }

    const topic = createTopic({
      id: makeId(),
      categoryId,
      title,
      description,
      goal,
      keywords
    });

    return NextResponse.json({ topic, topics: listTopics(categoryId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "选题操作失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

