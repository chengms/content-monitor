"use client";

import { useEffect, useMemo, useState } from "react";

type PlatformKey = "douyin" | "xiaohongshu" | "weibo" | "bilibili" | "wechatOfficial";
type TabKey = "content" | "report" | "settings";
type SourceFilter = "all" | "keyword" | "creator";
type RangeFilter = "1d" | "7d" | "14d" | "30d";
type ViewMode = "single" | "range";
type SortMode = "heat" | "time" | "engagement";
type PoolStatus = "candidate" | "selected" | "ignored";
type PlatformOrAll = PlatformKey | "all";
type TopLevelView = "system-overview" | string;
type ScheduleType = "manual" | "daily" | "weekly";
type OverviewTrendMetric = "totalCount" | "peakHeat" | "averageHeat";

type ContentItem = {
  id: string;
  date: string;
  title: string;
  creator: string;
  platform: PlatformKey;
  publishTime: string;
  heat: number;
  engagementScore: number;
  stats: { likes: string; comments: string; saves: string; shares: string };
  summary: string;
  rawContent?: string;
  plainTextContent?: string;
  sourceType: Exclude<SourceFilter, "all">;
  matchedKeywords: string[];
  matchedCreators: string[];
  aiTags: string[];
  defaultStatus: PoolStatus;
  topicIds?: string[];
};

type TopicInsight = {
  id: string;
  title: string;
  description: string;
  whyNow: string;
  potential: string;
};

type DailyReport = {
  date: string;
  headline: string;
  focus: string;
  hotSignals: string[];
  aiSummary: string;
  topics: TopicInsight[];
};

type TimelineDay = {
  date: string;
  label: string;
  totalCount: number;
  peakHeat: number;
  averageHeat: number;
  topPlatform: PlatformKey;
  hotKeyword: string;
  highlight: string;
};

type MonitorCategory = {
  id: string;
  name: string;
  goal: string;
  cadence: string;
  priority: "高" | "中" | "低";
  runStatus: {
    collect: "正常" | "延迟" | "异常";
    analysis: "已完成" | "处理中" | "稍晚";
    latestRun: string;
    nextRun: string;
    latestRunAt?: string;
    nextRunAt?: string;
    issue?: string;
  };
  platforms: { key: PlatformKey; enabled: boolean; volume: string; note: string }[];
  keywords: string[];
  creators: { name: string; platform: PlatformKey; style: string; updateRate: string }[];
  timeline: TimelineDay[];
  contents: ContentItem[];
  reports: DailyReport[];
};

type WechatArticle = {
  avatar: string;
  classify: string;
  content: string;
  ghid: string;
  ipWording: string;
  isOriginal: number;
  looking: number;
  praise: number;
  publishTime: number;
  publishTimeText: string;
  read: number;
  shortLink: string;
  title: string;
  updateTime: number;
  updateTimeText: string;
  url: string;
  wxId: string;
  wxName: string;
};

type WechatArticlePayload = {
  keyword: string;
  articles: WechatArticle[];
  pagination: {
    page: number;
    dataNumber: number;
    total: number;
    totalPage: number;
  };
  requestId: string;
  fetchedAt: string;
  fetchLimit?: number;
};

type WechatSyncState = {
  loading: boolean;
  error: string;
  keyword: string;
  items: ContentItem[];
  fetchedAt?: string;
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
  sourceSnippets: string[];
  originalSignals: string[];
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
  contentBlueprint: string;
  targetAudience: string;
};

type TopicAnalysisResult = {
  generatedAt: string;
  model: string;
  totalArticles: number;
  articleInsights: ArticleInsight[];
  topicInsights: StructuredTopicInsight[];
};

type TopicAnalysisState = {
  loading: boolean;
  error: string;
  result: TopicAnalysisResult | null;
};

type TopicCard = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  goal: string;
  status: "draft" | "collecting" | "ready" | "analyzed";
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  lastAnalysisAt?: string | null;
  articleCount: number;
};

type TopicStatus = TopicCard["status"];

const hiddenCategoryStorageKey = "content-monitor-hidden-categories";
const customCategoryStorageKey = "content-monitor-custom-categories";

type TopicDraft = {
  title: string;
  description: string;
  goal: string;
};

type CategorySettingsDraft = {
  platforms: MonitorCategory["platforms"];
  keywords: string[];
  creators: MonitorCategory["creators"];
  scheduleType: ScheduleType;
  runTime: string;
  scheduleWeekday: number;
  lastRunAt: string;
};

const platformMeta: Record<PlatformKey, { label: string; accent: string; soft: string; trend: string }> = {
  douyin: { label: "抖音", accent: "var(--accent-coral)", soft: "rgba(210, 106, 79, 0.16)", trend: "爆发明显" },
  xiaohongshu: { label: "小红书", accent: "var(--accent-rose)", soft: "rgba(199, 85, 109, 0.16)", trend: "持续稳定" },
  weibo: { label: "微博", accent: "var(--accent-gold)", soft: "rgba(184, 139, 50, 0.16)", trend: "评论热度高" },
  bilibili: { label: "B站", accent: "var(--accent-sky)", soft: "rgba(45, 124, 147, 0.16)", trend: "深度内容强" },
  wechatOfficial: { label: "微信公众号", accent: "#2f8f62", soft: "rgba(47, 143, 98, 0.14)", trend: "深度观点稳定" }
};

const rangeMeta: Record<RangeFilter, { label: string; days: number }> = {
  "1d": { label: "今天", days: 1 },
  "7d": { label: "近 7 天", days: 7 },
  "14d": { label: "近 14 天", days: 14 },
  "30d": { label: "近 30 天", days: 30 }
};

const statusMeta: Record<PoolStatus, { label: string; tone: string }> = {
  candidate: { label: "加入选题池", tone: "candidate" },
  selected: { label: "已加入", tone: "selected" },
  ignored: { label: "已忽略", tone: "ignored" }
};

const topicStatusMeta: Record<TopicStatus, { label: string; tone: string }> = {
  draft: { label: "草稿", tone: "draft" },
  collecting: { label: "收集中", tone: "collecting" },
  ready: { label: "待分析", tone: "ready" },
  analyzed: { label: "已分析", tone: "analyzed" }
};


const tabOptions: { key: TabKey; label: string; description: string }[] = [
  { key: "content", label: "内容", description: "内容池、趋势总览与热点筛选" },
  { key: "report", label: "选题分析与报告", description: "查看每日 AI 洞察与选题汇总" },
  { key: "settings", label: "监控设置", description: "管理平台、关键词和对标账号" }
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function makeTimeline(days: Array<Omit<TimelineDay, "label">>): TimelineDay[] {
  return days.map((day, index) => ({ ...day, label: index === 0 ? "今天" : index === 1 ? "昨天" : day.date.slice(5) }));
}

function formatCountLabel(value: number) {
  if (value >= 10000) {
    const normalized = (value / 10000).toFixed(1);
    return `${normalized.endsWith(".0") ? normalized.slice(0, -2) : normalized}w`;
  }

  return String(value);
}

function normalizeWechatDate(timeText: string, unixTime: number) {
  if (timeText && timeText.length >= 10) {
    return timeText.slice(0, 10);
  }

  if (unixTime) {
    return new Date(unixTime * 1000).toISOString().slice(0, 10);
  }

  return monitorCategories[0]?.timeline[0]?.date ?? "2026-03-29";
}

function normalizeWechatPublishTime(timeText: string, unixTime: number) {
  if (timeText && timeText.length >= 16) {
    return timeText.slice(11, 16);
  }

  if (unixTime) {
    return new Date(unixTime * 1000).toISOString().slice(11, 16);
  }

  return "08:00";
}

function buildWechatContentItems(category: MonitorCategory, payload: WechatArticlePayload): ContentItem[] {
  return payload.articles.map((article, index) => {
    const read = article.read || 0;
    const praise = article.praise || 0;
    const looking = article.looking || 0;
    const heat = Math.min(99, Math.max(58, Math.round(read / 350 + praise / 18 + looking * 2 + (article.isOriginal === 1 ? 4 : 0))));
    const engagementScore = Math.min(99, Math.max(52, Math.round((praise + looking * 2) / Math.max(read, 1) * 1000)));
    const date = normalizeWechatDate(article.publishTimeText, article.publishTime);
    const publishTime = normalizeWechatPublishTime(article.publishTimeText, article.publishTime);
    const plainTextContent = article.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const summary = plainTextContent.slice(0, 120) || "公众号文章未返回摘要，可点击原文查看完整内容。";
    const aiTags = [article.classify || "公众号文章", article.isOriginal === 1 ? "原创长文" : "图文内容", "微信生态"].filter(Boolean);

    return {
      id: `wechat-${category.id}-${article.ghid || article.wxId || index}-${article.publishTime || index}`,
      date,
      title: article.title,
      creator: article.wxName,
      platform: "wechatOfficial",
      publishTime,
      heat,
      engagementScore,
      stats: {
        likes: formatCountLabel(praise),
        comments: formatCountLabel(looking),
        saves: formatCountLabel(Math.max(looking, Math.round(praise * 0.6))),
        shares: formatCountLabel(Math.max(1, Math.round(read * 0.03)))
      },
      summary,
      rawContent: article.content,
      plainTextContent,
      sourceType: "keyword",
      matchedKeywords: [payload.keyword],
      matchedCreators: [article.wxName],
      aiTags,
      defaultStatus: "candidate"
    };
  });
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text();

  if (!rawText.trim()) {
    throw new Error("接口没有返回内容，请稍后再试。");
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    if (rawText.trim().startsWith("<")) {
      throw new Error("接口返回了 HTML 页面，通常表示服务异常、鉴权失败或上游超时。请稍后重试。");
    }

    throw new Error("接口返回格式异常，暂时无法解析。请稍后再试。");
  }
}

function getWechatCacheKey(scope: string, keyword: string) {
  return `wechat-cache:${scope}:${keyword.trim().toLowerCase()}`;
}

function readWechatCache(scope: string, keyword: string) {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(getWechatCacheKey(scope, keyword));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WechatArticlePayload;
  } catch {
    return null;
  }
}

function writeWechatCache(scope: string, keyword: string, payload: WechatArticlePayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getWechatCacheKey(scope, keyword), JSON.stringify(payload));
}

const weekdayOptions = [
  { value: 1, label: "每周一" },
  { value: 2, label: "每周二" },
  { value: 3, label: "每周三" },
  { value: 4, label: "每周四" },
  { value: 5, label: "每周五" },
  { value: 6, label: "每周六" },
  { value: 0, label: "每周日" }
] as const;

function extractRunTime(value: string) {
  const matched = value.match(/\b(\d{2}:\d{2})\b/);
  return matched?.[1] ?? "";
}

function extractScheduleType(category: MonitorCategory): ScheduleType {
  if (category.cadence.startsWith("每周")) return "weekly";
  if (category.cadence.startsWith("每天")) return "daily";
  return "manual";
}

function extractScheduleWeekday(value: string) {
  const mapping: Record<string, number> = {
    周一: 1,
    周二: 2,
    周三: 3,
    周四: 4,
    周五: 5,
    周六: 6,
    周日: 0,
    周天: 0
  };

  const matched = Object.entries(mapping).find(([label]) => value.includes(label));
  return matched?.[1] ?? 1;
}

