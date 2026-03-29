"use client";

import { useEffect, useMemo, useState } from "react";

type PlatformKey = "douyin" | "xiaohongshu" | "weibo" | "bilibili";
type TabKey = "content" | "report" | "settings";
type SourceFilter = "all" | "keyword" | "creator";
type RangeFilter = "1d" | "7d" | "14d" | "30d";
type ViewMode = "single" | "range";
type SortMode = "heat" | "time" | "engagement";
type PoolStatus = "candidate" | "selected" | "ignored";
type PlatformOrAll = PlatformKey | "all";
type TopLevelView = "system-overview" | "claudecode" | "vibecoding";

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
  sourceType: Exclude<SourceFilter, "all">;
  matchedKeywords: string[];
  matchedCreators: string[];
  aiTags: string[];
  defaultStatus: PoolStatus;
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
  id: Exclude<TopLevelView, "system-overview">;
  name: string;
  goal: string;
  cadence: string;
  priority: "高" | "中" | "低";
  runStatus: {
    collect: "正常" | "延迟" | "异常";
    analysis: "已完成" | "处理中" | "稍晚";
    latestRun: string;
    nextRun: string;
    issue?: string;
  };
  platforms: { key: PlatformKey; enabled: boolean; volume: string; note: string }[];
  keywords: string[];
  creators: { name: string; platform: PlatformKey; style: string; updateRate: string }[];
  timeline: TimelineDay[];
  contents: ContentItem[];
  reports: DailyReport[];
};

