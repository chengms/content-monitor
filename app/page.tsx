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
  id: string;
  name: string;
  goal: string;
  cadence: string;
  platforms: { key: PlatformKey; enabled: boolean; volume: string; note: string }[];
  keywords: string[];
  creators: { name: string; platform: PlatformKey; style: string; updateRate: string }[];
  timeline: TimelineDay[];
  contents: ContentItem[];
  reports: DailyReport[];
};

const platformMeta: Record<PlatformKey, { label: string; accent: string; soft: string }> = {
  douyin: { label: "抖音", accent: "var(--accent-coral)", soft: "rgba(210, 106, 79, 0.16)" },
  xiaohongshu: { label: "小红书", accent: "var(--accent-rose)", soft: "rgba(199, 85, 109, 0.16)" },
  weibo: { label: "微博", accent: "var(--accent-gold)", soft: "rgba(184, 139, 50, 0.16)" },
  bilibili: { label: "B站", accent: "var(--accent-sky)", soft: "rgba(45, 124, 147, 0.16)" }
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
  return days.map((day, index) => ({
    ...day,
    label: index === 0 ? "今天" : index === 1 ? "昨天" : day.date.slice(5)
  }));
}

const monitorCategories: MonitorCategory[] = [
  {
    id: "claudecode",
    name: "ClaudeCode 选题监控",
    goal: "跟踪 AI 编码工具内容热度，提炼面向开发者的爆款选题",
    cadence: "每天 08:30 自动运行",
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
      { date: "2026-03-27", totalCount: 26, peakHeat: 97, averageHeat: 85, topPlatform: "douyin", hotKeyword: "Claude Code 迁移", highlight: "真实效率对比内容爆发，短视频收藏率显著升高。" },
      { date: "2026-03-26", totalCount: 31, peakHeat: 95, averageHeat: 82, topPlatform: "weibo", hotKeyword: "团队规范", highlight: "团队接入 AI 编程的争议型讨论带动评论量。" },
      { date: "2026-03-25", totalCount: 22, peakHeat: 88, averageHeat: 76, topPlatform: "xiaohongshu", hotKeyword: "Claude vs Cursor", highlight: "对比型选题持续稳定，中文团队适配是主话题。" },
      { date: "2026-03-24", totalCount: 18, peakHeat: 81, averageHeat: 72, topPlatform: "bilibili", hotKeyword: "完整交付案例", highlight: "长视频用户更关注需求澄清和完整交付过程。" },
      { date: "2026-03-23", totalCount: 17, peakHeat: 79, averageHeat: 69, topPlatform: "xiaohongshu", hotKeyword: "提示词避坑", highlight: "新手避坑内容收藏稳定，适合持续铺量。" },
      { date: "2026-03-22", totalCount: 14, peakHeat: 74, averageHeat: 64, topPlatform: "douyin", hotKeyword: "代码审查", highlight: "围绕 AI 代码审查的争议内容互动率较高。" },
      { date: "2026-03-21", totalCount: 19, peakHeat: 83, averageHeat: 73, topPlatform: "weibo", hotKeyword: "研发日报", highlight: "管理视角内容突然抬头，适合做流程模板。" },
      { date: "2026-03-20", totalCount: 13, peakHeat: 68, averageHeat: 61, topPlatform: "bilibili", hotKeyword: "需求拆解", highlight: "教程型内容质量高但爆发力一般。" },
      { date: "2026-03-19", totalCount: 12, peakHeat: 65, averageHeat: 59, topPlatform: "douyin", hotKeyword: "多模型协作", highlight: "多工具协作仍有热度，但用户问题偏进阶。" },
      { date: "2026-03-18", totalCount: 16, peakHeat: 77, averageHeat: 67, topPlatform: "xiaohongshu", hotKeyword: "效率翻倍", highlight: "效率承诺型内容容易起量，但需要更强案例支撑。" },
      { date: "2026-03-17", totalCount: 11, peakHeat: 63, averageHeat: 57, topPlatform: "weibo", hotKeyword: "协作流程", highlight: "讨论偏观点，建议用模板内容承接。" },
      { date: "2026-03-16", totalCount: 10, peakHeat: 58, averageHeat: 53, topPlatform: "bilibili", hotKeyword: "工程实践", highlight: "深度内容有口碑，但适合作为信任资产而非爆款。" },
      { date: "2026-03-15", totalCount: 9, peakHeat: 55, averageHeat: 49, topPlatform: "douyin", hotKeyword: "工具替代", highlight: "替代关系话题开始升温，尚未进入爆发期。" },
      { date: "2026-03-14", totalCount: 8, peakHeat: 49, averageHeat: 45, topPlatform: "xiaohongshu", hotKeyword: "工作流模板", highlight: "模板类内容有基础需求，但包装还不够强。" }
    ]),
    contents: [
      { id: "cc1", date: "2026-03-27", title: "我把 Claude Code 当主力 IDE 用了 7 天，效率翻倍了吗？", creator: "AI 阿凯", platform: "douyin", publishTime: "09:20", heat: 97, engagementScore: 96, stats: { likes: "3.1w", comments: "2.4k", saves: "4.8k", shares: "1.1k" }, summary: "用真实需求对比 Cursor、Claude Code 和手写代码，结论明确，评论区持续讨论迁移成本。", sourceType: "keyword", matchedKeywords: ["Claude Code", "cursor 替代"], matchedCreators: [], aiTags: ["对比测评", "效率对比", "爆款结构"], defaultStatus: "selected" },
      { id: "cc2", date: "2026-03-27", title: "Claude Code 工作流模板：从需求到 PR 的完整链路", creator: "代码补给站", platform: "bilibili", publishTime: "11:45", heat: 92, engagementScore: 88, stats: { likes: "8.6k", comments: "1.2k", saves: "3.2k", shares: "540" }, summary: "完整拆解需求澄清、计划、实现、验证的链路，模板感强，适合沉淀为方法论选题。", sourceType: "creator", matchedKeywords: ["agent 工作流"], matchedCreators: ["代码补给站"], aiTags: ["教程拆解", "工作流", "长内容深挖"], defaultStatus: "candidate" },
      { id: "cc3", date: "2026-03-27", title: "为什么越来越多团队把 AI 编程工具纳入日报？", creator: "TechPulse", platform: "weibo", publishTime: "14:10", heat: 85, engagementScore: 82, stats: { likes: "4.2k", comments: "1.5k", saves: "1.1k", shares: "1.8k" }, summary: "从管理视角讨论 AI 编码工具如何影响研发协作和交付节奏，观点争议强。", sourceType: "creator", matchedKeywords: ["AI 编程"], matchedCreators: ["TechPulse"], aiTags: ["团队协作", "情绪争议", "管理视角"], defaultStatus: "candidate" },
      { id: "cc4", date: "2026-03-27", title: "Claude Code 新手避坑：这 5 个提示词别再乱写了", creator: "野生产品笔记", platform: "xiaohongshu", publishTime: "16:00", heat: 89, engagementScore: 86, stats: { likes: "8.9k", comments: "860", saves: "5.1k", shares: "430" }, summary: "用错误示例和优化示例做对比，收藏率很高，适合做可复用卡片。", sourceType: "creator", matchedKeywords: ["Claude Code"], matchedCreators: ["野生产品笔记"], aiTags: ["新手指南", "提示词", "收藏导向"], defaultStatus: "selected" },
      { id: "cc5", date: "2026-03-26", title: "AI 编程工具接入团队规范后，谁的效率提升最大？", creator: "TechPulse", platform: "weibo", publishTime: "10:15", heat: 95, engagementScore: 90, stats: { likes: "5.7k", comments: "1.9k", saves: "980", shares: "2.2k" }, summary: "围绕 PM、前端、后端三个角色展开讨论，争议点集中在代码质量和边界。", sourceType: "creator", matchedKeywords: ["AI 编程"], matchedCreators: ["TechPulse"], aiTags: ["岗位差异", "争议话题", "团队规范"], defaultStatus: "candidate" },
      { id: "cc6", date: "2026-03-26", title: "用 Claude Code 做选题工具原型，我是怎么拆需求的", creator: "AI 阿凯", platform: "douyin", publishTime: "18:30", heat: 91, engagementScore: 89, stats: { likes: "2.7w", comments: "1.3k", saves: "3.6k", shares: "670" }, summary: "把需求拆解成页面结构、数据结构和验证路径，教程感强，评论在追问模板。", sourceType: "creator", matchedKeywords: ["Claude Code"], matchedCreators: ["AI 阿凯"], aiTags: ["需求拆解", "原型设计", "工具推荐"], defaultStatus: "selected" },
      { id: "cc7", date: "2026-03-25", title: "Claude Code vs Cursor：到底谁更适合中文开发团队？", creator: "野生产品笔记", platform: "xiaohongshu", publishTime: "13:20", heat: 88, engagementScore: 83, stats: { likes: "7.1k", comments: "790", saves: "3.8k", shares: "380" }, summary: "从中文语境理解、稳定性、团队适配三个方向做横评，决策导向明显。", sourceType: "creator", matchedKeywords: ["Claude Code", "cursor 替代"], matchedCreators: ["野生产品笔记"], aiTags: ["对比测评", "中文团队", "决策指南"], defaultStatus: "candidate" },
      { id: "cc8", date: "2026-03-24", title: "从 0 到 1 做一个 AI 数据面板，Claude Code 帮了什么？", creator: "代码补给站", platform: "bilibili", publishTime: "20:05", heat: 81, engagementScore: 76, stats: { likes: "6.1k", comments: "610", saves: "2.2k", shares: "310" }, summary: "展示完整开发过程，弹幕对需求澄清和验证步骤关注度高。", sourceType: "creator", matchedKeywords: ["Claude Code"], matchedCreators: ["代码补给站"], aiTags: ["完整案例", "开发过程", "深度教程"], defaultStatus: "candidate" },
      { id: "cc9", date: "2026-03-23", title: "别再问提示词万能模版了，真正有用的是工作流约束", creator: "野生产品笔记", platform: "xiaohongshu", publishTime: "09:40", heat: 79, engagementScore: 74, stats: { likes: "5.4k", comments: "430", saves: "2.9k", shares: "250" }, summary: "反模板观点带来不错讨论，适合衍生为工作流误区内容。", sourceType: "creator", matchedKeywords: ["agent 工作流"], matchedCreators: ["野生产品笔记"], aiTags: ["情绪争议", "提示词", "方法反转"], defaultStatus: "ignored" },
      { id: "cc10", date: "2026-03-22", title: "AI 代码审查到底是在提效还是制造二次返工？", creator: "TechPulse", platform: "weibo", publishTime: "17:25", heat: 74, engagementScore: 72, stats: { likes: "3.1k", comments: "1.2k", saves: "620", shares: "1.1k" }, summary: "意见两极，评论区大量真实团队案例，适合抽取争议点做选题。", sourceType: "creator", matchedKeywords: ["AI 编程"], matchedCreators: ["TechPulse"], aiTags: ["情绪争议", "代码审查", "评论驱动"], defaultStatus: "candidate" },
      { id: "cc11", date: "2026-03-21", title: "研发负责人最想看到的 AI 编码日报长什么样？", creator: "TechPulse", platform: "weibo", publishTime: "08:55", heat: 83, engagementScore: 78, stats: { likes: "4.6k", comments: "970", saves: "1.4k", shares: "920" }, summary: "管理模板型内容，适合快速做成下载资产或栏目内容。", sourceType: "keyword", matchedKeywords: ["AI 编程", "agent 工作流"], matchedCreators: [], aiTags: ["模板资产", "管理视角", "可下载"], defaultStatus: "selected" },
      { id: "cc12", date: "2026-03-20", title: "需求拆解写得好，AI 写代码才不会越帮越忙", creator: "代码补给站", platform: "bilibili", publishTime: "19:20", heat: 68, engagementScore: 65, stats: { likes: "3.3k", comments: "380", saves: "1.5k", shares: "190" }, summary: "强调前置澄清的重要性，适合与工作流内容组合。", sourceType: "creator", matchedKeywords: ["agent 工作流"], matchedCreators: ["代码补给站"], aiTags: ["教程拆解", "需求澄清", "工程实践"], defaultStatus: "candidate" },
      { id: "cc13", date: "2026-03-19", title: "我用 Claude Code + ChatGPT 双模型协作写完一个插件", creator: "AI 阿凯", platform: "douyin", publishTime: "21:10", heat: 65, engagementScore: 63, stats: { likes: "1.6w", comments: "520", saves: "1.4k", shares: "330" }, summary: "双工具协作视角新鲜，但用户更关心何时该切换模型。", sourceType: "creator", matchedKeywords: ["Claude Code"], matchedCreators: ["AI 阿凯"], aiTags: ["工具推荐", "多模型协作", "场景说明"], defaultStatus: "ignored" },
      { id: "cc14", date: "2026-03-18", title: "别只看速度，AI 编码真正提高的是决策密度", creator: "野生产品笔记", platform: "xiaohongshu", publishTime: "12:05", heat: 77, engagementScore: 71, stats: { likes: "4.9k", comments: "350", saves: "2.1k", shares: "180" }, summary: "观点型内容，但切口独特，适合作为认知层选题补位。", sourceType: "creator", matchedKeywords: ["AI 编程"], matchedCreators: ["野生产品笔记"], aiTags: ["认知升级", "观点表达", "中层热度"], defaultStatus: "candidate" }
    ],
    reports: [{ date: "03-27", headline: "今天的高热内容集中在真实效率对比与团队落地方法", focus: "最新报告", hotSignals: ["真实案例驱动内容明显更强", "流程模板收藏率高", "管理视角更能拉动评论"], aiSummary: "高热内容共同强调可复制模板和明确结论，适合继续布局迁移清单、团队日报和提示词避坑。", topics: [{ id: "t1", title: "Claude Code 迁移清单", description: "帮助团队判断什么时候该迁移。", whyNow: "用户处于决策窗口期。", potential: "适合做短视频与模板下载。" }, { id: "t2", title: "AI 编程日报模板", description: "展示团队如何把 AI 编程纳入日常协作。", whyNow: "管理动作成为高频问题。", potential: "适合做系列栏目。" }] }]
  },
  {
    id: "vibecoding",
    name: "VibeCoding 选题监控",
    goal: "追踪 AI 原型、独立开发与产品创意内容，挖掘高增长话题",
    cadence: "每天 09:00 自动运行",
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
      { date: "2026-03-27", totalCount: 19, peakHeat: 93, averageHeat: 81, topPlatform: "douyin", hotKeyword: "一句话做 SaaS", highlight: "商业化暗示型内容拉升停留和收藏。" },
      { date: "2026-03-26", totalCount: 23, peakHeat: 89, averageHeat: 77, topPlatform: "bilibili", hotKeyword: "48 小时 MVP", highlight: "时间压缩叙事驱动强，适合做流程拆解。" },
      { date: "2026-03-25", totalCount: 20, peakHeat: 84, averageHeat: 72, topPlatform: "xiaohongshu", hotKeyword: "首页包装", highlight: "包装优先级超过功能堆叠。" },
      { date: "2026-03-24", totalCount: 18, peakHeat: 76, averageHeat: 66, topPlatform: "douyin", hotKeyword: "产品灵感", highlight: "灵感类短视频有量，但缺少深度承接。" },
      { date: "2026-03-23", totalCount: 15, peakHeat: 73, averageHeat: 64, topPlatform: "xiaohongshu", hotKeyword: "独立开发包装", highlight: "用户正在寻找可复制包装公式。" },
      { date: "2026-03-22", totalCount: 17, peakHeat: 78, averageHeat: 68, topPlatform: "weibo", hotKeyword: "一人公司", highlight: "观点内容讨论热，但转化感弱。" },
      { date: "2026-03-21", totalCount: 14, peakHeat: 69, averageHeat: 61, topPlatform: "bilibili", hotKeyword: "MVP 验证", highlight: "长视频对验证路径的解释更受欢迎。" },
      { date: "2026-03-20", totalCount: 12, peakHeat: 63, averageHeat: 58, topPlatform: "douyin", hotKeyword: "AI 原型", highlight: "原型生成话题平稳，但商业闭环表达不足。" },
      { date: "2026-03-19", totalCount: 11, peakHeat: 59, averageHeat: 53, topPlatform: "xiaohongshu", hotKeyword: "Landing Page", highlight: "落地页包装开始升温。" },
      { date: "2026-03-18", totalCount: 10, peakHeat: 54, averageHeat: 49, topPlatform: "weibo", hotKeyword: "独立开发焦虑", highlight: "情绪表达多，选题价值一般。" }
    ]),
    contents: [
      { id: "vc1", date: "2026-03-27", title: "我用一句话做出一个 SaaS 首页，居然有人直接私信报价", creator: "30 秒做产品", platform: "douyin", publishTime: "10:05", heat: 93, engagementScore: 92, stats: { likes: "2.4w", comments: "980", saves: "5.2k", shares: "760" }, summary: "把 AI 原型生成和商业变现直接绑定，刺激用户想象空间，非常适合做高转化选题。", sourceType: "creator", matchedKeywords: ["AI 原型"], matchedCreators: ["30 秒做产品"], aiTags: ["商业化", "爆款结构", "强转化"], defaultStatus: "selected" },
      { id: "vc2", date: "2026-03-27", title: "独立开发者最该做的不是功能，而是第一屏包装", creator: "增长造物", platform: "xiaohongshu", publishTime: "15:25", heat: 90, engagementScore: 87, stats: { likes: "9.5k", comments: "730", saves: "4.1k", shares: "280" }, summary: "围绕首页表达展开，案例图很强，适合沉淀包装公式内容。", sourceType: "creator", matchedKeywords: ["产品灵感"], matchedCreators: ["增长造物"], aiTags: ["首页包装", "案例拆解", "收藏导向"], defaultStatus: "selected" },
      { id: "vc3", date: "2026-03-26", title: "一个人 48 小时做 MVP，最容易卡在哪三步？", creator: "一人产品研究所", platform: "bilibili", publishTime: "19:10", heat: 89, engagementScore: 84, stats: { likes: "7.8k", comments: "650", saves: "3.5k", shares: "240" }, summary: "用户对需求收敛、上线节奏和反馈回路最感兴趣，适合做流程内容。", sourceType: "creator", matchedKeywords: ["MVP"], matchedCreators: ["一人产品研究所"], aiTags: ["流程拆解", "MVP", "教程拆解"], defaultStatus: "candidate" },
      { id: "vc4", date: "2026-03-25", title: "为什么你的 AI 原型看起来像 demo，而不是产品", creator: "增长造物", platform: "xiaohongshu", publishTime: "11:30", heat: 84, engagementScore: 79, stats: { likes: "6.2k", comments: "480", saves: "3.0k", shares: "210" }, summary: "对包装质感做反面案例拆解，适合延展成前后对比内容。", sourceType: "creator", matchedKeywords: ["AI 原型"], matchedCreators: ["增长造物"], aiTags: ["案例拆解", "包装升级", "对比改造"], defaultStatus: "candidate" },
      { id: "vc5", date: "2026-03-24", title: "今天我只做一件事：把一个想法做成可点开的 demo", creator: "30 秒做产品", platform: "douyin", publishTime: "09:15", heat: 76, engagementScore: 75, stats: { likes: "1.7w", comments: "520", saves: "2.2k", shares: "390" }, summary: "强节奏叙事适合吸引新用户，但深度不够，需要侧栏承接。", sourceType: "creator", matchedKeywords: ["vibe coding"], matchedCreators: ["30 秒做产品"], aiTags: ["节奏叙事", "AI 原型", "短视频钩子"], defaultStatus: "ignored" },
      { id: "vc6", date: "2026-03-23", title: "独立开发首页包装的 3 个偷懒公式", creator: "增长造物", platform: "xiaohongshu", publishTime: "13:50", heat: 73, engagementScore: 70, stats: { likes: "5.1k", comments: "260", saves: "2.7k", shares: "170" }, summary: "公式型内容易收藏，适合直接转为模板清单。", sourceType: "creator", matchedKeywords: ["独立开发"], matchedCreators: ["增长造物"], aiTags: ["模板资产", "首页包装", "公式内容"], defaultStatus: "candidate" },
      { id: "vc7", date: "2026-03-22", title: "一人公司是不是被 AI 工具重新定义了？", creator: "Demo Radar", platform: "weibo", publishTime: "20:20", heat: 78, engagementScore: 74, stats: { likes: "3.6k", comments: "1.1k", saves: "720", shares: "890" }, summary: "观点型内容带来讨论热度，适合做认知层内容，但不适合直接转战术。", sourceType: "creator", matchedKeywords: ["独立开发"], matchedCreators: ["Demo Radar"], aiTags: ["趋势讨论", "情绪争议", "观点表达"], defaultStatus: "ignored" },
      { id: "vc8", date: "2026-03-21", title: "MVP 验证别再做问卷了，直接上可点击原型", creator: "一人产品研究所", platform: "bilibili", publishTime: "18:05", heat: 69, engagementScore: 66, stats: { likes: "4.4k", comments: "320", saves: "1.9k", shares: "160" }, summary: "验证方式的替代思路明确，适合做方法论型选题。", sourceType: "creator", matchedKeywords: ["MVP"], matchedCreators: ["一人产品研究所"], aiTags: ["验证方法", "MVP", "方法论"], defaultStatus: "candidate" },
      { id: "vc9", date: "2026-03-20", title: "AI 原型为什么做得快，却卖不动？", creator: "Demo Radar", platform: "weibo", publishTime: "12:35", heat: 63, engagementScore: 61, stats: { likes: "2.2k", comments: "640", saves: "510", shares: "470" }, summary: "转化导向的反思型内容，适合和包装内容形成组合。", sourceType: "keyword", matchedKeywords: ["AI 原型", "产品灵感"], matchedCreators: [], aiTags: ["商业化", "问题导向", "反思内容"], defaultStatus: "candidate" },
      { id: "vc10", date: "2026-03-19", title: "Landing Page 包装感不够，99% 是因为价值主张写错了", creator: "增长造物", platform: "xiaohongshu", publishTime: "16:40", heat: 59, engagementScore: 57, stats: { likes: "3.1k", comments: "180", saves: "1.6k", shares: "120" }, summary: "中腰部稳定内容，适合做内容池补充，不一定进选题分析。", sourceType: "creator", matchedKeywords: ["产品灵感"], matchedCreators: ["增长造物"], aiTags: ["价值主张", "包装细节", "中腰部"], defaultStatus: "candidate" }
    ],
    reports: [{ date: "03-27", headline: "高热内容普遍在放大极短时间做出可卖原型的想象力", focus: "最新报告", hotSignals: ["商业化暗示能显著提高收藏", "首页包装优先级很高", "时间压缩叙事有效"], aiSummary: "VibeCoding 赛道当前最有效的结构是极短时间、具体收益、可视化结果。", topics: [{ id: "vt1", title: "24 小时做出能卖的 AI 原型", description: "强调时间压缩与结果导向。", whyNow: "用户行动欲强。", potential: "适合强节奏短视频。" }] }]
  }
];

