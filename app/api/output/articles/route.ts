import { NextResponse } from "next/server";

import { corsResponse } from "@/lib/cors";
import { listOutputArticles } from "@/lib/repositories/output-repository";

export const dynamic = "force-dynamic";

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId")?.trim() ?? "";
  const topicId = searchParams.get("topicId")?.trim() ?? "";
  const platform = searchParams.get("platform")?.trim() ?? "";
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const limit = parseNumber(searchParams.get("limit"), 20);
  const offset = parseNumber(searchParams.get("offset"), 0);

  const result = listOutputArticles({
    categoryId: categoryId || undefined,
    topicId: topicId || undefined,
    platform: platform || undefined,
    keyword: keyword || undefined,
    limit,
    offset
  });

  return corsResponse({
    items: result.items,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset
    }
  });
}