const platformMeta: Record<PlatformKey, { label: string; accent: string; soft: string; trend: string }> = {
  douyin: { label: "抖音", accent: "var(--accent-coral)", soft: "rgba(210, 106, 79, 0.16)", trend: "爆发明显" },
  xiaohongshu: { label: "小红书", accent: "var(--accent-rose)", soft: "rgba(199, 85, 109, 0.16)", trend: "持续稳定" },
  weibo: { label: "微博", accent: "var(--accent-gold)", soft: "rgba(184, 139, 50, 0.16)", trend: "评论热度高" },
  bilibili: { label: "B站", accent: "var(--accent-sky)", soft: "rgba(45, 124, 147, 0.16)", trend: "深度内容强" }
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
      { key: "bilibili", enabled: true, volume: "9 条/日", note: "长内容深度高" }
    ],
    keywords: ["Claude Code", "AI 编程", "agent 工作流", "vibe coding", "cursor 替代"],
    creators: [
      { name: "AI 阿凯", platform: "douyin", style: "快速演示型", updateRate: "日更" },
      { name: "野生产品笔记", platform: "xiaohongshu", style: "案例复盘型", updateRate: "周 4 更" },
      { name: "代码补给站", platform: "bilibili", style: "长视频教程型", updateRate: "周更" },
      { name: "TechPulse", platform: "weibo", style: "热点追踪型", updateRate: "日更" }
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
      { id: "cc6", date: "2026-03-25", title: "Claude Code vs Cursor：到底谁更适合中文开发团队？", creator: "野生产品笔记", platform: "xiaohongshu", publishTime: "13:20", heat: 88, engagementScore: 83, stats: { likes: "7.1k", comments: "790", saves: "3.8k", shares: "380" }, summary: "从中文语境理解、稳定性、团队适配三个方向做横评，决策导向明显。", sourceType: "creator", matchedKeywords: ["Claude Code", "cursor 替代"], matchedCreators: ["野生产品笔记"], aiTags: ["对比测评", "中文团队", "决策指南"], defaultStatus: "candidate" }
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
      { key: "bilibili", enabled: true, volume: "11 条/日", note: "案例拆解质量高" }
    ],
    keywords: ["vibe coding", "AI 原型", "独立开发", "MVP", "产品灵感"],
    creators: [
      { name: "增长造物", platform: "xiaohongshu", style: "项目包装型", updateRate: "日更" },
      { name: "一人产品研究所", platform: "bilibili", style: "案例拆解型", updateRate: "周 3 更" },
      { name: "30 秒做产品", platform: "douyin", style: "快节奏灵感型", updateRate: "日更" },
      { name: "Demo Radar", platform: "weibo", style: "趋势速递型", updateRate: "日更" }
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
      { id: "vc6", date: "2026-03-24", title: "今天我只做一件事：把一个想法做成可点开的 demo", creator: "30 秒做产品", platform: "douyin", publishTime: "09:15", heat: 76, engagementScore: 75, stats: { likes: "1.7w", comments: "520", saves: "2.2k", shares: "390" }, summary: "强节奏叙事适合吸引新用户，但深度不够，需要侧栏承接。", sourceType: "creator", matchedKeywords: ["vibe coding"], matchedCreators: ["30 秒做产品"], aiTags: ["节奏叙事", "AI 原型", "短视频钩子"], defaultStatus: "ignored" }
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
  const todayTotals = useMemo(() => {
    const categoryCount = categories.length;
    const totalContents = categories.reduce((sum, category) => sum + (category.timeline[0]?.totalCount ?? 0), 0);
    const explosive = categories.reduce((sum, category) => sum + category.contents.filter((item) => item.date === category.timeline[0]?.date && item.heat >= 85).length, 0);
    const reports = categories.reduce((sum, category) => sum + category.reports.length, 0);
    const successCount = categories.filter((item) => item.runStatus.collect !== "异常").length;
    const anomalies = categories.filter((item) => item.runStatus.collect !== "正常" || item.runStatus.analysis !== "已完成").length;
    return { categoryCount, totalContents, explosive, reports, successRate: Math.round((successCount / categoryCount) * 100), anomalies };
  }, [categories]);

  const topHeat = categories.slice().sort((a, b) => (b.timeline[0]?.peakHeat ?? 0) - (a.timeline[0]?.peakHeat ?? 0));
  const fastGrowth = categories.slice().sort((a, b) => ((b.timeline[0]?.peakHeat ?? 0) - (b.timeline[1]?.peakHeat ?? 0)) - ((a.timeline[0]?.peakHeat ?? 0) - (a.timeline[1]?.peakHeat ?? 0)));
  const mostVolume = categories.slice().sort((a, b) => (b.timeline[0]?.totalCount ?? 0) - (a.timeline[0]?.totalCount ?? 0));

  const globalTrend = useMemo(() => {
    const maxDays = Math.max(...categories.map((category) => category.timeline.length));
    return Array.from({ length: Math.min(7, maxDays) }, (_, index) => {
      const date = categories[0]?.timeline[index]?.date ?? "";
      const totalCount = categories.reduce((sum, category) => sum + (category.timeline[index]?.totalCount ?? 0), 0);
      const peakHeat = Math.max(...categories.map((category) => category.timeline[index]?.peakHeat ?? 0));
      const avgHeat = Math.round(categories.reduce((sum, category) => sum + (category.timeline[index]?.averageHeat ?? 0), 0) / categories.length);
      return { date, label: index === 0 ? "今天" : index === 1 ? "昨天" : date.slice(5), totalCount, peakHeat, avgHeat };
    });
  }, [categories]);

  const platformOverview = useMemo(() => {
    return (Object.keys(platformMeta) as PlatformKey[]).map((platform) => {
      const items = categories.flatMap((category) => category.contents.filter((item) => item.platform === platform && item.date === category.timeline[0]?.date));
      const avgHeat = items.length ? Math.round(items.reduce((sum, item) => sum + item.heat, 0) / items.length) : 0;
      return { platform, count: items.length, avgHeat, explosive: items.filter((item) => item.heat >= 85).length };
    });
  }, [categories]);

  const globalInsights = [
    "今天最值得优先关注的热点方向：团队迁移清单、首页包装公式、商业化表达。",
    `建议最先进入的分类：${topHeat[0]?.name ?? "暂无"}。`,
    `最值得继续跟的平台：${platformOverview.slice().sort((a, b) => b.avgHeat - a.avgHeat)[0]?.platform ? platformMeta[platformOverview.slice().sort((a, b) => b.avgHeat - a.avgHeat)[0].platform].label : "暂无"}。`,
    "系统总览页不直接展开单条内容，是为了先帮助用户判断今天应该先看哪里，再进入具体分类执行。"
  ];

  return (
    <section className="overview-view">
      <header className="hero-card overview-hero-card">
        <div>
          <span className="eyebrow">System Overview</span>
          <h2>系统总览</h2>
          <p>查看所有监控分类的运行状态、热点分布与优先处理方向，先判断今天先看哪里，再进入单个分类深挖。</p>
        </div>
        <div className="overview-metrics-grid">
          <div className="metric-card"><span>监控分类数</span><strong>{todayTotals.categoryCount}</strong></div>
          <div className="metric-card"><span>今日采集总数</span><strong>{todayTotals.totalContents}</strong></div>
          <div className="metric-card"><span>今日爆款数</span><strong>{todayTotals.explosive}</strong></div>
          <div className="metric-card"><span>运行成功率</span><strong>{todayTotals.successRate}%</strong></div>
          <div className="metric-card"><span>已生成报告</span><strong>{todayTotals.reports}</strong></div>
          <div className="metric-card"><span>异常任务数</span><strong>{todayTotals.anomalies}</strong></div>
        </div>
      </header>

      <div className="overview-grid top">
        <section className="overview-panel wide">
          <div className="section-heading"><span>全局运行状态</span><small>先看系统有没有正常跑完，再决定看哪个分类</small></div>
          <div className="run-summary-strip">
            <div className="run-summary-card"><span>今日任务状态</span><strong>{todayTotals.anomalies === 0 ? "全部正常" : "部分延迟"}</strong></div>
            <div className="run-summary-card"><span>最近一次运行</span><strong>今天 09:18</strong></div>
            <div className="run-summary-card"><span>下一次运行</span><strong>明天 08:30</strong></div>
          </div>
          <div className="run-status-list">
            {categories.map((category) => (
              <div key={category.id} className="run-status-card">
                <div>
                  <strong>{category.name}</strong>
                  <p>{category.goal}</p>
                </div>
                <div className="run-status-meta">
                  <StatusBadge label={`采集${category.runStatus.collect}`} tone={category.runStatus.collect === "正常" ? "good" : category.runStatus.collect === "延迟" ? "warn" : "danger"} />
                  <StatusBadge label={`分析${category.runStatus.analysis}`} tone={category.runStatus.analysis === "已完成" ? "good" : "warn"} />
                  <small>{category.timeline[0]?.totalCount ?? 0} 条内容</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="overview-panel">
          <div className="section-heading"><span>AI 全局洞察</span><small>帮助快速进入今天的工作状态</small></div>
          <div className="overview-insight-list">{globalInsights.map((item) => <p key={item}>{item}</p>)}</div>
        </section>
      </div>

      <section className="overview-panel">
        <div className="section-heading"><span>分类总览</span><small>默认首页突出优先级，帮助快速判断今天先看哪里</small></div>
        <div className="overview-category-grid">
          {categories.map((category) => (
            <article key={category.id} className={cn("overview-category-card", category.priority === "高" && "priority-high")}>
              <div className="overview-category-head"><div><strong>{category.name}</strong><p>{category.goal}</p></div><span className={cn("priority-pill", category.priority === "高" && "high", category.priority === "中" && "mid")}>优先级 {category.priority}</span></div>
              <div className="overview-category-metrics"><span>今日内容 {category.timeline[0]?.totalCount ?? 0}</span><span>最高热度 {category.timeline[0]?.peakHeat ?? 0}</span><span>最热平台 {platformMeta[category.timeline[0]?.topPlatform ?? "douyin"].label}</span></div>
              <p className="overview-category-summary">{category.timeline[0]?.highlight}</p>
              <button type="button" className="enter-category-button" onClick={() => onEnterCategory(category.id)}>进入分类</button>
            </article>
          ))}
        </div>
      </section>

      <div className="overview-grid middle">
        <section className="overview-panel wide">
          <div className="section-heading"><span>全局热度趋势</span><small>看今天整体热度是升是降，识别爆发日</small></div>
          <div className="overview-trend-rail">
            {globalTrend.map((day) => (
              <div key={day.date} className={cn("overview-trend-card", day.peakHeat >= 90 && "burst")}>
                <div className="overview-trend-top"><strong>{day.label}</strong><span>{day.date.slice(5)}</span></div>
                <div className="overview-trend-metrics"><span>{day.totalCount} 条</span><span>峰值 {day.peakHeat}</span><span>均热 {day.avgHeat}</span></div>
                <div className="overview-trend-bar"><div style={{ width: `${Math.min(100, day.peakHeat)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="overview-panel">
          <div className="section-heading"><span>分类排行</span><small>谁最热、谁增长最快、谁量最大</small></div>
          <div className="ranking-list">
            <div className="ranking-card"><strong>今日最热分类</strong><p>{topHeat[0]?.name} · 峰值 {topHeat[0]?.timeline[0]?.peakHeat}</p></div>
            <div className="ranking-card"><strong>增长最快分类</strong><p>{fastGrowth[0]?.name} · 较昨日提升 {((fastGrowth[0]?.timeline[0]?.peakHeat ?? 0) - (fastGrowth[0]?.timeline[1]?.peakHeat ?? 0))}</p></div>
            <div className="ranking-card"><strong>内容量最多分类</strong><p>{mostVolume[0]?.name} · {mostVolume[0]?.timeline[0]?.totalCount} 条</p></div>
          </div>
        </section>
      </div>

      <section className="overview-panel">
        <div className="section-heading"><span>平台总览</span><small>系统层面看今天更值得继续盯哪个平台</small></div>
        <div className="platform-overview-grid">
          {platformOverview.map((item) => (
            <div key={item.platform} className="platform-overview-card">
              <div className="platform-overview-head"><strong>{platformMeta[item.platform].label}</strong><span>{platformMeta[item.platform].trend}</span></div>
              <div className="platform-overview-metrics"><span>今日内容 {item.count}</span><span>平均热度 {item.avgHeat}</span><span>爆款 {item.explosive}</span></div>
              <div className="platform-overview-bar"><div style={{ width: `${Math.min(100, item.avgHeat)}%`, backgroundColor: platformMeta[item.platform].accent }} /></div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function ReportTab({ category }: { category: MonitorCategory }) {
  const report = category.reports[0];
  return <section className="report-view"><div className="report-card"><span className="eyebrow">AI 选题分析</span><h3>{report.headline}</h3><p className="report-summary">{report.aiSummary}</p><div className="signal-list">{report.hotSignals.map((signal) => <div key={signal} className="signal-card"><span>热点信号</span><strong>{signal}</strong></div>)}</div></div></section>;
}

function SettingsTab({ category }: { category: MonitorCategory }) {
  return <section className="settings-view"><div className="settings-grid"><div className="settings-card"><div className="section-heading"><span>监控平台</span><small>按分类独立配置采集范围</small></div><div className="settings-list">{category.platforms.map((platform) => <div key={platform.key} className="settings-row"><div><strong>{platformMeta[platform.key].label}</strong><p>{platform.note}</p></div><div className="settings-status"><span className={cn("status-pill", platform.enabled && "active")}>{platform.enabled ? "已启用" : "已关闭"}</span><small>{platform.volume}</small></div></div>)}</div></div><div className="settings-card"><div className="section-heading"><span>对标关键词</span><small>支持多关键词并行监控</small></div><div className="keyword-cloud">{category.keywords.map((keyword) => <span key={keyword} className="keyword-chip">{keyword}</span>)}</div></div></div></section>;
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

  const activeCategory = useMemo(() => monitorCategories.find((item) => item.id === activeView) ?? monitorCategories[0], [activeView]);
  const isSystemOverview = activeView === "system-overview";

  useEffect(() => {
    if (isSystemOverview) return;
    setRangeFilter("7d");
    setViewMode("range");
    setSearchValue("");
    setSourceFilter("all");
    setSortMode("heat");
    setSelectedDay(activeCategory.timeline[0].date);
    const hottestPlatform = activeCategory.contents.slice().sort((a, b) => b.heat - a.heat)[0]?.platform;
    setActivePlatform(hottestPlatform ?? "all");
  }, [activeCategory, isSystemOverview]);

  const visibleTimeline = useMemo(() => {
    const limit = Math.min(rangeMeta[rangeFilter].days, activeCategory.timeline.length);
    const sliced = activeCategory.timeline.slice(0, limit);
    if (activePlatform === "all") return sliced;
    const platformItems = activeCategory.contents.filter((item) => item.platform === activePlatform);
    return sliced.map((day) => {
      const items = platformItems.filter((item) => item.date === day.date);
      if (items.length === 0) return { ...day, totalCount: 0, peakHeat: 0, averageHeat: 0, highlight: `${platformMeta[activePlatform].label} 当天内容较少，可查看近 7 天。` };
      const hottest = items.reduce((best, item) => item.heat > best.heat ? item : best, items[0]);
      return { ...day, totalCount: items.length, peakHeat: hottest.heat, averageHeat: Math.round(items.reduce((sum, item) => sum + item.heat, 0) / items.length), topPlatform: activePlatform, hotKeyword: hottest.matchedKeywords[0] ?? hottest.aiTags[0], highlight: hottest.summary };
    });
  }, [activeCategory, activePlatform, rangeFilter]);

  useEffect(() => {
    if (isSystemOverview) return;
    if (!visibleTimeline.find((day) => day.date === selectedDay)) setSelectedDay(visibleTimeline[0]?.date ?? "");
  }, [isSystemOverview, selectedDay, visibleTimeline]);

  const poolItems = useMemo(() => {
    const inWindow = activeCategory.contents.filter((item) => visibleTimeline.some((day) => day.date === item.date));
    const byPlatform = activePlatform === "all" ? inWindow : inWindow.filter((item) => item.platform === activePlatform);
    const bySource = sourceFilter === "all" ? byPlatform : byPlatform.filter((item) => item.sourceType === sourceFilter);
    const byView = viewMode === "single" ? bySource.filter((item) => item.date === selectedDay) : bySource;
    const query = searchValue.trim().toLowerCase();
    const bySearch = !query ? byView : byView.filter((item) => [item.title, item.creator, item.summary, ...item.matchedKeywords, ...item.matchedCreators, ...item.aiTags].join(" ").toLowerCase().includes(query));
    return bySearch.slice().sort((a, b) => sortMode === "heat" ? b.heat - a.heat : sortMode === "engagement" ? b.engagementScore - a.engagementScore : a.date === b.date ? b.publishTime.localeCompare(a.publishTime) : b.date.localeCompare(a.date));
  }, [activeCategory, activePlatform, searchValue, selectedDay, sortMode, sourceFilter, viewMode, visibleTimeline]);

  const stats = useMemo(() => {
    const total = poolItems.length;
    const highest = total > 0 ? Math.max(...poolItems.map((item) => item.heat)) : 0;
    const average = total > 0 ? Math.round(poolItems.reduce((sum, item) => sum + item.heat, 0) / total) : 0;
    return { total, highest, average, explosive: poolItems.filter((item) => item.heat >= 85).length };
  }, [poolItems]);

  const selectedTimelineDay = visibleTimeline.find((day) => day.date === selectedDay) ?? visibleTimeline[0];
  const platformDistribution = useMemo(() => (Object.keys(platformMeta) as PlatformKey[]).map((platform) => {
    const items = poolItems.filter((item) => item.platform === platform);
    return { platform, count: items.length, avgHeat: items.length ? Math.round(items.reduce((sum, item) => sum + item.heat, 0) / items.length) : 0 };
  }).filter((item) => item.count > 0).sort((a, b) => b.avgHeat - a.avgHeat), [poolItems]);
  const topTypes = useMemo(() => {
    const countMap = new Map<string, number>();
    poolItems.forEach((item) => item.aiTags.forEach((tag) => countMap.set(tag, (countMap.get(tag) ?? 0) + 1)));
    return Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [poolItems]);
  const designReasons = [
    "系统总览页作为默认首页，是为了先让用户判断今天先看哪里，而不是一开始就陷入某个分类细节。",
    "总览页强调分类优先级和全局趋势，分类详情页才承接内容池操作和选题判断。",
    "当前详情页默认高亮最近 7 天和高热平台，可以在进入分类后最快看到值得处理的样本。"
  ];

  return (
    <main className="page-shell">
      <div className="backdrop-grid" />
      <aside className="sidebar">
        <div className="brand-block"><span className="eyebrow">Content Ops Console</span><h1>内容监控工具</h1><p>按分类管理多平台监控任务，自动汇总热门内容并生成 AI 选题洞察。</p></div>
        <section className="sidebar-section">
          <div className="section-heading"><span>导航</span><button type="button" className="ghost-button">+ 新建分类</button></div>
          <div className="category-list">
            <button type="button" className={cn("category-card", isSystemOverview && "active", "overview-nav-card")} onClick={() => setActiveView("system-overview")}><div><strong>系统总览</strong><p>查看所有分类的运行状态、热点分布与优先处理方向。</p></div><span>默认首页</span></button>
            {monitorCategories.map((category) => <button key={category.id} type="button" className={cn("category-card", activeView === category.id && "active")} onClick={() => setActiveView(category.id)}><div><strong>{category.name}</strong><p>{category.goal}</p></div><span>{category.cadence}</span></button>)}
          </div>
        </section>
        <section className="sidebar-section"><div className="section-heading"><span>系统运行</span></div><div className="status-card"><div className="status-row"><span>默认入口</span><strong>{isSystemOverview ? "系统总览" : activeCategory.name}</strong></div><div className="status-row"><span>最新时间段</span><strong>{rangeMeta[rangeFilter].label}</strong></div><div className="status-row"><span>AI 分析状态</span><strong>{isSystemOverview ? "汇总完成" : activeCategory.runStatus.analysis}</strong></div></div></section>
      </aside>

      <section className="main-panel">
        {isSystemOverview ? (
          <SystemOverviewPanel categories={monitorCategories} onEnterCategory={(id) => setActiveView(id)} />
        ) : (
          <>
            <header className="hero-card"><div><span className="eyebrow">当前分类</span><h2>{activeCategory.name}</h2><p>{activeCategory.goal}</p></div><div className="hero-metrics"><div className="metric-card"><span>监控平台</span><strong>{activeCategory.platforms.filter((item) => item.enabled).length}</strong></div><div className="metric-card"><span>关键词</span><strong>{activeCategory.keywords.length}</strong></div><div className="metric-card"><span>对标博主</span><strong>{activeCategory.creators.length}</strong></div></div></header>
            <nav className="tab-bar">{tabOptions.map((tab) => <button key={tab.key} type="button" className={cn("tab-button", activeTab === tab.key && "active")} onClick={() => setActiveTab(tab.key)}><strong>{tab.label}</strong><span>{tab.description}</span></button>)}</nav>
            {activeTab === "content" ? (
              <section className="content-view upgraded-content-view">
                <div className="control-card content-filter-card">
                  <div className="filter-toolbar"><div className="filter-column wide"><span className="control-title">平台筛选</span><div className="pill-row"><button type="button" className={cn("platform-pill", activePlatform === "all" && "active")} onClick={() => setActivePlatform("all")}>全部平台</button>{(Object.keys(platformMeta) as PlatformKey[]).map((platform) => <button key={platform} type="button" className={cn("platform-pill", activePlatform === platform && "active")} onClick={() => setActivePlatform(platform)}><span className="platform-pill-dot" style={{ backgroundColor: platformMeta[platform].accent }} />{platformMeta[platform].label}</button>)}</div></div><div className="filter-column"><span className="control-title">内容来源</span><div className="pill-row compact">{[{ key: "all", label: "全部" }, { key: "keyword", label: "关键词命中" }, { key: "creator", label: "博主命中" }].map((item) => <button key={item.key} type="button" className={cn("soft-pill", sourceFilter === item.key && "active")} onClick={() => setSourceFilter(item.key as SourceFilter)}>{item.label}</button>)}</div></div><div className="filter-column"><span className="control-title">时间范围</span><div className="pill-row compact">{(Object.keys(rangeMeta) as RangeFilter[]).map((range) => <button key={range} type="button" className={cn("soft-pill", rangeFilter === range && "active")} onClick={() => setRangeFilter(range)}>{rangeMeta[range].label}</button>)}</div></div></div>
                  <div className="filter-toolbar second"><div className="filter-column search-column wide"><span className="control-title">搜索内容池</span><div className="search-shell"><span>搜索</span><input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="搜索标题、关键词、博主名" /></div></div><div className="filter-column"><span className="control-title">浏览模式</span><div className="pill-row compact"><button type="button" className={cn("soft-pill", viewMode === "range" && "active")} onClick={() => setViewMode("range")}>区间查看</button><button type="button" className={cn("soft-pill", viewMode === "single" && "active")} onClick={() => setViewMode("single")}>单天查看</button></div></div><div className="filter-column"><span className="control-title">内容排序</span><div className="pill-row compact"><button type="button" className={cn("soft-pill", sortMode === "heat" && "active")} onClick={() => setSortMode("heat")}>按热度</button><button type="button" className={cn("soft-pill", sortMode === "time" && "active")} onClick={() => setSortMode("time")}>按时间</button><button type="button" className={cn("soft-pill", sortMode === "engagement" && "active")} onClick={() => setSortMode("engagement")}>按互动率</button></div></div></div>
                  <div className="quick-stats-grid"><div className="quick-stat-card"><span>内容数</span><strong>{stats.total}</strong><small>当前筛选范围内可操作素材</small></div><div className="quick-stat-card"><span>爆款数</span><strong>{stats.explosive}</strong><small>热度 85 以上内容</small></div><div className="quick-stat-card"><span>平均热度</span><strong>{stats.average}</strong><small>便于判断整体趋势是否升温</small></div><div className="quick-stat-card emphasis"><span>最高热度</span><strong>{stats.highest}</strong><small>默认把注意力拉向最值得查看的样本</small></div></div>
                </div>
                <ContentTimeline days={visibleTimeline} selectedDay={selectedDay} onSelect={setSelectedDay} viewMode={viewMode} />
                <div className="pool-layout"><div className="timeline-card pool-main-card"><div className="pool-header"><div><span className="eyebrow">内容池</span><h3>{viewMode === "single" ? `${selectedTimelineDay?.label ?? "当天"} 内容池` : `${rangeMeta[rangeFilter].label} 内容汇总`}</h3></div><div className="pool-header-meta"><span>{activePlatform === "all" ? "全部平台" : platformMeta[activePlatform].label}</span><span>{poolItems.length} 条内容</span></div></div>{poolItems.length > 0 ? <div className="pool-list">{poolItems.map((item) => { const status = itemStatuses[item.id] ?? item.defaultStatus; return <article key={item.id} className="pool-card"><div className="pool-card-top"><div className="pool-card-headline"><h4>{item.title}</h4><div className="pool-card-meta-row"><PlatformBadge platform={item.platform} /><span>{item.creator}</span><span>{item.date.slice(5)} {item.publishTime}</span></div></div><div className="pool-card-score"><span>热度</span><strong>{item.heat}</strong></div></div><p className="pool-card-summary">{item.summary}</p><div className="metrics-strip"><span>点赞 {item.stats.likes}</span><span>评论 {item.stats.comments}</span><span>收藏 {item.stats.saves}</span><span>转发 {item.stats.shares}</span><span>互动率 {item.engagementScore}</span></div><div className="context-grid"><div className="context-block"><strong>命中监控</strong><div className="tag-row">{item.matchedKeywords.map((keyword) => <span key={keyword} className="tag-chip keyword">{keyword}</span>)}{item.matchedCreators.map((creator) => <span key={creator} className="tag-chip creator">{creator}</span>)}</div></div><div className="context-block"><strong>AI 标签</strong><div className="tag-row">{item.aiTags.map((tag) => <span key={tag} className="tag-chip ai">{tag}</span>)}</div></div></div><div className="pool-card-actions"><button type="button" className={cn("status-action", statusMeta[status].tone)} onClick={() => setItemStatuses((current) => ({ ...current, [item.id]: toggleStatus(status) }))}>{statusMeta[status].label}</button><span className="source-indicator">{item.sourceType === "keyword" ? "来自关键词命中" : "来自对标博主命中"}</span></div></article>; })}</div> : <div className="empty-state expanded"><strong>当前筛选下没有可展示内容</strong><p>当日该平台内容较少，可切换到其他平台或查看近 7 天，系统会优先引导你回到更有判断价值的区间。</p></div>}</div><div className="insight-stack content-sidebar-stack"><div className="mini-card insight-card emphasis-card"><span className="eyebrow">当前热点摘要</span><strong>{selectedTimelineDay?.highlight}</strong><p>最热平台：{selectedTimelineDay ? platformMeta[selectedTimelineDay.topPlatform].label : "-"}，热门关键词：{selectedTimelineDay?.hotKeyword ?? "-"}。</p></div><div className="mini-card insight-card"><div className="section-heading"><span>平台热度分布</span><small>帮助判断下一步该盯哪个平台</small></div><div className="distribution-list">{platformDistribution.map((item) => <div key={item.platform} className="distribution-row"><div><strong>{platformMeta[item.platform].label}</strong><small>{item.count} 条内容</small></div><div className="distribution-bar-wrap"><div className="distribution-bar" style={{ width: `${Math.min(100, item.avgHeat)}%`, backgroundColor: platformMeta[item.platform].accent }} /><span>{item.avgHeat}</span></div></div>)}</div></div><div className="mini-card insight-card"><div className="section-heading"><span>AI 快速建议</span><small>降低运营判断成本</small></div><div className="advice-list"><p>优先关注的内容类型：{topTypes.map((item) => item[0]).join("、") || "暂无"}</p><p>更值得继续跟的平台：{platformDistribution[0] ? platformMeta[platformDistribution[0].platform].label : "暂无"}</p><p>建议优先加入选题分析的内容：{poolItems.filter((item) => item.heat >= 88).length} 条高热样本。</p></div></div><div className="mini-card insight-card rationale-card"><div className="section-heading"><span>设计理由</span><small>让页面本身解释交互</small></div><div className="reason-list">{designReasons.map((reason) => <p key={reason}>{reason}</p>)}</div></div></div></div>
              </section>
            ) : null}
            {activeTab === "report" ? <ReportTab category={activeCategory} /> : null}
            {activeTab === "settings" ? <SettingsTab category={activeCategory} /> : null}
          </>
        )}
      </section>
    </main>
  );
}
