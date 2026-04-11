import { NextResponse } from "next/server";

import { deleteCategorySettings, getCategorySettings, saveCategorySettings } from "@/lib/repositories/category-repository";
import { deleteContentsByCategory } from "@/lib/repositories/content-repository";
import { deleteTopicsByCategory } from "@/lib/repositories/topic-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId")?.trim();

  if (!categoryId) {
    return NextResponse.json({ error: "缺少 categoryId。" }, { status: 400 });
  }

  return NextResponse.json({ settings: getCategorySettings(categoryId) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "save");
    const categoryId = String(body?.categoryId ?? "").trim();
    const platforms = Array.isArray(body?.platforms) ? body.platforms : [];
    const keywords = Array.isArray(body?.keywords) ? body.keywords.map((item: unknown) => String(item).trim()).filter(Boolean) : [];
    const creators = Array.isArray(body?.creators) ? body.creators : [];
    const scheduleType = String(body?.scheduleType ?? "manual").trim() as "manual" | "daily" | "weekly";
    const runTime = String(body?.runTime ?? "").trim();
    const scheduleWeekday = Number(body?.scheduleWeekday ?? 1);
    const lastRunAt = String(body?.lastRunAt ?? "").trim();

    if (!categoryId) {
      return NextResponse.json({ error: "缺少 categoryId。" }, { status: 400 });
    }

    if (action === "delete") {
      deleteTopicsByCategory(categoryId);
      deleteContentsByCategory(categoryId);
      deleteCategorySettings(categoryId);
      return NextResponse.json({ ok: true });
    }

    const saved = saveCategorySettings({ categoryId, platforms, keywords, creators, scheduleType, runTime, scheduleWeekday, lastRunAt });
    return NextResponse.json({ settings: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存监控设置失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