function PlatformBadge({ platform }: { platform: PlatformKey }) {
  const meta = platformMeta[platform];
  return <span className="platform-badge" style={{ borderColor: meta.accent, color: meta.accent }}>{meta.label}</span>;
}

function ContentTimeline({ days, selectedDay, onSelect, viewMode }: { days: TimelineDay[]; selectedDay: string; onSelect: (date: string) => void; viewMode: ViewMode; }) {
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
                <div className="timeline-date-group">
                  <span className="timeline-date">{day.date.slice(5)}</span>
                  <strong>{day.label}</strong>
                </div>
                <div className="timeline-count-group">
                  <strong>{day.totalCount} 条</strong>
                  <span>热度 {day.peakHeat}</span>
                </div>
              </div>
              <div className="timeline-summary-body">
                <p>{day.highlight}</p>
              </div>
              <div className="timeline-summary-footer">
                <span>{platformMeta[day.topPlatform].label}</span>
                <span>{day.hotKeyword}</span>
              </div>
              <div className="timeline-heat-accent" />
              <div className="timeline-tooltip card-tooltip">
                <strong>{day.date}</strong>
                <span>内容数：{day.totalCount}</span>
                <span>峰值热度：{day.peakHeat}</span>
                <span>最热平台：{platformMeta[day.topPlatform].label}</span>
                <span>热门关键词：{day.hotKeyword}</span>
                <p>{day.highlight}</p>
                <small>{viewMode === "single" ? "点击查看单天内容池" : "当前为区间浏览，点击聚焦这一天"}</small>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReportTab({ category }: { category: MonitorCategory }) {
  const report = category.reports[0];
  return <section className="report-view"><div className="report-card"><span className="eyebrow">AI 选题分析</span><h3>{report.headline}</h3><p className="report-summary">{report.aiSummary}</p><div className="signal-list">{report.hotSignals.map((signal) => <div key={signal} className="signal-card"><span>热点信号</span><strong>{signal}</strong></div>)}</div></div></section>;
}

function SettingsTab({ category }: { category: MonitorCategory }) {
  return (
    <section className="settings-view">
      <div className="settings-grid">
        <div className="settings-card">
          <div className="section-heading"><span>监控平台</span><small>按分类独立配置采集范围</small></div>
          <div className="settings-list">{category.platforms.map((platform) => <div key={platform.key} className="settings-row"><div><strong>{platformMeta[platform.key].label}</strong><p>{platform.note}</p></div><div className="settings-status"><span className={cn("status-pill", platform.enabled && "active")}>{platform.enabled ? "已启用" : "已关闭"}</span><small>{platform.volume}</small></div></div>)}</div>
        </div>
        <div className="settings-card"><div className="section-heading"><span>对标关键词</span><small>支持多关键词并行监控</small></div><div className="keyword-cloud">{category.keywords.map((keyword) => <span key={keyword} className="keyword-chip">{keyword}</span>)}</div></div>
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
  const [activeCategoryId, setActiveCategoryId] = useState(monitorCategories[0].id);
  const [activeTab, setActiveTab] = useState<TabKey>("content");
  const [activePlatform, setActivePlatform] = useState<PlatformOrAll>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("7d");
  const [viewMode, setViewMode] = useState<ViewMode>("range");
  const [searchValue, setSearchValue] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("heat");
  const [selectedDay, setSelectedDay] = useState(monitorCategories[0].timeline[0].date);
  const [itemStatuses, setItemStatuses] = useState<Record<string, PoolStatus>>({});

  const activeCategory = useMemo(() => monitorCategories.find((item) => item.id === activeCategoryId) ?? monitorCategories[0], [activeCategoryId]);

  useEffect(() => {
    setRangeFilter("7d");
    setViewMode("range");
    setSearchValue("");
    setSourceFilter("all");
    setSortMode("heat");
    setSelectedDay(activeCategory.timeline[0].date);
    const hottestPlatform = activeCategory.contents.slice().sort((a, b) => b.heat - a.heat)[0]?.platform;
    setActivePlatform(hottestPlatform ?? "all");
  }, [activeCategory]);

  const visibleTimeline = useMemo(() => {
    const limit = Math.min(rangeMeta[rangeFilter].days, activeCategory.timeline.length);
    const sliced = activeCategory.timeline.slice(0, limit);
    if (activePlatform === "all") return sliced;
    const platformItems = activeCategory.contents.filter((item) => item.platform === activePlatform);
    return sliced.map((day) => {
      const items = platformItems.filter((item) => item.date === day.date);
      if (items.length === 0) {
        return { ...day, totalCount: 0, peakHeat: 0, averageHeat: 0, highlight: `${platformMeta[activePlatform].label} 当天内容较少，可查看近 7 天。` };
      }
      const hottest = items.reduce((best, item) => item.heat > best.heat ? item : best, items[0]);
      return { ...day, totalCount: items.length, peakHeat: hottest.heat, averageHeat: Math.round(items.reduce((sum, item) => sum + item.heat, 0) / items.length), topPlatform: activePlatform, hotKeyword: hottest.matchedKeywords[0] ?? hottest.aiTags[0], highlight: hottest.summary };
    });
  }, [activeCategory, activePlatform, rangeFilter]);

  useEffect(() => {
    if (!visibleTimeline.find((day) => day.date === selectedDay)) setSelectedDay(visibleTimeline[0]?.date ?? "");
  }, [visibleTimeline, selectedDay]);

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
    "热度时间轴先告诉用户哪天值得点，再让用户进入内容池，能明显降低日期选择成本。",
    "内容池配右侧洞察侧栏更贴近运营工作流，左侧浏览素材，右侧即时做判断和归纳。",
    "默认显示最近 7 天和高热平台，让首次进入页面时就能看到最有价值的样本。"
  ];

  return (
    <main className="page-shell">
      <div className="backdrop-grid" />
      <aside className="sidebar">
        <div className="brand-block"><span className="eyebrow">Content Ops Console</span><h1>内容监控工具</h1><p>按分类管理多平台监控任务，自动汇总热门内容并生成 AI 选题洞察。</p></div>
        <section className="sidebar-section"><div className="section-heading"><span>监控分类</span><button type="button" className="ghost-button">+ 新建分类</button></div><div className="category-list">{monitorCategories.map((category) => <button key={category.id} type="button" className={cn("category-card", category.id === activeCategoryId && "active")} onClick={() => setActiveCategoryId(category.id)}><div><strong>{category.name}</strong><p>{category.goal}</p></div><span>{category.cadence}</span></button>)}</div></section>
        <section className="sidebar-section"><div className="section-heading"><span>系统运行</span></div><div className="status-card"><div className="status-row"><span>任务频率</span><strong>{activeCategory.cadence}</strong></div><div className="status-row"><span>最新时间段</span><strong>{rangeMeta[rangeFilter].label}</strong></div><div className="status-row"><span>AI 分析状态</span><strong>已完成</strong></div></div></section>
      </aside>
      <section className="main-panel">
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
            <div className="pool-layout">
              <div className="timeline-card pool-main-card">
                <div className="pool-header"><div><span className="eyebrow">内容池</span><h3>{viewMode === "single" ? `${selectedTimelineDay?.label ?? "当天"} 内容池` : `${rangeMeta[rangeFilter].label} 内容汇总`}</h3></div><div className="pool-header-meta"><span>{activePlatform === "all" ? "全部平台" : platformMeta[activePlatform].label}</span><span>{poolItems.length} 条内容</span></div></div>
                {poolItems.length > 0 ? <div className="pool-list">{poolItems.map((item) => { const status = itemStatuses[item.id] ?? item.defaultStatus; return <article key={item.id} className="pool-card"><div className="pool-card-top"><div className="pool-card-headline"><h4>{item.title}</h4><div className="pool-card-meta-row"><PlatformBadge platform={item.platform} /><span>{item.creator}</span><span>{item.date.slice(5)} {item.publishTime}</span></div></div><div className="pool-card-score"><span>热度</span><strong>{item.heat}</strong></div></div><p className="pool-card-summary">{item.summary}</p><div className="metrics-strip"><span>点赞 {item.stats.likes}</span><span>评论 {item.stats.comments}</span><span>收藏 {item.stats.saves}</span><span>转发 {item.stats.shares}</span><span>互动率 {item.engagementScore}</span></div><div className="context-grid"><div className="context-block"><strong>命中监控</strong><div className="tag-row">{item.matchedKeywords.map((keyword) => <span key={keyword} className="tag-chip keyword">{keyword}</span>)}{item.matchedCreators.map((creator) => <span key={creator} className="tag-chip creator">{creator}</span>)}</div></div><div className="context-block"><strong>AI 标签</strong><div className="tag-row">{item.aiTags.map((tag) => <span key={tag} className="tag-chip ai">{tag}</span>)}</div></div></div><div className="pool-card-actions"><button type="button" className={cn("status-action", statusMeta[status].tone)} onClick={() => setItemStatuses((current) => ({ ...current, [item.id]: toggleStatus(status) }))}>{statusMeta[status].label}</button><span className="source-indicator">{item.sourceType === "keyword" ? "来自关键词命中" : "来自对标博主命中"}</span></div></article>; })}</div> : <div className="empty-state expanded"><strong>当前筛选下没有可展示内容</strong><p>当日该平台内容较少，可切换到其他平台或查看近 7 天，系统会优先引导你回到更有判断价值的区间。</p></div>}
              </div>
              <div className="insight-stack content-sidebar-stack">
                <div className="mini-card insight-card emphasis-card"><span className="eyebrow">当前热点摘要</span><strong>{selectedTimelineDay?.highlight}</strong><p>最热平台：{selectedTimelineDay ? platformMeta[selectedTimelineDay.topPlatform].label : "-"}，热门关键词：{selectedTimelineDay?.hotKeyword ?? "-"}。</p></div>
                <div className="mini-card insight-card"><div className="section-heading"><span>平台热度分布</span><small>帮助判断下一步该盯哪个平台</small></div><div className="distribution-list">{platformDistribution.map((item) => <div key={item.platform} className="distribution-row"><div><strong>{platformMeta[item.platform].label}</strong><small>{item.count} 条内容</small></div><div className="distribution-bar-wrap"><div className="distribution-bar" style={{ width: `${Math.min(100, item.avgHeat)}%`, backgroundColor: platformMeta[item.platform].accent }} /><span>{item.avgHeat}</span></div></div>)}</div></div>
                <div className="mini-card insight-card"><div className="section-heading"><span>AI 快速建议</span><small>降低运营判断成本</small></div><div className="advice-list"><p>优先关注的内容类型：{topTypes.map((item) => item[0]).join("、") || "暂无"}</p><p>更值得继续跟的平台：{platformDistribution[0] ? platformMeta[platformDistribution[0].platform].label : "暂无"}</p><p>建议优先加入选题分析的内容：{poolItems.filter((item) => item.heat >= 88).length} 条高热样本。</p></div></div>
                <div className="mini-card insight-card rationale-card"><div className="section-heading"><span>设计理由</span><small>让页面本身解释交互</small></div><div className="reason-list">{designReasons.map((reason) => <p key={reason}>{reason}</p>)}</div></div>
              </div>
            </div>
          </section>
        ) : null}
        {activeTab === "report" ? <ReportTab category={activeCategory} /> : null}
        {activeTab === "settings" ? <SettingsTab category={activeCategory} /> : null}
      </section>
    </main>
  );
}

