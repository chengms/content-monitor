import { NextResponse } from "next/server";

import { getOutputArticleDetail } from "@/lib/repositories/output-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { articleId } = await params;
  const normalizedArticleId = articleId.trim();

  if (!normalizedArticleId) {
    return NextResponse.json({ error: "缺少 articleId。" }, { status: 400 });
  }

  const result = getOutputArticleDetail(normalizedArticleId);
  if (!result) {
    return NextResponse.json({ error: "文章不存在。" }, { status: 404 });
  }

  return NextResponse.json(result);
}
