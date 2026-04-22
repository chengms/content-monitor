import { NextResponse } from "next/server";

import { getCategorySettings } from "@/lib/repositories/category-repository";
import { upsertContents } from "@/lib/repositories/content-repository";

export const dynamic = "force-dynamic";

const DATA_GATHER_BASE_URL = process.env.DATA_GATHER_BASE_URL ?? "http://127.0.0.1:8000";
const COLLECT_TIMEOUT_MS = 5 * 60 * 1000; // 5分钟超时

type WorkflowJobSummary = {
  id: number;
  platform: string;
  discovery_source: string;
  fetch_source: string;
  keywords_json: string;
  status: string;
  created_at: string;
  finished_at: string | null;
  discovered_count: number;
  fetched_count: number;
  ranked_count: number;
};

type FetchedArticleRecord = {
  id: number;
  job_id: number;
  keyword: string;
  platform: string;
  source_engine: string;
  content_kind: string;
  title: string;
  source_url: string;
  account_name: string;
  publish_time: string;
  read_count: number;
  comment_count: number;
  content_text: string;
  content_html: string;
  source_id: string;
};

async function runWorkflow(
  keywords: string[],
  platforms: string[],
  topK: number = 20,
): Promise<{ jobId: number; discoveredCount: number; fetchedCount: number; rankedCount: number }> {
  const payload = {
    keywords,
    platform: platforms[0] ?? "wechat",
    platforms,
    discovery_source: null,
    fetch_source: null,
    limit: topK,
    top_k: topK,
    time_window_days: 7,
    fallback_to_mock: true,
    ranking: {
      relevance: 0.5,
      popularity: 0.3,
      freshness: 0.2,
    },
  };

  const response = await fetch(`${DATA_GATHER_BASE_URL}/api/workflows/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(COLLECT_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DataGatherAgent 工作流启动失败 (${response.status}): ${text}`);
  }

  const result = await response.json() as { job_id: number; discovered_count: number; fetched_count: number; ranked_count: number };
  return {
    jobId: result.job_id,
    discoveredCount: result.discovered_count,
    fetchedCount: result.fetched_count,
    rankedCount: result.ranked_count,
  };
}

async function pollJobUntilDone(jobId: number, timeoutMs: number = COLLECT_TIMEOUT_MS): Promise<WorkflowJobSummary> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${DATA_GATHER_BASE_URL}/api/workflows/jobs/${jobId}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`查询工作流状态失败 (${response.status})`);
    }

    const job = await response.json() as WorkflowJobSummary;
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    // 轮询间隔，避免过于频繁
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("工作流执行超时");
}

async function fetchArticles(jobId: number, page: number = 1, pageSize: number = 50): Promise<FetchedArticleRecord[]> {
  const articles: FetchedArticleRecord[] = [];
  let currentPage = page;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${DATA_GATHER_BASE_URL}/api/workflows/articles?job_id=${jobId}&page=${currentPage}&page_size=${pageSize}`,
      { signal: AbortSignal.timeout(30000) },
    );

    if (!response.ok) {
      throw new Error(`查询文章列表失败 (${response.status})`);
    }

    const result = await response.json() as { total: number; items: FetchedArticleRecord[] };
    articles.push(...result.items);
    hasMore = articles.length < result.total;
    currentPage++;
  }

  return articles;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateHeat(article: FetchedArticleRecord): number {
  return (article.read_count || 0) + (article.comment_count || 0) * 5;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const categoryId = String(body?.categoryId ?? "").trim();

    if (!categoryId) {
      return NextResponse.json({ error: "缺少 categoryId。" }, { status: 400 });
    }

    const settings = getCategorySettings(categoryId);

    if (!settings) {
      return NextResponse.json({ error: "分类不存在。" }, { status: 404 });
    }

    if (!settings.keywords || settings.keywords.length === 0) {
      return NextResponse.json({ error: "当前分类还没有设置关键词，请先在监控设置中添加关键词。" }, { status: 400 });
    }

    if (!settings.platforms || settings.platforms.length === 0) {
      return NextResponse.json({ error: "当前分类还没有选择平台，请先在监控设置中选择平台。" }, { status: 400 });
    }

    // 启动爬取工作流
    const platformKeys = settings.platforms.map((p) => p.key);
    const { jobId, discoveredCount, fetchedCount } = await runWorkflow(
      settings.keywords,
      platformKeys,
      20,
    );

    // 等待工作流完成
    const job = await pollJobUntilDone(jobId);

    if (job.status === "failed") {
      return NextResponse.json(
        { error: `数据爬取失败 (job=${jobId})，请检查 DataGatherAgent 服务状态。` },
        { status: 502 },
      );
    }

    // 拉取爬取到的文章
    const articles = await fetchArticles(jobId);

    if (articles.length === 0) {
      return NextResponse.json({
        jobId,
        collected: 0,
        message: "本次未爬取到任何文章，可能关键词匹配度较低。",
      });
    }

    // 写入内容池
    const now = new Date().toISOString();
    const contentItems = articles.map((article, index) => ({
      id: `gather-${jobId}-${article.id}`,
      categoryId,
      platform: article.platform,
      title: article.title,
      summary: stripHtmlTags(article.content_text).slice(0, 200),
      rawContent: article.content_html,
      plainTextContent: article.content_text,
      creator: article.account_name,
      publishTime: article.publish_time,
      date: article.publish_time.slice(0, 10),
      heat: estimateHeat(article),
      engagementScore: (article.read_count || 0) + (article.comment_count || 0) * 3,
      stats: { likes: "0", comments: String(article.comment_count), saves: "0", shares: "0" },
      matchedKeywords: settings.keywords.filter((kw) =>
        article.title.includes(kw) || article.content_text.includes(kw),
      ),
      matchedCreators: settings.creators?.filter((c) => c.name === article.account_name).map((c) => c.name) ?? [],
      aiTags: [],
      sourceType: "keyword" as const,
      defaultStatus: "candidate" as const,
      topicIds: [],
    }));

    upsertContents(contentItems);

    return NextResponse.json({
      jobId,
      collected: contentItems.length,
      discovered: discoveredCount,
      fetched: fetchedCount,
      ranked: job.ranked_count,
      message: `成功收集 ${contentItems.length} 篇文章到内容池。`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "数据收集失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
