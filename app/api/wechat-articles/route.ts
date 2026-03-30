import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WECHAT_MONITOR_TOKEN = process.env.WECHAT_MONITOR_TOKEN ?? "";
const WECHAT_MONITOR_URL = "https://cn8n.com/p4/fbmain/monitor/v3/kw_search";
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 20000;
const MAX_ITEMS_PER_FETCH = 10;

type UpstreamWechatArticle = {
  avatar: string;
  classify: string;
  content: string;
  ghid: string;
  ip_wording: string;
  is_original: number;
  looking: number;
  praise: number;
  publish_time: number;
  publish_time_str: string;
  read: number;
  short_link: string;
  title: string;
  update_time: number;
  update_time_str: string;
  url: string;
  wx_id: string;
  wx_name: string;
  [property: string]: unknown;
};

type UpstreamResponse = {
  code: number;
  data?: {
    data?: UpstreamWechatArticle[];
    data_number?: number;
    page?: number;
    total?: number;
    total_page?: number;
    [property: string]: unknown;
  };
  msg?: string;
  requestId?: string;
  [property: string]: unknown;
};

type AttemptResult = {
  ok: boolean;
  status: number;
  rawText: string;
  payload?: UpstreamResponse;
  errorMessage?: string;
  attempt: number;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(body: Record<string, string | number>) {
  let lastResult: AttemptResult | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(WECHAT_MONITOR_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WECHAT_MONITOR_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal
      });
      const rawText = await response.text();
      clearTimeout(timeoutId);

      let payload: UpstreamResponse | undefined;
      if (rawText.trim()) {
        try {
          payload = JSON.parse(rawText) as UpstreamResponse;
        } catch {
          payload = undefined;
        }
      }

      const looksRetryableHtml = rawText.trim().startsWith("<");
      const shouldRetry = attempt < MAX_RETRIES && (!response.ok || looksRetryableHtml);
      lastResult = { ok: response.ok, status: response.status, rawText, payload, attempt };

      if (!shouldRetry) {
        return lastResult;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : "上游请求异常";
      lastResult = { ok: false, status: 502, rawText: "", errorMessage: message, attempt };

      if (attempt === MAX_RETRIES) {
        return lastResult;
      }
    }

    await wait(600 * attempt);
  }

  return lastResult;
}

export async function POST(request: Request) {
  try {
    if (!WECHAT_MONITOR_TOKEN) {
      return NextResponse.json({ error: "缺少 WECHAT_MONITOR_TOKEN，暂时无法请求公众号文章接口。" }, { status: 500 });
    }

    const body = await request.json();
    const kw = String(body?.kw ?? "").trim();

    if (!kw) {
      return NextResponse.json({ error: "请输入关键词后再搜索。" }, { status: 400 });
    }

    const upstreamBody = {
      kw,
      sort_type: Number(body?.sort_type ?? 1),
      mode: Number(body?.mode ?? 1),
      period: Number(body?.period ?? 7),
      page: Number(body?.page ?? 1),
      any_kw: String(body?.any_kw ?? ""),
      ex_kw: String(body?.ex_kw ?? ""),
      verifycode: String(body?.verifycode ?? ""),
      type: Number(body?.type ?? 1)
    };

    const result = await requestWithRetry(upstreamBody);

    if (!result) {
      return NextResponse.json({ error: "公众号文章接口没有返回结果。" }, { status: 502 });
    }

    if (result.errorMessage) {
      return NextResponse.json(
        {
          error: `上游接口请求失败，已重试 ${result.attempt} 次：${result.errorMessage}`,
          upstreamStatus: result.status
        },
        { status: 502 }
      );
    }

    if (!result.rawText.trim()) {
      return NextResponse.json(
        {
          error: `公众号文章接口没有返回内容，已重试 ${result.attempt} 次。`,
          upstreamStatus: result.status
        },
        { status: 502 }
      );
    }

    if (!result.payload) {
      const snippet = result.rawText.replace(/\s+/g, " ").slice(0, 180);
      return NextResponse.json(
        {
          error: result.rawText.trim().startsWith("<")
            ? `上游接口返回了 HTML 页面，已重试 ${result.attempt} 次，可能是鉴权失败、服务异常或请求被拦截。`
            : `上游接口返回格式异常，已重试 ${result.attempt} 次，仍无法解析。`,
          upstreamStatus: result.status,
          upstreamSnippet: snippet
        },
        { status: 502 }
      );
    }

    if (!result.ok || result.payload.code !== 0) {
      return NextResponse.json(
        {
          error: result.payload.msg ?? `公众号文章接口请求失败，已重试 ${result.attempt} 次。`,
          upstreamStatus: result.status,
          requestId: result.payload.requestId ?? ""
        },
        { status: result.ok ? 502 : result.status }
      );
    }

    const upstreamArticles = result.payload.data?.data ?? [];
    const articles = upstreamArticles.slice(0, MAX_ITEMS_PER_FETCH).map((item) => ({
      avatar: item.avatar,
      classify: item.classify,
      content: item.content,
      ghid: item.ghid,
      ipWording: item.ip_wording,
      isOriginal: item.is_original,
      looking: item.looking,
      praise: item.praise,
      publishTime: item.publish_time,
      publishTimeText: item.publish_time_str,
      read: item.read,
      shortLink: item.short_link,
      title: item.title,
      updateTime: item.update_time,
      updateTimeText: item.update_time_str,
      url: item.url,
      wxId: item.wx_id,
      wxName: item.wx_name
    }));

    return NextResponse.json({
      keyword: kw,
      articles,
      pagination: {
        page: result.payload.data?.page ?? upstreamBody.page,
        dataNumber: Math.min(result.payload.data?.data_number ?? articles.length, MAX_ITEMS_PER_FETCH),
        total: result.payload.data?.total ?? articles.length,
        totalPage: result.payload.data?.total_page ?? 1
      },
      requestId: result.payload.requestId ?? "",
      fetchedAt: new Date().toISOString(),
      fetchLimit: MAX_ITEMS_PER_FETCH
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "公众号文章接口请求异常。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}