function parseLegacyRelativeDateTime(value: string) {
  const matched = value.match(/(今天|明天)\s+(\d{2}:\d{2})/);
  if (!matched) return "";

  const [, dayLabel, time] = matched;
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  const next = new Date();
  if (dayLabel === "明天") {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTime(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function buildChartPath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length === 1 ? width : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = stepX * index;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function scrollToSection(sectionId: string) {
  if (typeof document === "undefined") return;
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function computeNextRunAt(scheduleType: ScheduleType, runTime: string, scheduleWeekday: number, now = new Date()) {
  if (scheduleType === "manual" || !runTime) return null;

  const [hours, minutes] = runTime.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hours, minutes, 0, 0);

  if (scheduleType === "daily") {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  const currentWeekday = now.getDay();
  let delta = (scheduleWeekday - currentWeekday + 7) % 7;
  if (delta === 0 && next <= now) {
    delta = 7;
  }
  next.setDate(next.getDate() + delta);
  return next;
}

function formatCadence(scheduleType: ScheduleType, runTime: string, scheduleWeekday: number) {
  if (scheduleType === "manual" || !runTime) return "手动运行";
  if (scheduleType === "weekly") {
    return `${weekdayOptions.find((item) => item.value === scheduleWeekday)?.label ?? "每周一"} ${runTime} 自动运行`;
  }
  return `每天 ${runTime} 自动运行`;
}

function toSettingsDraft(category: MonitorCategory): CategorySettingsDraft {
  return {
    platforms: category.platforms.map((item) => ({ ...item })),
    keywords: [...category.keywords],
    creators: category.creators.map((item) => ({ ...item })),
    scheduleType: extractScheduleType(category),
    runTime: extractRunTime(category.cadence) || extractRunTime(category.runStatus.nextRun),
    scheduleWeekday: extractScheduleWeekday(category.cadence || category.runStatus.nextRun),
    lastRunAt: category.runStatus.latestRunAt ?? parseLegacyRelativeDateTime(category.runStatus.latestRun)
  };
}

function mergeCategorySettings(category: MonitorCategory, draft?: CategorySettingsDraft): MonitorCategory {
  if (!draft) return category;

  const nextRunAt = computeNextRunAt(draft.scheduleType, draft.runTime, draft.scheduleWeekday);
  const latestRun = draft.lastRunAt ? formatDateTime(new Date(draft.lastRunAt)) : category.runStatus.latestRun;
  const nextRun = nextRunAt ? formatDateTime(nextRunAt) : "手动触发";

  return {
    ...category,
    platforms: draft.platforms,
    keywords: draft.keywords,
    creators: draft.creators,
    cadence: formatCadence(draft.scheduleType, draft.runTime, draft.scheduleWeekday),
    runStatus: {
      ...category.runStatus,
      latestRun,
      nextRun,
      latestRunAt: draft.lastRunAt || undefined,
      nextRunAt: nextRunAt?.toISOString()
    }
  };
}

function createEmptyTopicDraft(): TopicDraft {
  return { title: "", description: "", goal: "" };
}

function dedupeStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function createEmptyCreatorDraft(): MonitorCategory["creators"][number] {
  return { name: "", platform: "wechatOfficial", style: "", updateRate: "" };
}

function formatDateOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

function createEmptyTimeline(): TimelineDay[] {
  return makeTimeline(
    Array.from({ length: 7 }, (_, index) => ({
      date: formatDateOffset(index),
      totalCount: 0,
      peakHeat: 0,
      averageHeat: 0,
      topPlatform: "wechatOfficial" as PlatformKey,
      hotKeyword: "待补充",
      highlight: index === 0 ? "新分类已创建，先补充关键词或同步内容后，这里会出现热点摘要。" : "当前还没有采集到内容。"
    }))
  );
}

function createCategoryId(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `category-${normalized || "new"}-${Date.now().toString(36)}`;
}

function createCustomCategory(name: string, goal: string): MonitorCategory {
  return {
    id: createCategoryId(name),
    name: name.trim(),
    goal: goal.trim() || `跟踪 ${name.trim()} 相关内容热度，沉淀后续选题方向。`,
    cadence: "手动运行",
    priority: "中",
    runStatus: {
      collect: "正常",
      analysis: "稍晚",
      latestRun: "尚未运行",
      nextRun: "手动触发"
    },
    platforms: (Object.keys(platformMeta) as PlatformKey[]).map((key) => ({
      key,
      enabled: key === "wechatOfficial",
      volume: "待配置",
      note: "新建分类后可在设置页补充监控说明"
    })),
    keywords: [],
    creators: [],
    timeline: createEmptyTimeline(),
    contents: [],
    reports: []
  };
}

function dedupeContents(items: ContentItem[]) {
  const map = new Map<string, ContentItem>();
  items.forEach((item) => {
    const current = map.get(item.id);
    if (!current) {
      map.set(item.id, item);
      return;
    }

    map.set(item.id, {
      ...current,
      ...item,
      topicIds: Array.from(new Set([...(current.topicIds ?? []), ...(item.topicIds ?? [])]))
    });
  });

  return Array.from(map.values());
}

function buildStoredContentPayload(categoryId: string, items: ContentItem[]) {
  return items.map((item) => ({
    ...item,
    categoryId,
    topicIds: item.topicIds ?? []
  }));
}

function normalizeContentItem(item: Partial<ContentItem>): ContentItem {
  return {
    id: String(item.id ?? ""),
    date: String(item.date ?? "2026-03-29"),
    title: String(item.title ?? "未命名内容"),
    creator: String(item.creator ?? "未知来源"),
    platform: (item.platform as PlatformKey) ?? "wechatOfficial",
    publishTime: String(item.publishTime ?? "00:00"),
    heat: Number(item.heat ?? 0),
    engagementScore: Number(item.engagementScore ?? 0),
    stats: item.stats ?? { likes: "0", comments: "0", saves: "0", shares: "0" },
    summary: String(item.summary ?? ""),
    rawContent: String(item.rawContent ?? ""),
    plainTextContent: String(item.plainTextContent ?? ""),
    sourceType: item.sourceType === "creator" ? "creator" : "keyword",
    matchedKeywords: Array.isArray(item.matchedKeywords) ? item.matchedKeywords : [],
    matchedCreators: Array.isArray(item.matchedCreators) ? item.matchedCreators : [],
    aiTags: Array.isArray(item.aiTags) ? item.aiTags : [],
    defaultStatus: item.defaultStatus === "selected" || item.defaultStatus === "ignored" ? item.defaultStatus : "candidate",
    topicIds: Array.isArray(item.topicIds) ? item.topicIds : []
  };
}
const monitorCategories: MonitorCategory[] = [
  {
    id: "claudecode",
    name: "ClaudeCode 选题监控",
    goal: "跟踪 AI 编码工具内容热度，提炼面向开发者的爆款选题",
    cadence: "每天 08:30 自动运行",
    priority: "高",
    runStatus: { collect: "正常", analysis: "已完成", latestRun: "今天 08:32", nextRun: "明天 08:30" },
    platforms: [
      { key: "douyin", enabled: true, volume: "18 条/日", note: "短视频热点速度快" },
      { key: "xiaohongshu", enabled: true, volume: "24 条/日", note: "教程拆解较多" },
      { key: "weibo", enabled: true, volume: "12 条/日", note: "舆情反馈集中" },
      { key: "bilibili", enabled: true, volume: "9 条/日", note: "长内容深度高" },
      { key: "wechatOfficial", enabled: true, volume: "16 篇/日", note: "公众号文章适合沉淀方法论" }
    ],
    keywords: ["Claude Code", "AI 编程", "agent 工作流", "vibe coding", "cursor 替代"],
    creators: [
      { name: "AI 阿凯", platform: "douyin", style: "快速演示型", updateRate: "日更" },
      { name: "野生产品笔记", platform: "xiaohongshu", style: "案例复盘型", updateRate: "周 4 更" },
      { name: "代码补给站", platform: "bilibili", style: "长视频教程型", updateRate: "周更" },
      { name: "TechPulse", platform: "weibo", style: "热点追踪型", updateRate: "日更" },
      { name: "AI 工程化内参", platform: "wechatOfficial", style: "方法论长文型", updateRate: "日更" }
    ],
    timeline: makeTimeline([
      { date: "2026-03-29", totalCount: 28, peakHeat: 98, averageHeat: 86, topPlatform: "douyin", hotKeyword: "迁移清单", highlight: "真实迁移案例和团队规范内容在今天明显爆发。" },
      { date: "2026-03-28", totalCount: 24, peakHeat: 92, averageHeat: 81, topPlatform: "weibo", hotKeyword: "团队规范", highlight: "管理视角内容带来更强评论和转发。" },
      { date: "2026-03-27", totalCount: 26, peakHeat: 97, averageHeat: 85, topPlatform: "douyin", hotKeyword: "Claude Code 迁移", highlight: "真实效率对比内容爆发，短视频收藏率显著升高。" },
      { date: "2026-03-26", totalCount: 31, peakHeat: 95, averageHeat: 82, topPlatform: "weibo", hotKeyword: "团队规范", highlight: "团队接入 AI 编程的争议型讨论带动评论量。" },
      { date: "2026-03-25", totalCount: 22, peakHeat: 88, averageHeat: 76, topPlatform: "xiaohongshu", hotKeyword: "Claude vs Cursor", highlight: "对比型选题持续稳定，中文团队适配是主话题。" },
      { date: "2026-03-24", totalCount: 18, peakHeat: 81, averageHeat: 72, topPlatform: "bilibili", hotKeyword: "完整交付案例", highlight: "长视频用户更关注需求澄清和完整交付过程。" },
      { date: "2026-03-23", totalCount: 17, peakHeat: 79, averageHeat: 69, topPlatform: "xiaohongshu", hotKeyword: "提示词避坑", highlight: "新手避坑内容收藏稳定，适合持续铺量。" }
    ]),
    contents: [
      { id: "cc1", date: "2026-03-29", title: "Claude Code 迁移清单：团队从 Cursor 过来前一定要先评估这 4 件事", creator: "AI 阿凯", platform: "douyin", publishTime: "09:10", heat: 98, engagementScore: 95, stats: { likes: "3.4w", comments: "2.7k", saves: "5.1k", shares: "1.3k" }, summary: "真实团队迁移案例配清单式结论，强决策导向，适合作为今天最先跟进的选题。", sourceType: "keyword", matchedKeywords: ["Claude Code", "cursor 替代"], matchedCreators: [], aiTags: ["对比测评", "迁移清单", "爆款结构"], defaultStatus: "selected" },
      { id: "cc2", date: "2026-03-29", title: "研发负责人真正关心的不是 AI 写得多快，而是怎么纳入团队规范", creator: "TechPulse", platform: "weibo", publishTime: "13:40", heat: 91, engagementScore: 88, stats: { likes: "5.8k", comments: "1.8k", saves: "1.3k", shares: "2.0k" }, summary: "管理视角的规范化内容讨论非常集中，适合往组织级选题延展。", sourceType: "creator", matchedKeywords: ["AI 编程"], matchedCreators: ["TechPulse"], aiTags: ["团队规范", "管理视角", "情绪争议"], defaultStatus: "candidate" },
      { id: "cc3", date: "2026-03-28", title: "Claude Code 提示词别再堆功能了，先把交付边界说清楚", creator: "野生产品笔记", platform: "xiaohongshu", publishTime: "18:00", heat: 87, engagementScore: 82, stats: { likes: "8.2k", comments: "760", saves: "4.3k", shares: "390" }, summary: "提示词内容继续稳定，但用户更偏向工作流和边界定义。", sourceType: "creator", matchedKeywords: ["Claude Code"], matchedCreators: ["野生产品笔记"], aiTags: ["提示词", "交付边界", "收藏导向"], defaultStatus: "selected" },
      { id: "cc4", date: "2026-03-27", title: "Claude Code 工作流模板：从需求到 PR 的完整链路", creator: "代码补给站", platform: "bilibili", publishTime: "11:45", heat: 92, engagementScore: 88, stats: { likes: "8.6k", comments: "1.2k", saves: "3.2k", shares: "540" }, summary: "完整拆解需求澄清、计划、实现、验证链路，适合沉淀为方法论选题。", sourceType: "creator", matchedKeywords: ["agent 工作流"], matchedCreators: ["代码补给站"], aiTags: ["教程拆解", "工作流", "长内容深挖"], defaultStatus: "candidate" },
      { id: "cc5", date: "2026-03-26", title: "AI 编程工具接入团队规范后，谁的效率提升最大？", creator: "TechPulse", platform: "weibo", publishTime: "10:15", heat: 95, engagementScore: 90, stats: { likes: "5.7k", comments: "1.9k", saves: "980", shares: "2.2k" }, summary: "岗位差异内容争议强，说明用户已经进入协作优化阶段。", sourceType: "creator", matchedKeywords: ["AI 编程"], matchedCreators: ["TechPulse"], aiTags: ["岗位差异", "争议话题", "团队规范"], defaultStatus: "candidate" },
      { id: "cc6", date: "2026-03-25", title: "Claude Code vs Cursor：到底谁更适合中文开发团队？", creator: "野生产品笔记", platform: "xiaohongshu", publishTime: "13:20", heat: 88, engagementScore: 83, stats: { likes: "7.1k", comments: "790", saves: "3.8k", shares: "380" }, summary: "从中文语境理解、稳定性、团队适配三个方向做横评，决策导向明显。", sourceType: "creator", matchedKeywords: ["Claude Code", "cursor 替代"], matchedCreators: ["野生产品笔记"], aiTags: ["对比测评", "中文团队", "决策指南"], defaultStatus: "candidate" },
      { id: "cc7", date: "2026-03-29", title: "公众号长文：Claude Code 真正适合团队落地的 5 个前提", creator: "AI 工程化内参", platform: "wechatOfficial", publishTime: "07:40", heat: 89, engagementScore: 86, stats: { likes: "3.8k", comments: "620", saves: "2.9k", shares: "510" }, summary: "公众号文章更适合展开团队流程、制度边界和落地前提，是今天值得沉淀成长文选题的样本。", sourceType: "creator", matchedKeywords: ["Claude Code", "AI 编程"], matchedCreators: ["AI 工程化内参"], aiTags: ["方法论长文", "团队落地", "选题沉淀"], defaultStatus: "candidate" }
    ],
    reports: [{ date: "03-29", headline: "ClaudeCode 赛道今天在团队迁移与规范落地上最值得优先跟进", focus: "最新报告", hotSignals: ["迁移清单内容爆发", "管理视角评论更集中", "模板型内容收藏持续走高"], aiSummary: "今天最有价值的内容不再只是工具对比，而是如何让团队真正落地 AI 编码。", topics: [{ id: "t1", title: "团队迁移清单", description: "帮助团队判断何时迁移。", whyNow: "决策窗口期明显。", potential: "适合短视频与模板下载。" }] }]
  },
  {
    id: "vibecoding",
    name: "VibeCoding 选题监控",
    goal: "追踪 AI 原型、独立开发与产品创意内容，挖掘高增长话题",
    cadence: "每天 09:00 自动运行",
    priority: "中",
    runStatus: { collect: "延迟", analysis: "稍晚", latestRun: "今天 09:18", nextRun: "明天 09:00", issue: "微博采集延迟 18 分钟，报告生成略晚。" },
    platforms: [
      { key: "douyin", enabled: true, volume: "15 条/日", note: "灵感类短内容高频" },
      { key: "xiaohongshu", enabled: true, volume: "30 条/日", note: "产品包装案例多" },
      { key: "weibo", enabled: true, volume: "8 条/日", note: "舆情和观点观察" },
      { key: "bilibili", enabled: true, volume: "11 条/日", note: "案例拆解质量高" },
      { key: "wechatOfficial", enabled: true, volume: "10 篇/日", note: "更适合收集深度复盘与商业化长文" }
    ],
    keywords: ["vibe coding", "AI 原型", "独立开发", "MVP", "产品灵感"],
    creators: [
      { name: "增长造物", platform: "xiaohongshu", style: "项目包装型", updateRate: "日更" },
      { name: "一人产品研究所", platform: "bilibili", style: "案例拆解型", updateRate: "周 3 更" },
      { name: "30 秒做产品", platform: "douyin", style: "快节奏灵感型", updateRate: "日更" },
      { name: "Demo Radar", platform: "weibo", style: "趋势速递型", updateRate: "日更" },
      { name: "独立开发周刊", platform: "wechatOfficial", style: "商业化复盘型", updateRate: "周 5 更" }
    ],
    timeline: makeTimeline([
      { date: "2026-03-29", totalCount: 17, peakHeat: 90, averageHeat: 79, topPlatform: "douyin", hotKeyword: "可卖原型", highlight: "商业化表达继续有效，但微博采集延迟导致全局量略低。" },
      { date: "2026-03-28", totalCount: 18, peakHeat: 87, averageHeat: 75, topPlatform: "xiaohongshu", hotKeyword: "首页包装", highlight: "首页包装继续稳定，转化导向内容收藏率高。" },
      { date: "2026-03-27", totalCount: 19, peakHeat: 93, averageHeat: 81, topPlatform: "douyin", hotKeyword: "一句话做 SaaS", highlight: "商业化暗示型内容拉升停留和收藏。" },
      { date: "2026-03-26", totalCount: 23, peakHeat: 89, averageHeat: 77, topPlatform: "bilibili", hotKeyword: "48 小时 MVP", highlight: "时间压缩叙事驱动强，适合做流程拆解。" },
      { date: "2026-03-25", totalCount: 20, peakHeat: 84, averageHeat: 72, topPlatform: "xiaohongshu", hotKeyword: "首页包装", highlight: "包装优先级超过功能堆叠。" },
      { date: "2026-03-24", totalCount: 18, peakHeat: 76, averageHeat: 66, topPlatform: "douyin", hotKeyword: "产品灵感", highlight: "灵感类短视频有量，但缺少深度承接。" },
      { date: "2026-03-23", totalCount: 15, peakHeat: 73, averageHeat: 64, topPlatform: "xiaohongshu", hotKeyword: "独立开发包装", highlight: "用户正在寻找可复制包装公式。" }
    ]),
    contents: [
      { id: "vc1", date: "2026-03-29", title: "我把 AI 原型生成和商业变现直接绑定，私信咨询量翻了 3 倍", creator: "30 秒做产品", platform: "douyin", publishTime: "10:05", heat: 90, engagementScore: 89, stats: { likes: "2.2w", comments: "910", saves: "4.9k", shares: "710" }, summary: "把原型和收益直接绑定，依然是当前最强的转化型内容结构。", sourceType: "creator", matchedKeywords: ["AI 原型"], matchedCreators: ["30 秒做产品"], aiTags: ["商业化", "强转化", "爆款结构"], defaultStatus: "selected" },
      { id: "vc2", date: "2026-03-28", title: "独立开发首页包装公式：为什么第一屏决定你能不能卖出去", creator: "增长造物", platform: "xiaohongshu", publishTime: "15:25", heat: 87, engagementScore: 84, stats: { likes: "8.1k", comments: "630", saves: "3.9k", shares: "260" }, summary: "首页包装仍然是高收藏主题，适合延展为模板型内容。", sourceType: "creator", matchedKeywords: ["产品灵感"], matchedCreators: ["增长造物"], aiTags: ["首页包装", "案例拆解", "收藏导向"], defaultStatus: "selected" },
      { id: "vc3", date: "2026-03-27", title: "我用一句话做出一个 SaaS 首页，居然有人直接私信报价", creator: "30 秒做产品", platform: "douyin", publishTime: "10:05", heat: 93, engagementScore: 92, stats: { likes: "2.4w", comments: "980", saves: "5.2k", shares: "760" }, summary: "把 AI 原型生成和商业变现直接绑定，刺激用户想象空间。", sourceType: "creator", matchedKeywords: ["AI 原型"], matchedCreators: ["30 秒做产品"], aiTags: ["商业化", "爆款结构", "强转化"], defaultStatus: "selected" },
      { id: "vc4", date: "2026-03-26", title: "一个人 48 小时做 MVP，最容易卡在哪三步？", creator: "一人产品研究所", platform: "bilibili", publishTime: "19:10", heat: 89, engagementScore: 84, stats: { likes: "7.8k", comments: "650", saves: "3.5k", shares: "240" }, summary: "用户对需求收敛、上线节奏和反馈回路最感兴趣，适合做流程内容。", sourceType: "creator", matchedKeywords: ["MVP"], matchedCreators: ["一人产品研究所"], aiTags: ["流程拆解", "MVP", "教程拆解"], defaultStatus: "candidate" },
      { id: "vc5", date: "2026-03-25", title: "为什么你的 AI 原型看起来像 demo，而不是产品", creator: "增长造物", platform: "xiaohongshu", publishTime: "11:30", heat: 84, engagementScore: 79, stats: { likes: "6.2k", comments: "480", saves: "3.0k", shares: "210" }, summary: "对包装质感做反面案例拆解，适合延展成前后对比内容。", sourceType: "creator", matchedKeywords: ["AI 原型"], matchedCreators: ["增长造物"], aiTags: ["案例拆解", "包装升级", "对比改造"], defaultStatus: "candidate" },
      { id: "vc6", date: "2026-03-24", title: "今天我只做一件事：把一个想法做成可点开的 demo", creator: "30 秒做产品", platform: "douyin", publishTime: "09:15", heat: 76, engagementScore: 75, stats: { likes: "1.7w", comments: "520", saves: "2.2k", shares: "390" }, summary: "强节奏叙事适合吸引新用户，但深度不够，需要侧栏承接。", sourceType: "creator", matchedKeywords: ["vibe coding"], matchedCreators: ["30 秒做产品"], aiTags: ["节奏叙事", "AI 原型", "短视频钩子"], defaultStatus: "ignored" },
      { id: "vc7", date: "2026-03-29", title: "公众号复盘：为什么 AI 原型要先证明能卖，再谈功能完整", creator: "独立开发周刊", platform: "wechatOfficial", publishTime: "08:20", heat: 85, engagementScore: 82, stats: { likes: "2.9k", comments: "410", saves: "2.6k", shares: "380" }, summary: "公众号长文更适合拆开讲商业化叙事和成交路径，非常适合进入选题分析。", sourceType: "creator", matchedKeywords: ["AI 原型", "独立开发"], matchedCreators: ["独立开发周刊"], aiTags: ["商业化复盘", "长文沉淀", "选题分析"], defaultStatus: "candidate" }
    ],
    reports: [{ date: "03-29", headline: "VibeCoding 赛道今天更适合做包装与商业化方向的跟进", focus: "最新报告", hotSignals: ["商业化表达依然有效", "首页包装继续稳定", "微博采集延迟导致报告稍晚"], aiSummary: "今天更适合跟进包装、变现和可卖原型，而不是泛灵感内容。", topics: [{ id: "vt1", title: "可卖原型结构", description: "强调时间压缩与结果导向。", whyNow: "转化叙事依旧有效。", potential: "适合强节奏短视频。" }] }]
  }
];

function PlatformBadge({ platform }: { platform: PlatformKey }) {
  const meta = platformMeta[platform];
  return <span className="platform-badge" style={{ borderColor: meta.accent, color: meta.accent }}>{meta.label}</span>;
}

function StatusBadge({ label, tone }: { label: string; tone: "good" | "warn" | "danger" }) {
  return <span className={cn("overview-status-badge", tone)}>{label}</span>;
}

function ContentTimeline({ days, selectedDay, onSelect, viewMode }: { days: TimelineDay[]; selectedDay: string; onSelect: (date: string) => void; viewMode: ViewMode }) {
  return (
    <div className="timeline-board card-timeline-board">
      <div className="timeline-header-row compact">
        <div><span className="eyebrow">可视化时间轴</span><h3>内容池日期总览</h3></div>
        <p>点击日期卡片直接切换内容池，卡片同时展示内容量、热度和热点摘要，先扫一眼就知道该看哪天。</p>
      </div>
      <div className="timeline-card-rail">
        {days.map((day) => {
          const tone = day.peakHeat >= 90 ? "burst" : day.peakHeat >= 80 ? "high" : day.peakHeat >= 68 ? "mid" : "low";
          return (
            <button key={day.date} type="button" className={cn("timeline-summary-card", tone, selectedDay === day.date && "active")} onClick={() => onSelect(day.date)}>
              <div className="timeline-summary-topline">
                <div className="timeline-date-group"><span className="timeline-date">{day.date.slice(5)}</span><strong>{day.label}</strong></div>
                <div className="timeline-count-group"><strong>{day.totalCount} 条</strong><span>热度 {day.peakHeat}</span></div>
              </div>
              <div className="timeline-summary-body"><p>{day.highlight}</p></div>
              <div className="timeline-summary-footer"><span>{platformMeta[day.topPlatform].label}</span><span>{day.hotKeyword}</span></div>
              <div className="timeline-heat-accent" />
              <div className="timeline-tooltip card-tooltip"><strong>{day.date}</strong><span>内容数：{day.totalCount}</span><span>峰值热度：{day.peakHeat}</span><span>最热平台：{platformMeta[day.topPlatform].label}</span><span>热门关键词：{day.hotKeyword}</span><p>{day.highlight}</p><small>{viewMode === "single" ? "点击查看单天内容池" : "当前为区间浏览，点击聚焦这一天"}</small></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function SystemOverviewPanel({ categories, onEnterCategory }: { categories: MonitorCategory[]; onEnterCategory: (id: MonitorCategory["id"]) => void }) {
  const [trendMetric, setTrendMetric] = useState<OverviewTrendMetric>("peakHeat");
  const [trendRange, setTrendRange] = useState<7 | 14 | 30>(7);

  const todayTotals = useMemo(() => {
    const categoryCount = categories.length;
    const totalContents = categories.reduce((sum, category) => sum + (category.timeline[0]?.totalCount ?? 0), 0);
    const explosive = categories.reduce((sum, category) => sum + category.contents.filter((item) => item.date === category.timeline[0]?.date && item.heat >= 85).length, 0);
    const reports = categories.reduce((sum, category) => sum + category.reports.length, 0);
    const successCount = categories.filter((item) => item.runStatus.collect !== "异常").length;
    const anomalies = categories.filter((item) => item.runStatus.collect !== "正常" || item.runStatus.analysis !== "已完成").length;
    return {
      categoryCount,
      totalContents,
      explosive,
      reports,
      successRate: categoryCount > 0 ? Math.round((successCount / categoryCount) * 100) : 0,
      anomalies
    };
  }, [categories]);

  const topHeat = categories.slice().sort((a, b) => (b.timeline[0]?.peakHeat ?? 0) - (a.timeline[0]?.peakHeat ?? 0));
  const fastGrowth = categories.slice().sort((a, b) => ((b.timeline[0]?.peakHeat ?? 0) - (b.timeline[1]?.peakHeat ?? 0)) - ((a.timeline[0]?.peakHeat ?? 0) - (a.timeline[1]?.peakHeat ?? 0)));
  const mostVolume = categories.slice().sort((a, b) => (b.timeline[0]?.totalCount ?? 0) - (a.timeline[0]?.totalCount ?? 0));

  const globalTrend = useMemo(() => {
    const maxDays = Math.max(...categories.map((category) => category.timeline.length));
    return Array.from({ length: Math.min(trendRange, maxDays) }, (_, index) => {
      const date = categories[0]?.timeline[index]?.date ?? "";
      const totalCount = categories.reduce((sum, category) => sum + (category.timeline[index]?.totalCount ?? 0), 0);
      const peakHeat = Math.max(...categories.map((category) => category.timeline[index]?.peakHeat ?? 0));
      const avgHeat = Math.round(categories.reduce((sum, category) => sum + (category.timeline[index]?.averageHeat ?? 0), 0) / categories.length);
      return { date, label: index === 0 ? "今天" : index === 1 ? "昨天" : date.slice(5), totalCount, peakHeat, avgHeat };
    });
  }, [categories, trendRange]);

  const platformOverview = useMemo(() => {
    return (Object.keys(platformMeta) as PlatformKey[]).map((platform) => {
      const items = categories.flatMap((category) => category.contents.filter((item) => item.platform === platform && item.date === category.timeline[0]?.date));
      const avgHeat = items.length ? Math.round(items.reduce((sum, item) => sum + item.heat, 0) / items.length) : 0;
      return { platform, count: items.length, avgHeat, explosive: items.filter((item) => item.heat >= 85).length };
    });
  }, [categories]);

  const latestRunLabel = useMemo(() => {
    const candidates = categories
      .map((category) => category.runStatus.latestRunAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return candidates[0] ? formatDateTime(new Date(candidates[0])) : "尚未运行";
  }, [categories]);

  const nextRunLabel = useMemo(() => {
    const candidates = categories
      .map((category) => category.runStatus.nextRunAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return candidates[0] ? formatDateTime(new Date(candidates[0])) : "手动触发";
  }, [categories]);

  const strongestPlatform = platformOverview.slice().sort((a, b) => b.avgHeat - a.avgHeat)[0];
  const globalInsights = [
    {
      title: "今日建议优先关注方向",
      value: "团队迁移清单、首页包装公式、商业化表达",
      note: "优先从具备复用潜力和执行确定性的方向切入，先判断是否值得深挖。"
    },
    {
      title: "建议优先进入的分类",
      value: topHeat[0]?.name ?? "暂无",
      note: topHeat[0] ? `当前峰值热度 ${topHeat[0]?.timeline[0]?.peakHeat ?? 0}，更适合作为今天的首个深挖入口。`
        : "当前还没有足够数据给出优先分类。"
    },
    {
      title: "最值得继续跟踪的平台",
      value: strongestPlatform ? platformMeta[strongestPlatform.platform].label : "暂无",
      note: strongestPlatform ? `平均热度 ${strongestPlatform.avgHeat}，建议继续跟进该平台的增量内容。`
        : "当前没有明显领先的平台信号。"
    }
  ];

  const overviewStats = [
    { label: "监控分类数", value: todayTotals.categoryCount, note: "覆盖重点方向", icon: "分类" },
    { label: "今日采集总数", value: todayTotals.totalContents, note: "较昨日持续更新", icon: "采集" },
    { label: "今日热点数", value: todayTotals.explosive, note: "高热样本待判断", icon: "热点" },
    { label: "运行成功率", value: `${todayTotals.successRate}%`, note: todayTotals.anomalies === 0 ? "当前运行稳定" : `${todayTotals.anomalies} 项待关注`, icon: "状态" },
    { label: "已生成报告", value: todayTotals.reports, note: "支持回看总结", icon: "报告" },
    { label: "异常任务数", value: todayTotals.anomalies, note: todayTotals.anomalies === 0 ? "暂无异常" : "建议尽快处理", icon: "异常" }
  ];

  const metricValueMap: Record<OverviewTrendMetric, number[]> = {
    totalCount: globalTrend.map((day) => day.totalCount),
    peakHeat: globalTrend.map((day) => day.peakHeat),
    averageHeat: globalTrend.map((day) => day.avgHeat)
  };
  const trendPath = buildChartPath(metricValueMap[trendMetric], 560, 180);
  const latestTrend = metricValueMap[trendMetric][0] ?? 0;
  const previousTrend = metricValueMap[trendMetric][1] ?? latestTrend;
  const trendDelta = latestTrend - previousTrend;
  const trendLabelMap: Record<OverviewTrendMetric, string> = {
    totalCount: "内容量",
    peakHeat: "峰值热度",
    averageHeat: "平均热度"
  };

  return (
    <section className="overview-view">
      <section className="dashboard-header-card">
        <div className="dashboard-header-copy">
          <span className="eyebrow">Operations Home</span>
          <h2>系统总览</h2>
          <p>先看今天整体情况，再判断优先处理方向、优先进入的分类，以及接下来要继续跟进的平台。</p>
        </div>
        <div className="dashboard-header-actions">
          <div className="toolbar-group">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                className={cn("soft-pill", trendRange === days && "active")}
                onClick={() => setTrendRange(days as 7 | 14 | 30)}
              >
                近 {days} 天
              </button>
            ))}
          </div>
          <div className="toolbar-group">
            <button type="button" className="soft-pill" onClick={() => scrollToSection("overview-insights")}>查看今日摘要</button>
            <button type="button" className="soft-pill" onClick={() => scrollToSection("overview-trend")}>生成汇总</button>
          </div>
        </div>
      </section>

      <section className="overview-stats-row">
        {overviewStats.map((item) => (
          <article key={item.label} className="overview-stat-card">
            <div className="overview-stat-top">
              <span>{item.label}</span>
              <small>{item.icon}</small>
            </div>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </section>

      <div className="overview-grid top">
        <section className="overview-panel wide" id="overview-status">
          <div className="section-heading"><span>运行状态</span><small>先判断今天的任务是否健康，再决定看哪个分类</small></div>
          <div className="run-summary-strip">
            <div className="run-summary-card"><span>今日任务状态</span><strong>{todayTotals.anomalies === 0 ? "全部正常" : "部分延迟"}</strong><p>{todayTotals.anomalies === 0 ? "当前采集与分析链路稳定" : "建议优先排查异常分类"}</p></div>
            <div className="run-summary-card"><span>最近一次运行</span><strong>{latestRunLabel}</strong><p>帮助判断今天的数据是否是最新批次</p></div>
            <div className="run-summary-card"><span>下一次运行</span><strong>{nextRunLabel}</strong><p>便于安排下一轮关注和复查时间</p></div>
          </div>
          <div className="run-status-list">
            {categories.map((category) => (
              <div key={category.id} className="run-status-card">
                <div className="run-status-copy">
                  <strong>{category.name}</strong>
                  <p>{category.goal}</p>
                </div>
                <div className="run-status-meta">
                  <div className="run-status-badges">
                    <StatusBadge label={`采集${category.runStatus.collect}`} tone={category.runStatus.collect === "正常" ? "good" : category.runStatus.collect === "延迟" ? "warn" : "danger"} />
                    <StatusBadge label={`分析${category.runStatus.analysis}`} tone={category.runStatus.analysis === "已完成" ? "good" : "warn"} />
                  </div>
                  <small>{category.timeline[0]?.totalCount ?? 0} 条内容</small>
                  <button type="button" className="inline-link-button" onClick={() => onEnterCategory(category.id)}>进入详情</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overview-panel" id="overview-insights">
          <div className="section-heading"><span>AI 全局洞察</span><small>用结构化结论辅助判断，不用先读长段文字</small></div>
          <div className="overview-insight-list">
            {globalInsights.map((item) => (
              <article key={item.title} className="overview-insight-card">
                <span>{item.title}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
          <p className="overview-panel-footnote">系统总览页不直接展开单条内容，是为了先帮助你判断今天应该先看哪里，再进入具体分类执行。</p>
        </section>
      </div>

      <section className="overview-panel" id="overview-categories">
        <div className="section-heading"><span>分类总览</span><small>默认首页突出优先级，帮助快速判断今天先看哪里</small></div>
        <div className="overview-category-grid">
          {categories.map((category) => (
            <article key={category.id} className={cn("overview-category-card", category.priority === "高" && "priority-high")}>
              <div className="overview-category-head">
                <div>
                  <strong>{category.name}</strong>
                  <p>{category.goal}</p>
                </div>
                <span className={cn("priority-pill", category.priority === "高" && "high", category.priority === "中" && "mid")}>优先级 {category.priority}</span>
              </div>
              <div className="overview-category-metrics">
                <div><small>今日内容数</small><strong>{category.timeline[0]?.totalCount ?? 0}</strong></div>
                <div><small>最高热度</small><strong>{category.timeline[0]?.peakHeat ?? 0}</strong></div>
                <div><small>最热平台</small><strong>{platformMeta[category.timeline[0]?.topPlatform ?? "douyin"].label}</strong></div>
              </div>
              <p className="overview-category-summary">{category.timeline[0]?.highlight}</p>
              <div className="overview-category-actions">
                <button type="button" className="enter-category-button" onClick={() => onEnterCategory(category.id)}>进入分类</button>
                <button type="button" className="secondary-action-button" onClick={() => onEnterCategory(category.id)}>查看报告</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="overview-grid middle">
        <section className="overview-panel wide" id="overview-trend">
          <div className="section-heading">
            <span>趋势分析</span>
            <small>看热度是在抬升还是回落，识别应该继续追的方向</small>
          </div>
          <div className="chart-toolbar">
            <div className="toolbar-group">
              {[7, 14, 30].map((days) => (
                <button key={days} type="button" className={cn("soft-pill", trendRange === days && "active")} onClick={() => setTrendRange(days as 7 | 14 | 30)}>近 {days} 天</button>
              ))}
            </div>
            <div className="toolbar-group">
              {(["totalCount", "peakHeat", "averageHeat"] as OverviewTrendMetric[]).map((metric) => (
                <button key={metric} type="button" className={cn("soft-pill", trendMetric === metric && "active")} onClick={() => setTrendMetric(metric)}>
                  {trendLabelMap[metric]}
                </button>
              ))}
            </div>
          </div>
          <div className="trend-chart-card">
            <div className="trend-chart-summary">
              <div>
                <span>当前指标</span>
                <strong>{trendLabelMap[trendMetric]}</strong>
              </div>
              <div>
                <span>最新值</span>
                <strong>{latestTrend}</strong>
              </div>
              <div>
                <span>较昨日变化</span>
                <strong className={cn("trend-delta", trendDelta > 0 && "up", trendDelta < 0 && "down")}>
                  {trendDelta > 0 ? "+" : ""}{trendDelta}
                </strong>
              </div>
            </div>
            <div className="trend-chart-shell">
              <svg viewBox="0 0 560 200" className="trend-chart-svg" aria-label="趋势图">
                <defs>
                  <linearGradient id="overviewTrendStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--accent-primary-strong)" />
                    <stop offset="100%" stopColor="var(--accent-primary)" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((index) => (
                  <line key={index} x1="0" y1={20 + index * 45} x2="560" y2={20 + index * 45} className="trend-grid-line" />
                ))}
                <path d={trendPath} className="trend-chart-line" />
              </svg>
              <div className="trend-chart-labels">
                {globalTrend.map((day) => (
                  <div key={day.date}>
                    <strong>{day.label}</strong>
                    <span>{day.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="trend-insight-row">
              <p>今日 {trendLabelMap[trendMetric]} 较昨日{trendDelta >= 0 ? "提升" : "回落"} {Math.abs(trendDelta)}。</p>
              <p>{topHeat[0]?.name ?? "暂无分类"} 连续处于高热区间，值得优先复盘。</p>
              <p>{mostVolume[0]?.name ?? "暂无分类"} 的内容量最高，但仍需结合热度判断是否值得继续加码。</p>
            </div>
          </div>
        </section>

        <section className="overview-panel">
          <div className="section-heading"><span>排行榜</span><small>用更紧凑的方式看最值得关注的三类信号</small></div>
          <div className="ranking-list">
            <div className="ranking-card">
              <span>今日最热分类</span>
              <strong>{topHeat[0]?.name ?? "暂无"}</strong>
              <div className="ranking-meta"><b>{topHeat[0]?.timeline[0]?.peakHeat ?? 0}</b><small>峰值热度</small></div>
            </div>
            <div className="ranking-card">
              <span>增长最快分类</span>
              <strong>{fastGrowth[0]?.name ?? "暂无"}</strong>
              <div className="ranking-meta"><b>{((fastGrowth[0]?.timeline[0]?.peakHeat ?? 0) - (fastGrowth[0]?.timeline[1]?.peakHeat ?? 0))}</b><small>较昨日变化</small></div>
            </div>
            <div className="ranking-card">
              <span>内容最多分类</span>
              <strong>{mostVolume[0]?.name ?? "暂无"}</strong>
              <div className="ranking-meta"><b>{mostVolume[0]?.timeline[0]?.totalCount ?? 0}</b><small>今日内容数</small></div>
            </div>
          </div>
          <div className="platform-overview-grid compact">
            {platformOverview.map((item) => (
              <div key={item.platform} className="platform-overview-card">
                <div className="platform-overview-head"><strong>{platformMeta[item.platform].label}</strong><span>{platformMeta[item.platform].trend}</span></div>
                <div className="platform-overview-metrics"><span>内容 {item.count}</span><span>均热 {item.avgHeat}</span><span>爆款 {item.explosive}</span></div>
                <div className="platform-overview-bar"><div style={{ width: `${Math.min(100, item.avgHeat)}%`, backgroundColor: platformMeta[item.platform].accent }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <WechatArticlePanel />
    </section>
  );
}

function WechatArticlePanel() {
  const defaultKeyword = "人民日报";
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [result, setResult] = useState<WechatArticlePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchArticles(nextKeyword: string, page: number) {
    const normalizedKeyword = nextKeyword.trim();
    if (!normalizedKeyword) {
      setError("请输入关键词后再搜索公众号文章。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/wechat-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kw: normalizedKeyword, page, period: 7, sort_type: 1, mode: 1, type: 1 })
      });
      const payload = await parseApiResponse<WechatArticlePayload & { error?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "公众号文章获取失败，请稍后再试。");
      }

      const normalized = payload as WechatArticlePayload;
      writeWechatCache("overview", normalizedKeyword, normalized);
      setResult(normalized);
    } catch (fetchError) {
      const cached = readWechatCache("overview", normalizedKeyword);
      if (cached) {
        setResult(cached);
        setError(`上游接口当前不可用，已展示上次成功缓存。${fetchError instanceof Error ? ` 原因：${fetchError.message}` : ""}`);
      } else {
        setError(fetchError instanceof Error ? fetchError.message : "公众号文章获取失败，请稍后再试。");
      }
    } finally {
      setLoading(false);
    }
  }

  const articles = result?.articles ?? [];
  const pagination = result?.pagination;

  return (
    <section className="overview-panel wechat-monitor-panel">
      <div className="section-heading"><span>公众号文章监控</span><small>首页直接按关键词拉取公众号文章，辅助选题监控</small></div>
      <div className="wechat-monitor-toolbar">
        <div className="wechat-search-shell">
          <span>关键词</span>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入公众号监控关键词，例如：人民日报" />
        </div>
        <button type="button" className="wechat-search-button" disabled={loading} onClick={() => void fetchArticles(keyword, 1)}>{loading ? "抓取中..." : "获取公众号文章"}</button>
      </div>

      <div className="wechat-summary-grid">
        <div className="wechat-summary-card"><span>当前关键词</span><strong>{result?.keyword ?? keyword}</strong></div>
        <div className="wechat-summary-card"><span>当前页返回</span><strong>{pagination?.dataNumber ?? articles.length} 篇</strong></div>
        <div className="wechat-summary-card"><span>总文章数</span><strong>{pagination?.total ?? 0}</strong></div>
        <div className="wechat-summary-card"><span>页码</span><strong>{pagination ? `${pagination.page} / ${pagination.totalPage}` : "-"}</strong></div>
      </div>

      {error ? <div className="wechat-feedback error">{error}</div> : null}
      {!error && loading && articles.length === 0 ? <div className="wechat-feedback">正在请求公众号文章数据...</div> : null}
      {!error && !loading && articles.length === 0 ? <div className="wechat-feedback">输入关键词后点击“获取公众号文章”再发起查询，避免页面加载时被上游接口异常打断。测试阶段每次最多获取 {result?.fetchLimit ?? 10} 条。</div> : null}

      {articles.length > 0 ? (
        <>
          <div className="wechat-article-list">
            {articles.map((article) => {
              const plainContent = article.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              return (
                <article key={`${article.ghid}-${article.publishTime}-${article.title}`} className="wechat-article-card">
                  <div className="wechat-article-head">
                    <div>
                      <div className="wechat-article-meta"><strong>{article.wxName}</strong><span>{article.publishTimeText || article.updateTimeText}</span>{article.isOriginal === 1 ? <span className="origin-pill">原创</span> : null}</div>
                      <h4>{article.title}</h4>
                    </div>
                    <a href={article.url || article.shortLink} target="_blank" rel="noreferrer" className="wechat-link">查看原文</a>
                  </div>
                  <p>{plainContent || "该文章未返回摘要内容，可直接点击原文查看。"}</p>
                  <div className="wechat-metrics-row">
                    <span>阅读 {article.read || 0}</span>
                    <span>点赞 {article.praise || 0}</span>
                    <span>在看 {article.looking || 0}</span>
                    <span>{article.classify || article.ipWording || "公众号文章"}</span>
                  </div>
                </article>
              );
            })}
          </div>

          {pagination && pagination.totalPage > 1 ? (
            <div className="wechat-pagination-row">
              <button type="button" className="soft-pill" disabled={loading || pagination.page <= 1} onClick={() => void fetchArticles(result?.keyword ?? keyword, pagination.page - 1)}>上一页</button>
              <span>当前第 {pagination.page} 页，共 {pagination.totalPage} 页</span>
              <button type="button" className="soft-pill" disabled={loading || pagination.page >= pagination.totalPage} onClick={() => void fetchArticles(result?.keyword ?? keyword, pagination.page + 1)}>下一页</button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function TopicWorkspacePanel({
  topics,
  activeTopicId,
  onSelectTopic,
  topicDraft,
  onTopicDraftChange,
  onCreateTopic,
  feedback,
  activeTopic,
  onUpdateTopic,
  onDeleteTopic
}: {
  topics: TopicCard[];
  activeTopicId: string;
  onSelectTopic: (topicId: string) => void;
  topicDraft: TopicDraft;
  onTopicDraftChange: (field: keyof TopicDraft, value: string) => void;
  onCreateTopic: () => void;
  feedback: string;
  activeTopic: TopicCard | null;
  onUpdateTopic: (field: "title" | "description" | "goal" | "status", value: string) => void;
  onDeleteTopic: () => void;
}) {
  const [topicStatusFilter, setTopicStatusFilter] = useState<TopicStatus | "all">("all");
  const visibleTopics = topicStatusFilter === "all" ? topics : topics.filter((topic) => topic.status === topicStatusFilter);

  return (
    <div className="topic-workspace-card">
      <div className="topic-workspace-grid">
        <div>
          <div className="section-heading"><span>选题池</span><small>先手动建选题，再从内容池归集文章</small></div>
          <div className="topic-filter-row">
            <button type="button" className={cn("soft-pill", topicStatusFilter === "all" && "active")} onClick={() => setTopicStatusFilter("all")}>全部</button>
            {(Object.keys(topicStatusMeta) as TopicStatus[]).map((status) => (
              <button key={status} type="button" className={cn("soft-pill", topicStatusFilter === status && "active")} onClick={() => setTopicStatusFilter(status)}>
                {topicStatusMeta[status].label}
              </button>
            ))}
          </div>
          {visibleTopics.length > 0 ? (
            <div className="topic-chip-list">
              {visibleTopics.map((topic) => (
                <button key={topic.id} type="button" className={cn("topic-chip", activeTopicId === topic.id && "active")} onClick={() => onSelectTopic(topic.id)}>
                  <strong>{topic.title}</strong>
                  <span>{topic.description || topic.goal || "还没有补充选题说明"}</span>
                  <div className="topic-chip-meta">
                    <small>{topic.articleCount} 条内容</small>
                    <small className={cn("topic-status-pill", topicStatusMeta[topic.status].tone)}>{topicStatusMeta[topic.status].label}</small>
                  </div>
                  <small>最近分析：{topic.lastAnalysisAt ? topic.lastAnalysisAt.slice(5, 16).replace("T", " ") : "未分析"}</small>
                </button>
              ))}
            </div>
          ) : <div className="empty-state compact"><strong>{topics.length > 0 ? "当前筛选下没有选题" : "还没有选题卡片"}</strong><p>{topics.length > 0 ? "试试切换状态筛选，或者创建新的选题。" : "先创建一个选题，后面才能持续归集文章和做 AI 洞察。"}</p></div>}
        </div>
        <div className="topic-creator-card">
          <div className="section-heading"><span>新建选题</span><small>创建独立选题卡片</small></div>
          <div className="topic-form-grid">
            <input value={topicDraft.title} onChange={(event) => onTopicDraftChange("title", event.target.value)} placeholder="选题标题，例如：Claude Code 团队落地清单" />
            <textarea value={topicDraft.description} onChange={(event) => onTopicDraftChange("description", event.target.value)} placeholder="选题简介：为什么要做这个选题" rows={3} />
            <input value={topicDraft.goal} onChange={(event) => onTopicDraftChange("goal", event.target.value)} placeholder="目标，例如：沉淀公众号长文 / 做短视频对比测评" />
            <button type="button" className="wechat-search-button" onClick={onCreateTopic}>创建选题</button>
          </div>
          {activeTopic ? (
            <div className="topic-editor-panel">
              <div className="section-heading"><span>当前选题设置</span><small>支持重命名、改状态、删除</small></div>
              <div className="topic-form-grid compact-form-grid">
                <input value={activeTopic.title} onChange={(event) => onUpdateTopic("title", event.target.value)} placeholder="选题标题" />
                <textarea value={activeTopic.description} onChange={(event) => onUpdateTopic("description", event.target.value)} rows={3} placeholder="选题简介" />
                <input value={activeTopic.goal} onChange={(event) => onUpdateTopic("goal", event.target.value)} placeholder="选题目标" />
                <select value={activeTopic.status} onChange={(event) => onUpdateTopic("status", event.target.value)}>
                  <option value="draft">draft</option>
                  <option value="collecting">collecting</option>
                  <option value="ready">ready</option>
                  <option value="analyzed">analyzed</option>
                </select>
                <div className="topic-editor-actions">
                  <button type="button" className="soft-pill active" onClick={onDeleteTopic}>删除当前选题</button>
                </div>
              </div>
            </div>
          ) : null}
          {feedback ? <div className="report-inline-note topic-feedback"><span>{feedback}</span></div> : null}
        </div>
      </div>
    </div>
  );
}
function ReportTab({
  category,
  topics,
  activeTopicId,
  onSelectTopic,
  selectedTopicItems,
  topicDraft,
  onTopicDraftChange,
  onCreateTopic,
  analysisState,
  onRunAnalysis,
  topicFeedback,
  onUpdateTopic,
  onDeleteTopic
}: {
  category: MonitorCategory;
  topics: TopicCard[];
  activeTopicId: string;
  onSelectTopic: (topicId: string) => void;
  selectedTopicItems: ContentItem[];
  topicDraft: TopicDraft;
  onTopicDraftChange: (field: keyof TopicDraft, value: string) => void;
  onCreateTopic: () => void;
  analysisState: TopicAnalysisState;
  onRunAnalysis: () => void;
  topicFeedback: string;
  onUpdateTopic: (field: "title" | "description" | "goal" | "status", value: string) => void;
  onDeleteTopic: () => void;
}) {
  const report = category.reports[0];
  const result = analysisState.result;
  const activeTopic = topics.find((item) => item.id === activeTopicId) ?? null;

  return (
    <section className="report-view upgraded-report-view">
      <TopicWorkspacePanel
        topics={topics}
        activeTopicId={activeTopicId}
        onSelectTopic={onSelectTopic}
        topicDraft={topicDraft}
        onTopicDraftChange={onTopicDraftChange}
        onCreateTopic={onCreateTopic}
        feedback={topicFeedback}
        activeTopic={activeTopic}
        onUpdateTopic={onUpdateTopic}
        onDeleteTopic={onDeleteTopic}
      />

      <div className="report-card report-control-card">
        <div className="report-control-top">
          <div>
            <span className="eyebrow">AI 选题分析</span>
            <h3>{activeTopic ? activeTopic.title : report.headline}</h3>
            <p className="report-summary">
              {activeTopic
                ? activeTopic.description || activeTopic.goal || "选中一个选题后，系统会围绕该选题下的文章集合做 AI 摘录和洞察。"
                : "先创建或选择一个选题，再对该选题下的文章集合做 AI 分析。"}
            </p>
          </div>
          <button
            type="button"
            className="wechat-search-button"
            disabled={analysisState.loading || !activeTopic || selectedTopicItems.length === 0}
            onClick={onRunAnalysis}
          >
            {analysisState.loading ? "分析中..." : result ? "重新分析" : "开始 AI 分析"}
          </button>
        </div>
        <div className="report-control-metrics">
          <div className="signal-card"><span>当前选题</span><strong>{activeTopic ? activeTopic.title : "未选择"}</strong></div>
          <div className="signal-card"><span>选题素材</span><strong>{selectedTopicItems.length} 条</strong></div>
          <div className="signal-card"><span>模型</span><strong>{result?.model ?? "待执行"}</strong></div>
          <div className="signal-card"><span>洞察输出</span><strong>{result?.topicInsights.length ?? 0} 条</strong></div>
        </div>
        {analysisState.error ? <div className="wechat-feedback error">{analysisState.error}</div> : null}
        {!analysisState.error && analysisState.loading ? (
          <div className="wechat-feedback">AI 正在先摘录当前选题下的文章，再聚合生成结构化选题洞察，请稍候。</div>
        ) : null}
      </div>

      <div className="report-card analysis-candidate-card">
        <div className="section-heading"><span>当前选题素材</span><small>{activeTopic ? `${selectedTopicItems.length} 条已归集内容` : "请先选择一个选题"}</small></div>
        {activeTopic && selectedTopicItems.length > 0 ? (
          <div className="analysis-candidate-list">
            {selectedTopicItems.map((item) => (
              <article key={item.id} className="analysis-candidate-item">
                <div>
                  <div className="pool-card-meta-row"><PlatformBadge platform={item.platform} /><span>{item.creator}</span><span>{item.date.slice(5)} {item.publishTime}</span></div>
                  <h4>{item.title}</h4>
                  <p>{item.summary}</p>
                </div>
                <div className="analysis-candidate-score"><span>热度 {item.heat}</span><span>互动率 {item.engagementScore}</span></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><strong>{activeTopic ? "当前选题还没有归集内容" : "还没有选择选题"}</strong><p>{activeTopic ? "去内容池里把文章加入这个选题后，再回来执行 AI 分析。" : "先创建或选择选题，再把不同平台文章归集进来。"}</p></div>
        )}
        <div className="report-inline-note"><strong>两阶段分析</strong><span>当前版本优先分析当前选题下热度最高的 5 篇公众号文章。第一步先基于全文做结构化摘录，第二步再基于摘录结果产出至少 5 条选题洞察。</span></div>
      </div>

      <div className="report-grid">
        <div className="report-card article-insight-card">
          <div className="section-heading"><span>单篇摘录</span><small>{result?.articleInsights.length ?? 0} 条结构化摘要</small></div>
          {result?.articleInsights.length ? (
            <div className="article-insight-list">
              {result.articleInsights.map((item) => (
                <article key={item.articleId} className="article-insight-item">
                  <h4>{item.title}</h4>
                  <p>{item.summary}</p>
                  <div className="tag-row">{(item.keywords ?? []).map((keyword) => <span key={keyword} className="tag-chip keyword">{keyword}</span>)}</div>
                  <div className="article-insight-block"><strong>关键信息</strong><ul>{(item.keyPoints ?? []).map((point) => <li key={point}>{point}</li>)}</ul></div>
                  <div className="article-insight-block"><strong>文章亮点</strong><ul>{(item.highlights ?? []).map((point) => <li key={point}>{point}</li>)}</ul></div>
                  <div className="article-insight-block"><strong>原文关键信号</strong><ul>{(item.originalSignals ?? []).map((point) => <li key={point}>{point}</li>)}</ul></div>
                  <div className="article-insight-block"><strong>关键原文片段</strong><ul>{(item.sourceSnippets ?? []).map((point) => <li key={point}>{point}</li>)}</ul></div>
                  <div className="article-insight-meta"><span>钩子：{item.hook}</span><span>内容角度：{item.contentAngle}</span><span>适配平台：{(item.platformFit ?? []).join("、")}</span></div>
                </article>
              ))}
            </div>
          ) : <div className="empty-state"><strong>还没有生成单篇摘录</strong><p>点击“开始 AI 分析”后，系统会优先对当前选题下热度最高的公众号文章做全文结构化摘录。</p></div>}
        </div>

        <div className="report-card topic-insight-card">
          <div className="section-heading"><span>选题洞察</span><small>{result?.topicInsights.length ?? 0} 条结构化方向</small></div>
          {result?.topicInsights.length ? (
            <div className="topic-insight-list">
              {result.topicInsights.map((item) => (
                <article key={item.id} className="topic-insight-item">
                  <h4>{item.title}</h4>
                  <p>{item.summary}</p>
                  <div className="topic-insight-block"><strong>为什么现在值得做</strong><p>{item.whyNow}</p></div>
                  <div className="topic-insight-block"><strong>增长空间</strong><p>{item.growthPotential}</p></div>
                  <div className="topic-insight-block"><strong>目标受众</strong><p>{item.targetAudience}</p></div>
                  <div className="topic-insight-block"><strong>内容展开建议</strong><p>{item.contentBlueprint}</p></div>
                  <div className="topic-insight-block"><strong>亮点拆解</strong><ul>{(item.highlightPoints ?? []).map((point) => <li key={point}>{point}</li>)}</ul></div>
                  <div className="tag-row">{(item.suggestedPlatforms ?? []).map((platform) => <span key={platform} className="tag-chip ai">{platform}</span>)}</div>
                  <small>关联内容：{(item.relatedArticleIds ?? []).join("、")}</small>
                </article>
              ))}
            </div>
          ) : <div className="empty-state"><strong>还没有生成选题洞察</strong><p>分析完成后，这里会至少输出 5 条结构化的选题方向，方便后续深入研究。</p></div>}
        </div>
      </div>
    </section>
  );
}
function SettingsTab({
  draft,
  onScheduleTypeChange,
  onRunTimeChange,
  onScheduleWeekdayChange,
  onTogglePlatform,
  onKeywordAdd,
  onImportMatchedKeywords,
  onKeywordRemove,
  keywordDraft,
  onKeywordDraftChange,
  creatorDraft,
  onCreatorDraftChange,
  onCreatorAdd,
  onCreatorRemove,
  onSave,
  onSync,
  onDeleteCategory,
  deleteDisabled,
  importableKeywordCount,
  feedback,
  categoryFeedback,
  loading
}: {
  draft: CategorySettingsDraft;
  onScheduleTypeChange: (value: ScheduleType) => void;
  onRunTimeChange: (value: string) => void;
  onScheduleWeekdayChange: (value: number) => void;
  onTogglePlatform: (platform: PlatformKey) => void;
  onKeywordAdd: () => void;
  onImportMatchedKeywords: () => void;
  onKeywordRemove: (keyword: string) => void;
  keywordDraft: string;
  onKeywordDraftChange: (value: string) => void;
  creatorDraft: MonitorCategory["creators"][number];
  onCreatorDraftChange: (field: keyof MonitorCategory["creators"][number], value: string) => void;
  onCreatorAdd: () => void;
  onCreatorRemove: (name: string) => void;
  onSave: () => void;
  onSync: () => void;
  onDeleteCategory: () => void;
  deleteDisabled: boolean;
  importableKeywordCount: number;
  feedback: string;
  categoryFeedback: string;
  loading: boolean;
}) {
  return (
    <section className="settings-view">
      <div className="settings-grid topic-settings-grid">
        <div className="settings-card">
          <div className="section-heading"><span>运行时间</span><small>支持手动、每天或每周定时运行</small></div>
          <div className="schedule-editor-row">
            <select value={draft.scheduleType} onChange={(event) => onScheduleTypeChange(event.target.value as ScheduleType)}>
              <option value="manual">手动触发</option>
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
            </select>
            {draft.scheduleType === "weekly" ? (
              <select value={draft.scheduleWeekday} onChange={(event) => onScheduleWeekdayChange(Number(event.target.value))}>
                {weekdayOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            ) : null}
            <input type="time" value={draft.runTime} onChange={(event) => onRunTimeChange(event.target.value)} disabled={draft.scheduleType === "manual"} />
            <div className="schedule-preview-card">
              <strong>{formatCadence(draft.scheduleType, draft.runTime, draft.scheduleWeekday)}</strong>
              <p>{draft.scheduleType === "manual" ? "适合暂时不做定时抓取，只在需要时手动同步内容。" : "保存后侧边导航和分类总览都会显示真实的调度方式与时间。"}</p>
              <small>最近一次运行：{draft.lastRunAt ? formatDateTime(new Date(draft.lastRunAt)) : "尚未运行"}</small>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="section-heading"><span>监控平台</span><small>按分类独立配置采集范围</small></div>
          <div className="settings-list">
            {draft.platforms.map((platform) => (
              <button key={platform.key} type="button" className="settings-row editable-row" onClick={() => onTogglePlatform(platform.key)}>
                <div><strong>{platformMeta[platform.key].label}</strong><p>{platform.note}</p></div>
                <div className="settings-status"><span className={cn("status-pill", platform.enabled && "active")}>{platform.enabled ? "已启用" : "已关闭"}</span><small>{platform.volume}</small></div>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <div className="section-heading"><span>对标关键词</span><small>支持多关键词并行监控</small></div>
          <div className="keyword-editor-row">
            <input value={keywordDraft} onChange={(event) => onKeywordDraftChange(event.target.value)} placeholder="新增关键词，例如：Claude Code 团队落地" />
            <button type="button" className="soft-pill active" onClick={onKeywordAdd}>添加关键词</button>
            <button type="button" className="soft-pill" onClick={onImportMatchedKeywords}>一键导入当前内容命中关键词{importableKeywordCount > 0 ? `（${importableKeywordCount}）` : ""}</button>
          </div>
          <div className="keyword-cloud editable-cloud">{draft.keywords.map((keyword) => <button key={keyword} type="button" className="keyword-chip removable" onClick={() => onKeywordRemove(keyword)}>{keyword}<span>×</span></button>)}</div>
        </div>

        <div className="settings-card full-width">
          <div className="section-heading"><span>对标博主</span><small>新增后会作为内容池匹配维度</small></div>
          <div className="creator-form-grid">
            <input value={creatorDraft.name} onChange={(event) => onCreatorDraftChange("name", event.target.value)} placeholder="博主/账号名" />
            <select value={creatorDraft.platform} onChange={(event) => onCreatorDraftChange("platform", event.target.value)}>
              {(Object.keys(platformMeta) as PlatformKey[]).map((platform) => <option key={platform} value={platform}>{platformMeta[platform].label}</option>)}
            </select>
            <input value={creatorDraft.style} onChange={(event) => onCreatorDraftChange("style", event.target.value)} placeholder="内容风格，例如：案例复盘型" />
            <input value={creatorDraft.updateRate} onChange={(event) => onCreatorDraftChange("updateRate", event.target.value)} placeholder="更新频率，例如：日更" />
            <button type="button" className="soft-pill active" onClick={onCreatorAdd}>添加博主</button>
          </div>
          <div className="creator-list">{draft.creators.map((creator) => <button key={`${creator.platform}-${creator.name}`} type="button" className="creator-chip" onClick={() => onCreatorRemove(creator.name)}><strong>{creator.name}</strong><span>{platformMeta[creator.platform].label}</span><small>{creator.style}</small><em>×</em></button>)}</div>
        </div>
      </div>
      <div className="settings-action-row">
        <button type="button" className="wechat-search-button" onClick={onSave} disabled={loading}>{loading ? "保存中..." : "保存设置"}</button>
        <button type="button" className="soft-pill active" onClick={onSync}>保存并同步数据</button>
        <button type="button" className="ghost-button danger-ghost-button" onClick={onDeleteCategory} disabled={deleteDisabled}>删除当前分类</button>
        {feedback ? <div className="report-inline-note topic-feedback"><span>{feedback}</span></div> : null}
        {categoryFeedback ? <div className="report-inline-note topic-feedback"><span>{categoryFeedback}</span></div> : null}
      </div>
    </section>
  );
}

function toggleStatus(current: PoolStatus): PoolStatus {
  if (current === "candidate") return "selected";
  if (current === "selected") return "ignored";
  return "candidate";
}
export default function Page() {
  const [activeView, setActiveView] = useState<TopLevelView>("system-overview");
  const [activeTab, setActiveTab] = useState<TabKey>("content");
  const [activePlatform, setActivePlatform] = useState<PlatformOrAll>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("7d");
  const [viewMode, setViewMode] = useState<ViewMode>("range");
  const [searchValue, setSearchValue] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("heat");
  const [selectedDay, setSelectedDay] = useState(monitorCategories[0].timeline[0].date);
  const [itemStatuses, setItemStatuses] = useState<Record<string, PoolStatus>>({});
  const [persistedContents, setPersistedContents] = useState<Record<string, ContentItem[]>>({ claudecode: [], vibecoding: [] });
  const [categorySettings, setCategorySettings] = useState<Record<string, CategorySettingsDraft>>({
    claudecode: toSettingsDraft(monitorCategories[0]),
    vibecoding: toSettingsDraft(monitorCategories[1])
  });
  const [settingsDrafts, setSettingsDrafts] = useState<Record<string, CategorySettingsDraft>>({
    claudecode: toSettingsDraft(monitorCategories[0]),
    vibecoding: toSettingsDraft(monitorCategories[1])
  });
  const [keywordDrafts, setKeywordDrafts] = useState<Record<string, string>>({ claudecode: "", vibecoding: "" });
  const [creatorDrafts, setCreatorDrafts] = useState<Record<string, MonitorCategory["creators"][number]>>({
    claudecode: createEmptyCreatorDraft(),
    vibecoding: createEmptyCreatorDraft()
  });
  const [settingsFeedback, setSettingsFeedback] = useState<Record<string, string>>({ claudecode: "", vibecoding: "" });
  const [settingsSaving, setSettingsSaving] = useState<Record<string, boolean>>({ claudecode: false, vibecoding: false });
  const [topicsByCategory, setTopicsByCategory] = useState<Record<string, TopicCard[]>>({ claudecode: [], vibecoding: [] });
  const [activeTopicIdByCategory, setActiveTopicIdByCategory] = useState<Record<string, string>>({ claudecode: "", vibecoding: "" });
  const [topicDrafts, setTopicDrafts] = useState<Record<string, TopicDraft>>({ claudecode: createEmptyTopicDraft(), vibecoding: createEmptyTopicDraft() });
  const [topicFeedback, setTopicFeedback] = useState<Record<string, string>>({ claudecode: "", vibecoding: "" });
  const [topicPickerItemId, setTopicPickerItemId] = useState<string>("");
  const [topicAnalysisState, setTopicAnalysisState] = useState<Record<string, TopicAnalysisState>>({});
  const [customCategories, setCustomCategories] = useState<MonitorCategory[]>([]);
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<string[]>([]);
  const [hiddenCategoriesReady, setHiddenCategoriesReady] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState("");
  const [wechatPoolState, setWechatPoolState] = useState<Record<string, WechatSyncState>>({
    claudecode: { loading: false, error: "", keyword: "", items: [] },
    vibecoding: { loading: false, error: "", keyword: "", items: [] }
  });

  const visibleCategories = useMemo(
    () => hiddenCategoriesReady ? [...monitorCategories, ...customCategories].filter((category) => !hiddenCategoryIds.includes(category.id)) : [],
    [customCategories, hiddenCategoriesReady, hiddenCategoryIds]
  );
  const rawActiveCategory = useMemo(
    () => visibleCategories.find((item) => item.id === activeView) ?? visibleCategories[0] ?? monitorCategories[0],
    [activeView, visibleCategories]
  );
  const activeCategory = useMemo(() => mergeCategorySettings(rawActiveCategory, categorySettings[rawActiveCategory.id]), [categorySettings, rawActiveCategory]);
  const isSystemOverview = activeView === "system-overview";
  const activeWechatState = wechatPoolState[activeCategory.id];
  const activeTopics = topicsByCategory[activeCategory.id] ?? [];
  const activeTopicId = activeTopicIdByCategory[activeCategory.id] || activeTopics[0]?.id || "";
  const activeTopic = activeTopics.find((item) => item.id === activeTopicId) ?? null;
  const activeTopicAnalysisState = topicAnalysisState[activeTopicId] ?? { loading: false, error: "", result: null };
  const categoryContentSource = persistedContents[activeCategory.id]?.length ? persistedContents[activeCategory.id] : rawActiveCategory.contents;
  const mergedContents = useMemo(() => dedupeContents([...categoryContentSource, ...(activeWechatState?.items ?? [])]), [activeWechatState, categoryContentSource]);

  useEffect(() => {
    try {
      const storedCustomCategories = window.localStorage.getItem(customCategoryStorageKey);
      if (storedCustomCategories) {
        setCustomCategories(JSON.parse(storedCustomCategories) as MonitorCategory[]);
      }

      const stored = window.localStorage.getItem(hiddenCategoryStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const next = [...monitorCategories, ...(storedCustomCategories ? (JSON.parse(storedCustomCategories) as MonitorCategory[]) : [])]
          .map((category) => category.id)
          .filter((id) => parsed.includes(id)) as MonitorCategory["id"][];
        setHiddenCategoryIds(next);
      }
    } catch {
      setHiddenCategoryIds([]);
    } finally {
      setHiddenCategoriesReady(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(hiddenCategoryStorageKey, JSON.stringify(hiddenCategoryIds));
  }, [hiddenCategoryIds]);

  useEffect(() => {
    window.localStorage.setItem(customCategoryStorageKey, JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    if (!visibleCategories.length) return;

    setPersistedContents((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = [];
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setCategorySettings((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = toSettingsDraft(category);
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setSettingsDrafts((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = toSettingsDraft(category);
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setKeywordDrafts((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = "";
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setCreatorDrafts((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = createEmptyCreatorDraft();
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setSettingsFeedback((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = "";
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setSettingsSaving((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = false;
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setTopicsByCategory((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = [];
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setActiveTopicIdByCategory((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = "";
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setTopicDrafts((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = createEmptyTopicDraft();
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setTopicFeedback((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = "";
          changed = true;
        }
      });
      return changed ? next : current;
    });

    setWechatPoolState((current) => {
      const next = { ...current };
      let changed = false;
      visibleCategories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = { loading: false, error: "", keyword: "", items: [] };
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [visibleCategories]);

  useEffect(() => {
    if (activeView === "system-overview") return;
    if (visibleCategories.some((category) => category.id === activeView)) return;
    setActiveView(visibleCategories[0]?.id ?? "system-overview");
  }, [activeView, visibleCategories]);

  async function persistCategoryContents(categoryId: string, items: ContentItem[]) {
    const response = await fetch("/api/category-contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, items: buildStoredContentPayload(categoryId, items) })
    });
    const payload = await parseApiResponse<{ contents: ContentItem[]; error?: string }>(response);
    if (!response.ok) {
      throw new Error(payload.error ?? "保存内容池失败。");
    }
    setPersistedContents((current) => ({ ...current, [categoryId]: payload.contents }));
  }

  async function refreshCategoryContents(categoryId: string) {
    const response = await fetch(`/api/category-contents?categoryId=${categoryId}`);
    const payload = await parseApiResponse<{ contents: ContentItem[]; error?: string }>(response);
    if (response.ok) {
      const normalizedContents = payload.contents.map((item) => normalizeContentItem(item));
      const syncedWechatItems = normalizedContents.filter((item) => item.id.startsWith("wechat-"));

      setPersistedContents((current) => ({ ...current, [categoryId]: normalizedContents }));
      if (syncedWechatItems.length > 0) {
        setWechatPoolState((current) => ({
          ...current,
          [categoryId]: {
            ...(current[categoryId] ?? { loading: false, error: "", keyword: "", items: [] }),
            loading: false,
            error: current[categoryId]?.error ?? "",
            keyword: current[categoryId]?.keyword ?? "",
            items: syncedWechatItems,
            fetchedAt: current[categoryId]?.fetchedAt
          }
        }));
      }
    }
  }

  async function refreshTopics(categoryId: string) {
    const response = await fetch(`/api/topics?categoryId=${categoryId}`);
    const payload = await parseApiResponse<{ topics: TopicCard[]; error?: string }>(response);
    if (response.ok) {
      setTopicsByCategory((current) => ({ ...current, [categoryId]: payload.topics }));
      setActiveTopicIdByCategory((current) => ({ ...current, [categoryId]: current[categoryId] || payload.topics[0]?.id || "" }));
    }
  }

  async function refreshCategorySettings(categoryId: string) {
    const response = await fetch(`/api/category-settings?categoryId=${categoryId}`);
    const payload = await parseApiResponse<{ settings: CategorySettingsDraft | null; error?: string }>(response);
    if (response.ok && payload.settings) {
      setCategorySettings((current) => ({ ...current, [categoryId]: payload.settings! }));
      setSettingsDrafts((current) => ({ ...current, [categoryId]: payload.settings! }));
    }
  }

  async function loadTopicAnalysis(topicId: string) {
    if (!topicId) return;
    const response = await fetch(`/api/topics?topicId=${topicId}`);
    const payload = await parseApiResponse<{ analysis: TopicAnalysisResult | null; error?: string }>(response);
    if (response.ok) {
      setTopicAnalysisState((current) => ({ ...current, [topicId]: { loading: false, error: "", result: payload.analysis } }));
    }
  }

  useEffect(() => {
    if (isSystemOverview) return;
    void (async () => {
      await persistCategoryContents(rawActiveCategory.id, rawActiveCategory.contents);
      await Promise.all([
        refreshCategorySettings(rawActiveCategory.id),
        refreshTopics(rawActiveCategory.id),
        refreshCategoryContents(rawActiveCategory.id)
      ]);
    })();
  }, [isSystemOverview, rawActiveCategory]);

  useEffect(() => {
    if (activeTopicId) {
      void loadTopicAnalysis(activeTopicId);
    }
  }, [activeTopicId]);

  async function syncWechatArticles(category: MonitorCategory, force = false) {
    if (!category.platforms.some((platform) => platform.key === "wechatOfficial" && platform.enabled)) {
      setWechatPoolState((state) => ({
        ...state,
        [category.id]: {
          ...(state[category.id] ?? { loading: false, error: "", keyword: "", items: [] }),
          loading: false,
          error: "当前分类还没有启用“微信公众号”平台，请先到“监控设置”里打开后再同步。",
          items: state[category.id]?.items ?? [],
          keyword: state[category.id]?.keyword ?? ""
        }
      }));
      return;
    }

    const keywords = Array.from(new Set((category.keywords.length ? category.keywords : [category.name]).map((item) => item.trim()).filter(Boolean)));
    const current = wechatPoolState[category.id];
    if (!force && (current?.loading || current?.items.length > 0)) return;

    setWechatPoolState((state) => ({
      ...state,
      [category.id]: { ...(state[category.id] ?? { loading: false, error: "", keyword: keywords[0] ?? category.name, items: [] }), loading: true, error: "", keyword: keywords.join(" / ") }
    }));

    try {
      const payloads: WechatArticlePayload[] = [];
      for (const keyword of keywords) {
        const response = await fetch("/api/wechat-articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kw: keyword, page: 1, period: 7, sort_type: 1, mode: 1, type: 1 })
        });
        const payload = await parseApiResponse<WechatArticlePayload & { error?: string }>(response);
        if (!response.ok) {
          throw new Error(payload.error ?? `关键词「${keyword}」同步失败。`);
        }
        const normalized = payload as WechatArticlePayload;
        payloads.push(normalized);
        writeWechatCache(category.id, keyword, normalized);
      }

      const mergedPayload: WechatArticlePayload = {
        keyword: keywords.join(" / "),
        articles: payloads.flatMap((payload) => payload.articles).filter((article, index, array) => array.findIndex((item) => `${item.ghid}-${item.publishTime}-${item.title}` === `${article.ghid}-${article.publishTime}-${article.title}`) === index).slice(0, 10),
        pagination: {
          page: 1,
          dataNumber: Math.min(10, payloads.reduce((sum, payload) => sum + (payload.pagination?.dataNumber ?? payload.articles.length), 0)),
          total: payloads.reduce((sum, payload) => sum + (payload.pagination?.total ?? payload.articles.length), 0),
          totalPage: payloads.reduce((sum, payload) => sum + (payload.pagination?.totalPage ?? 1), 0)
        },
        requestId: payloads.map((payload) => payload.requestId).filter(Boolean).join(","),
        fetchedAt: new Date().toISOString(),
        fetchLimit: 10
      };

      const mappedItems = buildWechatContentItems(category, mergedPayload);
      await persistCategoryContents(category.id, mappedItems);
      await refreshCategoryContents(category.id);
      const lastRunAt = new Date().toISOString();
      const currentSettingsDraft = settingsDrafts[category.id] ?? categorySettings[category.id] ?? toSettingsDraft(category);
      const updatedDraft = { ...currentSettingsDraft, lastRunAt };
      const settingsResponse = await fetch("/api/category-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: category.id, ...updatedDraft })
      });
      const settingsPayload = await parseApiResponse<{ settings: CategorySettingsDraft; error?: string }>(settingsResponse);
      if (settingsResponse.ok) {
        setCategorySettings((current) => ({ ...current, [category.id]: settingsPayload.settings }));
        setSettingsDrafts((current) => ({ ...current, [category.id]: settingsPayload.settings }));
      }
      setWechatPoolState((state) => ({
        ...state,
        [category.id]: {
          loading: false,
          error: "",
          keyword: mergedPayload.keyword,
          items: mappedItems,
          fetchedAt: mergedPayload.fetchedAt
        }
      }));
    } catch (syncError) {
      const cached = readWechatCache(category.id, keywords[0] ?? category.name);
      setWechatPoolState((state) => ({
        ...state,
        [category.id]: {
          ...(state[category.id] ?? { keyword: keywords.join(" / "), items: [] }),
          loading: false,
          error: cached ? `上游接口当前不可用，已回退到上次成功缓存。${syncError instanceof Error ? ` 原因：${syncError.message}` : ""}` : (syncError instanceof Error ? syncError.message : "公众号文章同步失败，请稍后再试。"),
          items: cached ? buildWechatContentItems(category, cached) : (state[category.id]?.items ?? []),
          fetchedAt: cached?.fetchedAt ?? state[category.id]?.fetchedAt
        }
      }));
    }
  }

  async function saveCurrentSettings(syncAfterSave = false) {
    const draft = settingsDrafts[activeCategory.id];
    setSettingsSaving((current) => ({ ...current, [activeCategory.id]: true }));
    try {
      const response = await fetch("/api/category-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: activeCategory.id, ...draft })
      });
      const payload = await parseApiResponse<{ settings: CategorySettingsDraft; error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error ?? "保存监控设置失败。");
      }
      setCategorySettings((current) => ({ ...current, [activeCategory.id]: payload.settings }));
      setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: payload.settings }));
      setSettingsFeedback((current) => ({ ...current, [activeCategory.id]: syncAfterSave ? "设置已保存，正在同步数据。" : "设置已保存。" }));
      if (syncAfterSave) {
        await syncWechatArticles(mergeCategorySettings(rawActiveCategory, payload.settings), true);
      }
    } catch (error) {
      setSettingsFeedback((current) => ({ ...current, [activeCategory.id]: error instanceof Error ? error.message : "保存监控设置失败。" }));
    } finally {
      setSettingsSaving((current) => ({ ...current, [activeCategory.id]: false }));
    }
  }

  async function importKeywordsToActiveCategory(keywords: string[], sourceLabel: string) {
    const normalizedKeywords = dedupeStrings(keywords);
    if (normalizedKeywords.length === 0) {
      return 0;
    }

    const currentDraft = settingsDrafts[activeCategory.id] ?? toSettingsDraft(activeCategory);
    const nextKeywords = dedupeStrings([...currentDraft.keywords, ...normalizedKeywords]);
    const addedKeywords = nextKeywords.filter((keyword) => !currentDraft.keywords.includes(keyword));

    if (addedKeywords.length === 0) {
      return 0;
    }

    const nextDraft = { ...currentDraft, keywords: nextKeywords };
    setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: nextDraft }));
    setSettingsSaving((current) => ({ ...current, [activeCategory.id]: true }));

    try {
      const response = await fetch("/api/category-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: activeCategory.id, ...nextDraft })
      });
      const payload = await parseApiResponse<{ settings: CategorySettingsDraft; error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error ?? "导入关键词失败。");
      }

      setCategorySettings((current) => ({ ...current, [activeCategory.id]: payload.settings }));
      setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: payload.settings }));
      setSettingsFeedback((current) => ({
        ...current,
        [activeCategory.id]: `${sourceLabel}已导入 ${addedKeywords.length} 个关键词。`
      }));
      return addedKeywords.length;
    } finally {
      setSettingsSaving((current) => ({ ...current, [activeCategory.id]: false }));
    }
  }

  async function importMatchedKeywordsFromCurrentContents() {
    try {
      const importedCount = await importKeywordsToActiveCategory(importableMatchedKeywords, "当前内容命中关键词");
      if (importedCount === 0) {
        setSettingsFeedback((current) => ({
          ...current,
          [activeCategory.id]: importableMatchedKeywords.length > 0 ? "当前内容命中关键词都已在监控设置里了。" : "当前内容里还没有可导入的命中关键词。"
        }));
      }
    } catch (error) {
      setSettingsFeedback((current) => ({
        ...current,
        [activeCategory.id]: error instanceof Error ? error.message : "导入关键词失败。"
      }));
    }
  }

  function createNewCategory() {
    const name = window.prompt("请输入新分类名称", "新分类");
    if (!name?.trim()) return;

    const goal = window.prompt("请输入分类说明", `跟踪 ${name.trim()} 相关内容热度，沉淀后续选题方向。`) ?? "";
    const category = createCustomCategory(name, goal);

    setCustomCategories((current) => [category, ...current]);
    setCategorySettings((current) => ({ ...current, [category.id]: toSettingsDraft(category) }));
    setSettingsDrafts((current) => ({ ...current, [category.id]: toSettingsDraft(category) }));
    setKeywordDrafts((current) => ({ ...current, [category.id]: "" }));
    setCreatorDrafts((current) => ({ ...current, [category.id]: createEmptyCreatorDraft() }));
    setSettingsFeedback((current) => ({ ...current, [category.id]: "" }));
    setSettingsSaving((current) => ({ ...current, [category.id]: false }));
    setPersistedContents((current) => ({ ...current, [category.id]: [] }));
    setTopicsByCategory((current) => ({ ...current, [category.id]: [] }));
    setActiveTopicIdByCategory((current) => ({ ...current, [category.id]: "" }));
    setTopicDrafts((current) => ({ ...current, [category.id]: createEmptyTopicDraft() }));
    setTopicFeedback((current) => ({ ...current, [category.id]: "" }));
    setWechatPoolState((current) => ({
      ...current,
      [category.id]: { loading: false, error: "", keyword: "", items: [] }
    }));
    setHiddenCategoryIds((current) => current.filter((id) => id !== category.id));
    setActiveView(category.id);
    setActiveTab("content");
    setCategoryFeedback(`分类「${category.name}」已创建。`);
  }

  async function deleteActiveCategory() {
    if (visibleCategories.length <= 1) {
      setCategoryFeedback("至少保留一个分类后才能继续使用，当前暂不支持删光所有分类。");
      return;
    }

    if (!window.confirm(`确认删除分类「${activeCategory.name}」吗？该分类下的内容、选题和设置都会一起清除。`)) {
      return;
    }

    try {
      const response = await fetch("/api/category-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", categoryId: activeCategory.id })
      });
      const payload = await parseApiResponse<{ ok?: boolean; error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload.error ?? "删除分类失败。");
      }

      if (monitorCategories.some((category) => category.id === activeCategory.id)) {
        setHiddenCategoryIds((current) => Array.from(new Set([...current, activeCategory.id])));
      } else {
        setCustomCategories((current) => current.filter((category) => category.id !== activeCategory.id));
      }
      setPersistedContents((current) => ({ ...current, [activeCategory.id]: [] }));
      setTopicsByCategory((current) => ({ ...current, [activeCategory.id]: [] }));
      setActiveTopicIdByCategory((current) => ({ ...current, [activeCategory.id]: "" }));
      setWechatPoolState((current) => ({
        ...current,
        [activeCategory.id]: { loading: false, error: "", keyword: "", items: [] }
      }));
      setSettingsFeedback((current) => ({ ...current, [activeCategory.id]: "" }));
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: "" }));
      setCategoryFeedback(`分类「${activeCategory.name}」已删除。`);
      setActiveView("system-overview");
    } catch (error) {
      setCategoryFeedback(error instanceof Error ? error.message : "删除分类失败。");
    }
  }

  async function updateActiveTopic(field: "title" | "description" | "goal" | "status", value: string) {
    if (!activeTopic) return;
    const response = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        categoryId: activeCategory.id,
        topicId: activeTopic.id,
        title: field === "title" ? value : activeTopic.title,
        description: field === "description" ? value : activeTopic.description,
        goal: field === "goal" ? value : activeTopic.goal,
        status: field === "status" ? value : activeTopic.status,
        keywords: activeCategory.keywords.slice(0, 3)
      })
    });
    const payload = await parseApiResponse<{ topic?: TopicCard; topics: TopicCard[]; error?: string }>(response);
    if (!response.ok) {
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: payload.error ?? "更新选题失败。" }));
      return;
    }
    setTopicsByCategory((current) => ({ ...current, [activeCategory.id]: payload.topics }));
  }

  async function deleteActiveTopic() {
    if (!activeTopic) return;
    const response = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", categoryId: activeCategory.id, topicId: activeTopic.id })
    });
    const payload = await parseApiResponse<{ topics: TopicCard[]; error?: string }>(response);
    if (!response.ok) {
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: payload.error ?? "删除选题失败。" }));
      return;
    }
    setTopicsByCategory((current) => ({ ...current, [activeCategory.id]: payload.topics }));
    setActiveTopicIdByCategory((current) => ({ ...current, [activeCategory.id]: payload.topics[0]?.id ?? "" }));
    setTopicAnalysisState((current) => {
      const next = { ...current };
      delete next[activeTopic.id];
      return next;
    });
    setTopicFeedback((current) => ({ ...current, [activeCategory.id]: "当前选题已删除。" }));
    await refreshCategoryContents(activeCategory.id);
  }

  async function createTopicForActiveCategory() {
    const draft = topicDrafts[activeCategory.id];
    if (!draft.title.trim()) {
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: "请先填写选题标题。" }));
      return;
    }

    const response = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCategory.id, ...draft, keywords: activeCategory.keywords.slice(0, 3) })
    });
    const payload = await parseApiResponse<{ topic?: TopicCard; topics: TopicCard[]; error?: string }>(response);
    if (!response.ok) {
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: payload.error ?? "创建选题失败。" }));
      return;
    }

    setTopicsByCategory((current) => ({ ...current, [activeCategory.id]: payload.topics }));
    const newTopicId = payload.topic?.id ?? payload.topics[0]?.id ?? "";
    setActiveTopicIdByCategory((current) => ({ ...current, [activeCategory.id]: newTopicId }));
    setTopicDrafts((current) => ({ ...current, [activeCategory.id]: createEmptyTopicDraft() }));
    setTopicFeedback((current) => ({ ...current, [activeCategory.id]: "选题已创建，可以开始往里归集文章。" }));
  }

  async function attachItemToTopic(contentId: string, topicId?: string) {
    const targetTopicId = topicId || activeTopicId;
    if (!targetTopicId) {
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: "请先创建或选择一个选题。" }));
      return;
    }

    const response = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "attach", categoryId: activeCategory.id, topicId: targetTopicId, contentId })
    });
    const payload = await parseApiResponse<{ topics: TopicCard[]; error?: string }>(response);
    if (!response.ok) {
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: payload.error ?? "加入选题失败。" }));
      return;
    }

    setTopicsByCategory((current) => ({ ...current, [activeCategory.id]: payload.topics }));
    setActiveTopicIdByCategory((current) => ({ ...current, [activeCategory.id]: targetTopicId }));
    setTopicPickerItemId("");
    await refreshCategoryContents(activeCategory.id);
    const targetTopic = payload.topics.find((topic) => topic.id === targetTopicId);
    const sourceItem = mergedContents.find((item) => item.id === contentId);

    try {
      const importedCount = await importKeywordsToActiveCategory(sourceItem?.matchedKeywords ?? [], "内容命中关键词");
      setTopicFeedback((current) => ({
        ...current,
        [activeCategory.id]: importedCount > 0
          ? `内容已加入选题「${targetTopic?.title ?? "当前选题"}」，并同步 ${importedCount} 个关键词到监控设置。`
          : `内容已加入选题「${targetTopic?.title ?? "当前选题"}」。`
      }));
    } catch (error) {
      setTopicFeedback((current) => ({
        ...current,
        [activeCategory.id]: `内容已加入选题「${targetTopic?.title ?? "当前选题"}」，但关键词同步失败：${error instanceof Error ? error.message : "请稍后重试。"}`
      }));
    }
  }


  async function detachItemFromTopic(contentId: string, topicId: string) {
    const response = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "detach", categoryId: activeCategory.id, topicId, contentId })
    });
    const payload = await parseApiResponse<{ topics: TopicCard[]; error?: string }>(response);
    if (!response.ok) {
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: payload.error ?? "移出选题失败。" }));
      return;
    }

    setTopicsByCategory((current) => ({ ...current, [activeCategory.id]: payload.topics }));
    await refreshCategoryContents(activeCategory.id);
    const targetTopic = payload.topics.find((topic) => topic.id === topicId) ?? activeTopics.find((topic) => topic.id === topicId);
    setTopicFeedback((current) => ({ ...current, [activeCategory.id]: `内容已从选题「${targetTopic?.title ?? "当前选题"}」移除。` }));
  }

  async function runTopicAnalysis() {
    if (!activeTopicId) {
      setTopicFeedback((current) => ({ ...current, [activeCategory.id]: "请先选择一个选题。" }));
      return;
    }

    const selectedTopicItems = mergedContents.filter((item) => item.topicIds?.includes(activeTopicId));
    const items = selectedTopicItems.map((item) => ({
      id: item.id,
      title: item.title,
      creator: item.creator,
      platform: platformMeta[item.platform].label,
      publishTime: `${item.date} ${item.publishTime}`,
      heat: item.heat,
      engagementScore: item.engagementScore,
      summary: item.summary,
      matchedKeywords: item.matchedKeywords,
      aiTags: item.aiTags,
      sourceType: item.sourceType
    }));

    if (items.length === 0) {
      setTopicAnalysisState((state) => ({
        ...state,
        [activeTopicId]: { ...(state[activeTopicId] ?? { result: null }), loading: false, error: "请先往当前选题加入至少一条内容。", result: state[activeTopicId]?.result ?? null }
      }));
      return;
    }

    setTopicAnalysisState((state) => ({
      ...state,
      [activeTopicId]: { ...(state[activeTopicId] ?? { result: null }), loading: true, error: "", result: state[activeTopicId]?.result ?? null }
    }));

    try {
      const response = await fetch("/api/topic-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: activeTopicId, topicTitle: activeTopics.find((topic) => topic.id === activeTopicId)?.title ?? "当前选题", categoryName: activeCategory.name, items })
      });
      const payload = await parseApiResponse<TopicAnalysisResult & { error?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "AI 选题分析失败，请稍后再试。");
      }

      setTopicAnalysisState((state) => ({
        ...state,
        [activeTopicId]: { loading: false, error: "", result: payload as TopicAnalysisResult }
      }));
      await refreshTopics(activeCategory.id);
    } catch (analysisError) {
      setTopicAnalysisState((state) => ({
        ...state,
        [activeTopicId]: {
          ...(state[activeTopicId] ?? { result: null }),
          loading: false,
          error: analysisError instanceof Error ? analysisError.message : "AI 选题分析失败，请稍后再试。"
        }
      }));
    }
  }

  useEffect(() => {
    if (isSystemOverview) return;
    setRangeFilter("7d");
    setViewMode("range");
    setSearchValue("");
    setSourceFilter("all");
    setSortMode("heat");
    setSelectedDay(activeCategory.timeline[0].date);
    const hottestPlatform = mergedContents.slice().sort((a, b) => b.heat - a.heat)[0]?.platform;
    setActivePlatform(hottestPlatform ?? "all");
  }, [activeCategory, isSystemOverview]);

  const visibleTimeline = useMemo(() => {
    const limit = Math.min(rangeMeta[rangeFilter].days, activeCategory.timeline.length);
    const sliced = activeCategory.timeline.slice(0, limit);
    if (activePlatform === "all") return sliced;
    const platformItems = mergedContents.filter((item) => item.platform === activePlatform);
    return sliced.map((day) => {
      const items = platformItems.filter((item) => item.date === day.date);
      if (items.length === 0) return { ...day, totalCount: 0, peakHeat: 0, averageHeat: 0, highlight: `${platformMeta[activePlatform].label} 当天内容较少，可查看近 7 天。` };
      const hottest = items.reduce((best, item) => item.heat > best.heat ? item : best, items[0]);
      return { ...day, totalCount: items.length, peakHeat: hottest.heat, averageHeat: Math.round(items.reduce((sum, item) => sum + item.heat, 0) / items.length), topPlatform: activePlatform, hotKeyword: hottest.matchedKeywords[0] ?? hottest.aiTags[0], highlight: hottest.summary };
    });
  }, [activeCategory.timeline, activePlatform, mergedContents, rangeFilter]);

  useEffect(() => {
    if (isSystemOverview) return;
    if (!visibleTimeline.find((day) => day.date === selectedDay)) setSelectedDay(visibleTimeline[0]?.date ?? "");
  }, [isSystemOverview, selectedDay, visibleTimeline]);

  const poolItems = useMemo(() => {
    const inWindow = mergedContents.filter((item) => visibleTimeline.some((day) => day.date === item.date));
    const byPlatform = activePlatform === "all" ? inWindow : inWindow.filter((item) => item.platform === activePlatform);
    const bySource = sourceFilter === "all" ? byPlatform : byPlatform.filter((item) => item.sourceType === sourceFilter);
    const byView = viewMode === "single" ? bySource.filter((item) => item.date === selectedDay) : bySource;
    const query = searchValue.trim().toLowerCase();
    const bySearch = !query ? byView : byView.filter((item) => [item.title, item.creator, item.summary, ...item.matchedKeywords, ...item.matchedCreators, ...item.aiTags].join(" ").toLowerCase().includes(query));
    return bySearch.slice().sort((a, b) => sortMode === "heat" ? b.heat - a.heat : sortMode === "engagement" ? b.engagementScore - a.engagementScore : a.date === b.date ? b.publishTime.localeCompare(a.publishTime) : b.date.localeCompare(a.date));
  }, [activePlatform, mergedContents, searchValue, selectedDay, sortMode, sourceFilter, viewMode, visibleTimeline]);

  const stats = useMemo(() => {
    const total = poolItems.length;
    const highest = total > 0 ? Math.max(...poolItems.map((item) => item.heat)) : 0;
    const average = total > 0 ? Math.round(poolItems.reduce((sum, item) => sum + item.heat, 0) / total) : 0;
    return { total, highest, average, explosive: poolItems.filter((item) => item.heat >= 85).length };
  }, [poolItems]);

  const selectedTimelineDay = visibleTimeline.find((day) => day.date === selectedDay) ?? visibleTimeline[0];
  const selectedTopicItems = useMemo(() => activeTopicId ? mergedContents.filter((item) => item.topicIds?.includes(activeTopicId)) : [], [activeTopicId, mergedContents]);
  const syncedWechatCount = useMemo(
    () => (persistedContents[activeCategory.id] ?? []).filter((item) => item.id.startsWith("wechat-")).length,
    [activeCategory.id, persistedContents]
  );
  const importableMatchedKeywords = useMemo(
    () => dedupeStrings(mergedContents.flatMap((item) => item.matchedKeywords ?? [])),
    [mergedContents]
  );
  const platformDistribution = useMemo(() => (Object.keys(platformMeta) as PlatformKey[]).map((platform) => {
    const items = poolItems.filter((item) => item.platform === platform);
    return { platform, count: items.length, avgHeat: items.length ? Math.round(items.reduce((sum, item) => sum + item.heat, 0) / items.length) : 0 };
  }).filter((item) => item.count > 0).sort((a, b) => b.avgHeat - a.avgHeat), [poolItems]);
  const topTypes = useMemo(() => {
    const countMap = new Map<string, number>();
    poolItems.forEach((item) => item.aiTags.forEach((tag) => countMap.set(tag, (countMap.get(tag) ?? 0) + 1)));
    return Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [poolItems]);
  const sidebarTopicGroups = useMemo(() => {
    return visibleCategories.map((category) => ({
      category,
      topics: topicsByCategory[category.id] ?? []
    }));
  }, [topicsByCategory, visibleCategories]);
  const designReasons = [
    "系统总览页作为默认首页，是为了先让用户判断今天先看哪里，而不是一开始就陷入某个分类细节。",
    "总览页强调分类优先级和全局趋势，分类详情页才承接内容池操作和选题判断。",
    "公众号文章同步进分类内容池后，微信公众号会和其他平台一样参与筛选、排序与选题判断。"
  ];

  return (
    <main className="page-shell">
      <div className="backdrop-grid" />
      <aside className="sidebar">
        <div className="brand-block"><span className="eyebrow">Content Ops Console</span><h1>内容监控工具</h1><p>监控热点、异常与优先处理方向的内容运营后台。</p></div>
        <section className="sidebar-section">
          <div className="section-heading"><span>工作台</span><button type="button" className="ghost-button" onClick={createNewCategory}>+ 新建分类</button></div>
          <div className="sidebar-nav-list">
            <button type="button" className={cn("sidebar-nav-item", isSystemOverview && "active")} onClick={() => setActiveView("system-overview")}><strong>系统总览</strong><span>查看今日全局情况</span></button>
            <button type="button" className={cn("sidebar-nav-item", !isSystemOverview && "active")} onClick={() => setActiveView(visibleCategories[0]?.id ?? "system-overview")}><strong>分类管理</strong><span>进入分类详情与内容池</span></button>
            <button type="button" className="sidebar-nav-item" onClick={() => setActiveView("system-overview")}><strong>运行状态</strong><span>聚焦任务健康度</span></button>
            <button type="button" className="sidebar-nav-item" onClick={() => setActiveView(visibleCategories[0]?.id ?? "system-overview")}><strong>报告中心</strong><span>查看选题分析与结果</span></button>
            <button type="button" className="sidebar-nav-item" onClick={() => setActiveView(visibleCategories[0]?.id ?? "system-overview")}><strong>系统设置</strong><span>维护监控配置</span></button>
          </div>
        </section>
        <section className="sidebar-section">
          <div className="section-heading"><span>分类快捷入口</span><small>{visibleCategories.length} 个</small></div>
          <div className="sidebar-shortcut-list">
            {visibleCategories.map((category) => (
              <button key={category.id} type="button" className={cn("sidebar-shortcut-item", activeView === category.id && "active")} onClick={() => setActiveView(category.id)}>
                <strong>{category.name}</strong>
                <span>{category.priority} 优先级</span>
              </button>
            ))}
          </div>
        </section>
        <section className="sidebar-section">
          <div className="section-heading">
            <span>全部选题</span>
            <small>{sidebarTopicGroups.reduce((sum, group) => sum + group.topics.length, 0)} 个</small>
          </div>
          <div className="sidebar-topic-groups">
            {sidebarTopicGroups.some((group) => group.topics.length > 0) ? (
              sidebarTopicGroups.map(({ category, topics }) => (
                <div key={category.id} className="sidebar-topic-group">
                  <button
                    type="button"
                    className={cn("sidebar-topic-group-head", activeView === category.id && "active")}
                    onClick={() => setActiveView(category.id)}
                  >
                    <strong>{category.name}</strong>
                    <span>{topics.length} 个</span>
                  </button>
                  {topics.length > 0 ? (
                    <div className="sidebar-topic-list nested">
                      {topics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          className={cn(
                            "sidebar-topic-card",
                            activeView === category.id && activeTopicIdByCategory[category.id] === topic.id && "active"
                          )}
                          onClick={() => {
                            setActiveView(category.id);
                            setActiveTopicIdByCategory((current) => ({
                              ...current,
                              [category.id]: topic.id
                            }));
                          }}
                        >
                          <div className="sidebar-topic-head">
                            <strong>{topic.title}</strong>
                            <span className={cn("topic-status-pill", topicStatusMeta[topic.status].tone)}>
                              {topicStatusMeta[topic.status].label}
                            </span>
                          </div>
                          <p>{topic.description || topic.goal || "这条选题还没有补充说明"}</p>
                          <div className="sidebar-topic-meta">
                            <span>{topic.articleCount} 条素材</span>
                            <span>{topic.lastAnalysisAt ? `分析于 ${topic.lastAnalysisAt}` : "未分析"}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="status-card sidebar-topic-empty compact-empty">
                      <strong>还没有选题</strong>
                      <p>先进入分类创建选题卡片。</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="status-card sidebar-topic-empty">
                <strong>还没有任何选题</strong>
                <p>可以先进入任意分类，在内容页上方创建选题卡片，再把内容加入选题。</p>
              </div>
            )}
          </div>
        </section>
        <section className="sidebar-section"><div className="section-heading"><span>系统运行</span></div><div className="status-card"><div className="status-row"><span>默认入口</span><strong>{isSystemOverview ? "系统总览" : activeCategory.name}</strong></div><div className="status-row"><span>最新时间段</span><strong>{rangeMeta[rangeFilter].label}</strong></div><div className="status-row"><span>AI 分析状态</span><strong>{isSystemOverview ? "汇总完成" : activeCategory.runStatus.analysis}</strong></div></div></section>
      </aside>

      <section className="main-panel">
        <header className="page-topbar">
          <div className="page-topbar-copy">
            <span className="eyebrow">Dashboard</span>
            <h2>内容监控工具</h2>
            <p>按分类管理多平台监控任务，快速发现热点、风险与优先处理方向。</p>
          </div>
          <div className="page-topbar-actions">
            <div className="toolbar-group">
              {(["1d", "7d", "14d", "30d"] as RangeFilter[]).map((range) => (
                <button key={range} type="button" className={cn("soft-pill", rangeFilter === range && "active")} onClick={() => setRangeFilter(range)}>
                  {rangeMeta[range].label}
                </button>
              ))}
            </div>
            <div className="toolbar-group">
              <button type="button" className="soft-pill" onClick={() => window.location.reload()}>刷新</button>
              <button type="button" className="wechat-search-button" onClick={() => isSystemOverview ? scrollToSection("overview-insights") : setActiveTab("report")}>
                {isSystemOverview ? "查看今日摘要" : "进入选题分析"}
              </button>
            </div>
          </div>
        </header>
        {isSystemOverview ? (
          <SystemOverviewPanel categories={visibleCategories.map((category) => mergeCategorySettings(category, categorySettings[category.id]))} onEnterCategory={(id) => setActiveView(id)} />
        ) : (
          <div className="detail-page-shell">
            <header className="hero-card detail-hero-card">
              <div className="hero-copy">
                <span className="eyebrow">当前分类</span>
                <h2>{activeCategory.name}</h2>
                <p>{activeCategory.goal}</p>
                <div className="detail-hero-meta">
                  <span className={cn("topic-status-pill", activeCategory.runStatus.collect === "正常" ? "analyzed" : activeCategory.runStatus.collect === "延迟" ? "ready" : "collecting")}>采集 {activeCategory.runStatus.collect}</span>
                  <span className={cn("topic-status-pill", activeCategory.runStatus.analysis === "已完成" ? "analyzed" : "ready")}>分析 {activeCategory.runStatus.analysis}</span>
                  <span className="detail-meta-chip">{activeCategory.cadence}</span>
                  <span className="detail-meta-chip">{rangeMeta[rangeFilter].label}</span>
                </div>
              </div>
              <div className="hero-metrics detail-hero-metrics"><div className="metric-card"><span>监控平台</span><strong>{activeCategory.platforms.filter((item) => item.enabled).length}</strong></div><div className="metric-card"><span>关键词</span><strong>{activeCategory.keywords.length}</strong></div><div className="metric-card"><span>对标博主</span><strong>{activeCategory.creators.length}</strong></div></div>
            </header>
            <nav className="tab-bar detail-tab-bar">{tabOptions.map((tab) => <button key={tab.key} type="button" className={cn("tab-button", activeTab === tab.key && "active")} onClick={() => setActiveTab(tab.key)}><strong>{tab.label}</strong><span>{tab.description}</span></button>)}</nav>
            {activeTab === "content" ? (
              <section className="content-view upgraded-content-view">
                <TopicWorkspacePanel
                  topics={activeTopics}
                  activeTopicId={activeTopicId}
                  onSelectTopic={(topicId) => setActiveTopicIdByCategory((current) => ({ ...current, [activeCategory.id]: topicId }))}
                  topicDraft={topicDrafts[activeCategory.id]}
                  onTopicDraftChange={(field, value) => setTopicDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], [field]: value } }))}
                  onCreateTopic={() => void createTopicForActiveCategory()}
                  feedback={topicFeedback[activeCategory.id]}
                  activeTopic={activeTopic}
                  onUpdateTopic={(field, value) => void updateActiveTopic(field, value)}
                  onDeleteTopic={() => void deleteActiveTopic()}
                />
                <div className="control-card content-filter-card">
                  <div className="filter-toolbar"><div className="filter-column wide"><span className="control-title">平台筛选</span><div className="pill-row"><button type="button" className={cn("platform-pill", activePlatform === "all" && "active")} onClick={() => setActivePlatform("all")}>全部平台</button>{(Object.keys(platformMeta) as PlatformKey[]).map((platform) => <button key={platform} type="button" className={cn("platform-pill", activePlatform === platform && "active")} onClick={() => setActivePlatform(platform)}><span className="platform-pill-dot" style={{ backgroundColor: platformMeta[platform].accent }} />{platformMeta[platform].label}</button>)}</div></div><div className="filter-column"><span className="control-title">内容来源</span><div className="pill-row compact">{[{ key: "all", label: "全部" }, { key: "keyword", label: "关键词命中" }, { key: "creator", label: "博主命中" }].map((item) => <button key={item.key} type="button" className={cn("soft-pill", sourceFilter === item.key && "active")} onClick={() => setSourceFilter(item.key as SourceFilter)}>{item.label}</button>)}</div></div><div className="filter-column"><span className="control-title">时间范围</span><div className="pill-row compact">{(Object.keys(rangeMeta) as RangeFilter[]).map((range) => <button key={range} type="button" className={cn("soft-pill", rangeFilter === range && "active")} onClick={() => setRangeFilter(range)}>{rangeMeta[range].label}</button>)}</div></div></div>
                  <div className="filter-toolbar second"><div className="filter-column search-column wide"><span className="control-title">搜索内容池</span><div className="search-shell"><span>搜索</span><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="搜索标题、关键词、博主名" /></div></div><div className="filter-column"><span className="control-title">浏览模式</span><div className="pill-row compact"><button type="button" className={cn("soft-pill", viewMode === "range" && "active")} onClick={() => setViewMode("range")}>区间查看</button><button type="button" className={cn("soft-pill", viewMode === "single" && "active")} onClick={() => setViewMode("single")}>单天查看</button></div></div><div className="filter-column"><span className="control-title">内容排序</span><div className="pill-row compact"><button type="button" className={cn("soft-pill", sortMode === "heat" && "active")} onClick={() => setSortMode("heat")}>按热度</button><button type="button" className={cn("soft-pill", sortMode === "time" && "active")} onClick={() => setSortMode("time")}>按时间</button><button type="button" className={cn("soft-pill", sortMode === "engagement" && "active")} onClick={() => setSortMode("engagement")}>按互动率</button></div></div></div>
                  <div className="quick-stats-grid"><div className="quick-stat-card"><span>内容数</span><strong>{stats.total}</strong><small>当前筛选范围内可操作素材</small></div><div className="quick-stat-card"><span>爆款数</span><strong>{stats.explosive}</strong><small>热度 85 以上内容</small></div><div className="quick-stat-card"><span>平均热度</span><strong>{stats.average}</strong><small>便于判断整体趋势是否升温</small></div><div className="quick-stat-card emphasis"><span>最高热度</span><strong>{stats.highest}</strong><small>默认把注意力拉向最值得查看的样本</small></div></div><div className="wechat-sync-strip"><div className="wechat-sync-copy"><strong>微信公众号同步</strong><p>{activeWechatState?.error ? activeWechatState.error : activeWechatState?.loading ? `正在根据关键词“${activeWechatState.keyword || activeCategory.keywords[0] || activeCategory.name}”同步公众号文章...` : syncedWechatCount > 0 ? `已同步 ${syncedWechatCount} 篇公众号文章，关键词：${activeWechatState?.keyword || activeCategory.keywords[0] || activeCategory.name}。测试阶段单次最多保留 10 条。` : `尚未同步公众号文章。建议在需要时手动触发，避免被上游接口当前的 500/超时问题影响页面体验。测试阶段单次最多保留 10 条。`}</p></div><button type="button" className="soft-pill active" onClick={() => void syncWechatArticles(activeCategory, true)} disabled={activeWechatState?.loading}>{activeWechatState?.loading ? "同步中..." : syncedWechatCount > 0 ? "刷新公众号文章" : "同步公众号文章"}</button></div>
                </div>
                <ContentTimeline days={visibleTimeline} selectedDay={selectedDay} onSelect={setSelectedDay} viewMode={viewMode} />
                <div className="pool-layout"><div className="timeline-card pool-main-card"><div className="pool-header"><div><span className="eyebrow">内容池</span><h3>{viewMode === "single" ? `${selectedTimelineDay?.label ?? "当天"} 内容池` : `${rangeMeta[rangeFilter].label} 内容汇总`}</h3></div><div className="pool-header-meta"><span>{activePlatform === "all" ? "全部平台" : platformMeta[activePlatform].label}</span><span>{poolItems.length} 条内容</span></div></div>{poolItems.length > 0 ? <div className="pool-list">{poolItems.map((item) => { const status = itemStatuses[item.id] ?? item.defaultStatus ?? "candidate"; return <article key={item.id} className="pool-card"><div className="pool-card-top"><div className="pool-card-headline"><h4>{item.title}</h4><div className="pool-card-meta-row"><PlatformBadge platform={item.platform} /><span>{item.creator}</span><span>{item.date.slice(5)} {item.publishTime}</span></div></div><div className="pool-card-score"><span>热度</span><strong>{item.heat}</strong></div></div><p className="pool-card-summary">{item.summary}</p><div className="metrics-strip"><span>点赞 {item.stats.likes}</span><span>评论 {item.stats.comments}</span><span>收藏 {item.stats.saves}</span><span>转发 {item.stats.shares}</span><span>互动率 {item.engagementScore}</span></div><div className="context-grid"><div className="context-block"><strong>命中监控</strong><div className="tag-row">{item.matchedKeywords.map((keyword) => <span key={keyword} className="tag-chip keyword">{keyword}</span>)}{item.matchedCreators.map((creator) => <span key={creator} className="tag-chip creator">{creator}</span>)}</div></div><div className="context-block"><strong>AI 标签</strong><div className="tag-row">{item.aiTags.map((tag) => <span key={tag} className="tag-chip ai">{tag}</span>)}</div></div></div><div className="topic-tag-row">{(item.topicIds ?? []).map((topicId) => { const topic = activeTopics.find((entry) => entry.id === topicId); return topic ? <button key={topicId} type="button" className="topic-assigned-chip removable" onClick={() => void detachItemFromTopic(item.id, topicId)}>{topic.title}<span>×</span></button> : null; })}</div><div className="pool-card-actions"><div className="pool-action-group"><button type="button" className={cn("status-action", statusMeta[status]?.tone ?? statusMeta.candidate.tone)} onClick={() => setItemStatuses((current) => ({ ...current, [item.id]: toggleStatus(status) }))}>{statusMeta[status]?.label ?? statusMeta.candidate.label}</button><button type="button" className={cn("analysis-action", (item.topicIds?.length ?? 0) > 0 && "active")} onClick={() => setTopicPickerItemId((current) => current === item.id ? "" : item.id)}>{(item.topicIds?.length ?? 0) > 0 ? "继续加入其他选题" : activeTopics.length > 0 ? "选择选题加入" : "先创建选题"}</button></div><span className="source-indicator">{item.sourceType === "keyword" ? "来自关键词命中" : "来自对标博主命中"}</span></div>{topicPickerItemId === item.id ? <div className="topic-picker-panel"><strong>选择要加入的选题</strong><div className="topic-picker-list">{activeTopics.length > 0 ? activeTopics.map((topic) => <button key={topic.id} type="button" className={cn("topic-picker-button", item.topicIds?.includes(topic.id) && "active")} onClick={() => void attachItemToTopic(item.id, topic.id)} disabled={item.topicIds?.includes(topic.id)}>{item.topicIds?.includes(topic.id) ? `${topic.title} · 已加入` : topic.title}</button>) : <span className="topic-picker-empty">请先在上方创建一个选题。</span>}<button type="button" className="topic-picker-button ghost" onClick={() => setTopicPickerItemId("")}>收起</button></div></div> : null}</article>; })}</div> : <div className="empty-state expanded"><strong>当前筛选下没有可展示内容</strong><p>当日该平台内容较少，可切换到其他平台或查看近 7 天，系统会优先引导你回到更有判断价值的区间。</p></div>}</div><div className="insight-stack content-sidebar-stack"><div className="mini-card insight-card emphasis-card"><span className="eyebrow">当前热点摘要</span><strong>{selectedTimelineDay?.highlight}</strong><p>最热平台：{selectedTimelineDay ? platformMeta[selectedTimelineDay.topPlatform].label : "-"}，热门关键词：{selectedTimelineDay?.hotKeyword ?? "-"}。</p></div><div className="mini-card insight-card"><div className="section-heading"><span>平台热度分布</span><small>帮助判断下一步该盯哪个平台</small></div><div className="distribution-list">{platformDistribution.map((item) => <div key={item.platform} className="distribution-row"><div><strong>{platformMeta[item.platform].label}</strong><small>{item.count} 条内容</small></div><div className="distribution-bar-wrap"><div className="distribution-bar" style={{ width: `${Math.min(100, item.avgHeat)}%`, backgroundColor: platformMeta[item.platform].accent }} /><span>{item.avgHeat}</span></div></div>)}</div></div><div className="mini-card insight-card"><div className="section-heading"><span>AI 快速建议</span><small>降低运营判断成本</small></div><div className="advice-list"><p>优先关注的内容类型：{topTypes.map((item) => item[0]).join("、") || "暂无"}</p><p>更值得继续跟的平台：{platformDistribution[0] ? platformMeta[platformDistribution[0].platform].label : "暂无"}</p><p>建议优先加入当前选题的内容：{poolItems.filter((item) => item.heat >= 88).length} 条高热样本。</p></div></div><div className="mini-card insight-card rationale-card"><div className="section-heading"><span>设计理由</span><small>让页面本身解释交互</small></div><div className="reason-list">{designReasons.map((reason) => <p key={reason}>{reason}</p>)}</div></div></div></div>
              </section>
            ) : null}
            {activeTab === "report" ? <ReportTab category={activeCategory} topics={activeTopics} activeTopicId={activeTopicId} onSelectTopic={(topicId) => setActiveTopicIdByCategory((current) => ({ ...current, [activeCategory.id]: topicId }))} selectedTopicItems={selectedTopicItems} topicDraft={topicDrafts[activeCategory.id]} onTopicDraftChange={(field, value) => setTopicDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], [field]: value } }))} onCreateTopic={() => void createTopicForActiveCategory()} analysisState={activeTopicAnalysisState} onRunAnalysis={() => void runTopicAnalysis()} topicFeedback={topicFeedback[activeCategory.id]} onUpdateTopic={(field, value) => void updateActiveTopic(field, value)} onDeleteTopic={() => void deleteActiveTopic()} /> : null}
            {activeTab === "settings" ? <SettingsTab draft={settingsDrafts[activeCategory.id]} onScheduleTypeChange={(value) => setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], scheduleType: value, runTime: value === "manual" ? "" : (current[activeCategory.id].runTime || "09:00") } }))} onRunTimeChange={(value) => setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], runTime: value } }))} onScheduleWeekdayChange={(value) => setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], scheduleWeekday: value } }))} onTogglePlatform={(platform) => setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], platforms: current[activeCategory.id].platforms.map((item) => item.key === platform ? { ...item, enabled: !item.enabled } : item) } }))} onKeywordAdd={() => { const value = keywordDrafts[activeCategory.id].trim(); if (!value) return; setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], keywords: Array.from(new Set([...current[activeCategory.id].keywords, value])) } })); setKeywordDrafts((current) => ({ ...current, [activeCategory.id]: "" })); }} onImportMatchedKeywords={() => void importMatchedKeywordsFromCurrentContents()} onKeywordRemove={(keyword) => setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], keywords: current[activeCategory.id].keywords.filter((item) => item !== keyword) } }))} keywordDraft={keywordDrafts[activeCategory.id]} onKeywordDraftChange={(value) => setKeywordDrafts((current) => ({ ...current, [activeCategory.id]: value }))} creatorDraft={creatorDrafts[activeCategory.id]} onCreatorDraftChange={(field, value) => setCreatorDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], [field]: value } as MonitorCategory["creators"][number] }))} onCreatorAdd={() => { const draft = creatorDrafts[activeCategory.id]; if (!draft.name.trim()) return; setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], creators: [...current[activeCategory.id].creators, { ...draft, name: draft.name.trim(), style: draft.style.trim(), updateRate: draft.updateRate.trim() }] } })); setCreatorDrafts((current) => ({ ...current, [activeCategory.id]: { name: "", platform: draft.platform, style: "", updateRate: "" } })); }} onCreatorRemove={(name) => setSettingsDrafts((current) => ({ ...current, [activeCategory.id]: { ...current[activeCategory.id], creators: current[activeCategory.id].creators.filter((item) => item.name !== name) } }))} onSave={() => void saveCurrentSettings(false)} onSync={() => void saveCurrentSettings(true)} onDeleteCategory={() => void deleteActiveCategory()} deleteDisabled={visibleCategories.length <= 1} importableKeywordCount={importableMatchedKeywords.length} feedback={settingsFeedback[activeCategory.id]} categoryFeedback={categoryFeedback} loading={settingsSaving[activeCategory.id]} /> : null}
          </div>
        )}
      </section>
    </main>
  );
}































































