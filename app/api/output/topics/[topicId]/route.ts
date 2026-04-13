import { NextResponse } from "next/server";

import { getOutputTopicDetail } from "@/lib/repositories/output-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  const normalizedTopicId = topicId.trim();

  if (!normalizedTopicId) {
    return NextResponse.json({ error: "缺少 topicId。" }, { status: 400 });
  }

  const result = getOutputTopicDetail(normalizedTopicId);
  if (!result) {
    return NextResponse.json({ error: "选题不存在。" }, { status: 404 });
  }

  return NextResponse.json(result);
}
