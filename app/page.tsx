"use client";

import { useMemo, useState } from "react";

type PlatformKey = "douyin" | "xiaohongshu" | "weibo" | "bilibili";
type TabKey = "content" | "report" | "settings";

type ContentItem = {
  id: string;
  title: string;
  creator: string;
  platform: PlatformKey;
  publishTime: string;
  heat: number;
  engagement: string;
  summary: string;
  tags: string[];
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

type MonitorCategory = {
  id: string;
  name: string;
  goal: string;
  cadence: string;
  platforms: {
    key: PlatformKey;
    enabled: boolean;
    volume: string;
    note: string;
  }[];
  keywords: string[];
  creators: {
    name: string;
    platform: PlatformKey;
    style: string;
    updateRate: string;
  }[];
  contentByDate: {
    date: string;
    label: string;
    totalCount: number;
    peakHeat: number;
    highlight: string;
    items: ContentItem[];
  }[];
  reports: DailyReport[];
};

const platformMeta: Record<
  PlatformKey,
  { label: string; accent: string }
> = {
  douyin: { label: "抖音", accent: "var(--accent-coral)" },
  xiaohongshu: { label: "小红书", accent: "var(--accent-rose)" },
  weibo: { label: "微博", accent: "var(--accent-gold)" },
  bilibili: { label: "B站", accent: "var(--accent-sky)" }
};

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
    contentByDate: [
      {
        date: "03-27",
        label: "今天",
        totalCount: 26,
        peakHeat: 97,
        highlight: "多条内容集中讨论 AI 编码工作流替代方案",
        items: [
          {
            id: "cc-0327-1",
            title: "我把 Claude Code 当主力 IDE 用了 7 天，效率翻倍了吗？",
            creator: "AI 阿凯",
            platform: "douyin",
            publishTime: "09:20",
            heat: 97,
            engagement: "3.1w 点赞 · 4.8k 收藏",
            summary: "通过真实需求对比 Cursor、Claude Code 和手写代码，突出 agent 自动补全流程。",
            tags: ["效率对比", "实战演示", "工具替代"]
          },
          {
            id: "cc-0327-2",
            title: "Claude Code 工作流模板：从需求到 PR 的完整链路",
            creator: "代码补给站",
            platform: "bilibili",
            publishTime: "11:45",
            heat: 92,
            engagement: "1.2w 播放 · 2.3k 三连",
            summary: "拆解需求澄清、计划、实现、验证的完整操作链，评论区对模板复用兴趣高。",
            tags: ["模板", "工作流", "PR 交付"]
          },
          {
            id: "cc-0327-3",
            title: "为什么越来越多团队把 AI 编程工具纳入日报？",
            creator: "TechPulse",
            platform: "weibo",
            publishTime: "14:10",
            heat: 85,
            engagement: "5.6k 转评赞",
            summary: "围绕管理视角，讨论 AI 编码工具如何影响研发协作和交付节奏。",
            tags: ["团队协作", "管理视角", "趋势"]
          },
          {
            id: "cc-0327-4",
            title: "Claude Code 新手避坑：这 5 个提示词别再乱写了",
            creator: "野生产品笔记",
            platform: "xiaohongshu",
            publishTime: "16:00",
            heat: 89,
            engagement: "8.9k 赞藏",
            summary: "总结用户最常见的提示词误区，用错误示例和优化示例做对比。",
            tags: ["新手指南", "提示词", "避坑"]
          }
        ]
      },
      {
        date: "03-26",
        label: "昨天",
        totalCount: 31,
        peakHeat: 95,
        highlight: "开发者最关注 AI 编程工具与团队协作流程结合",
        items: [
          {
            id: "cc-0326-1",
            title: "AI 编程工具接入团队规范后，谁的效率提升最大？",
            creator: "TechPulse",
            platform: "weibo",
            publishTime: "10:15",
            heat: 95,
            engagement: "6.2k 转评赞",
            summary: "围绕 PM、前端、后端三个角色展开讨论，争议点集中在代码质量。",
            tags: ["团队规范", "岗位差异", "争议话题"]
          },
          {
            id: "cc-0326-2",
            title: "用 Claude Code 做选题工具原型，我是怎么拆需求的",
            creator: "AI 阿凯",
            platform: "douyin",
            publishTime: "18:30",
            heat: 91,
            engagement: "2.7w 点赞 · 3.6k 收藏",
            summary: "把需求拆解成页面结构、数据结构和验证路径，教程感很强。",
            tags: ["需求拆解", "原型设计", "流程化"]
          }
        ]
      },
      {
        date: "03-25",
        label: "03/25",
        totalCount: 22,
        peakHeat: 88,
        highlight: "对比型选题持续有效，尤其是 Claude Code vs Cursor",
        items: [
          {
            id: "cc-0325-1",
            title: "Claude Code vs Cursor：到底谁更适合中文开发团队？",
            creator: "野生产品笔记",
            platform: "xiaohongshu",
            publishTime: "13:20",
            heat: 88,
            engagement: "7.1k 赞藏",
            summary: "从易上手、稳定性、中文语境理解三个方向做横评。",
            tags: ["横评", "中文团队", "工具选择"]
          }
        ]
      },
      {
        date: "03-24",
        label: "03/24",
        totalCount: 18,
        peakHeat: 81,
        highlight: "长视频里观众更愿意看完整交付过程和踩坑总结",
        items: [
          {
            id: "cc-0324-1",
            title: "从 0 到 1 做一个 AI 数据面板，Claude Code 帮了什么？",
            creator: "代码补给站",
            platform: "bilibili",
            publishTime: "20:05",
            heat: 81,
            engagement: "8.3k 播放 · 1.4k 三连",
            summary: "展示完整开发过程，弹幕对需求澄清步骤关注度高。",
            tags: ["完整案例", "开发过程", "需求澄清"]
          }
        ]
      }
    ],
    reports: [
      {
        date: "03-27",
        headline: "今天的高热内容集中在真实效率对比与团队落地方法",
        focus: "最新报告",
        hotSignals: [
          "用户对 AI 编码工具的真实替代能力非常敏感",
          "带明确流程模板的内容收藏率明显更高",
          "管理与协作视角的内容更容易引发评论讨论"
        ],
        aiSummary:
          "OpenAI 分析显示，前 10 条高热内容普遍采用真实案例、明确结论、可复制模板的结构，用户希望快速判断工具是否值得迁移，并拿到可以照抄的工作流。",
        topics: [
          {
            id: "t1",
            title: "Claude Code 迁移清单",
            description: "做一篇面向开发团队的迁移清单，帮助用户判断何时从 Cursor 或传统 IDE 转向 Claude Code。",
            whyNow: "近期高热内容都在比较不同工具的替代关系，说明用户处于决策窗口期。",
            potential: "适合延展成短视频、图文卡片和长文模板，覆盖认知、决策和实操三个阶段。"
          },
          {
            id: "t2",
            title: "AI 编程日报模板",
            description: "围绕团队怎么把 AI 编程纳入日常协作做模板型选题，展示日报字段、任务拆解和复盘方式。",
            whyNow: "评论里大量用户关心管理动作如何落地，而不是单点技巧。",
            potential: "兼具话题性与实用性，适合做系列内容并引导下载或私域沉淀。"
          },
          {
            id: "t3",
            title: "提示词避坑合集",
            description: "汇总最常见的错误提示词写法，并给出更符合 agent 工作流的替代写法。",
            whyNow: "新用户增长明显，避坑类内容有天然传播力和收藏价值。",
            potential: "适合做强结构化内容，方便切片和再分发。"
          }
        ]
      },
      {
        date: "03-26",
        headline: "昨天的讨论重点从工具本身转向团队协作如何变化",
        focus: "昨日洞察",
        hotSignals: [
          "团队规范与代码质量争议最容易带来高互动",
          "具备复盘框架的内容收藏率高于纯观点表达",
          "选题工具原型类内容证明用户对落地案例需求强"
        ],
        aiSummary:
          "昨日高热内容呈现出明显的岗位视角分化，说明用户已经从尝鲜进入协作优化阶段。建议优先布局面向团队角色差异的内容。",
        topics: [
          {
            id: "t4",
            title: "不同岗位怎么用 AI 编程",
            description: "从 PM、前端、后端、测试四个角色切入，讲清楚各自最该借助 AI 的环节。",
            whyNow: "高热评论表明用户开始比较不同角色的收益差异。",
            potential: "容易引发讨论，也适合做连续更新的系列栏目。"
          },
          {
            id: "t5",
            title: "团队规范接入范式",
            description: "展示一个小团队如何把 AI 工具纳入需求拆解、代码审查和验证流程。",
            whyNow: "用户已经不满足于单人技巧，更想看组织级做法。",
            potential: "利于塑造专业形象，并承接咨询与服务类转化。"
          }
        ]
      },
      {
        date: "03-25",
        headline: "对比型选题依然稳定，但需要更具体的决策框架",
        focus: "趋势回看",
        hotSignals: [
          "用户不满足于简单横评，更希望看到适用场景划分",
          "中文语境、团队协作、可复制模板是高频关键词",
          "视频和图文都适合承载决策指南类内容"
        ],
        aiSummary:
          "从近三日报告看，对比内容正在从参数比较升级为场景决策。继续做横评时，需要加入明确的角色或任务前提。",
        topics: [
          {
            id: "t6",
            title: "中文团队如何选 AI 编程工具",
            description: "为中文开发团队构建一套工具选择框架，覆盖场景、预算和协作要求。",
            whyNow: "热门内容说明市场认知逐步成熟，用户开始做长期决策。",
            potential: "可沉淀为稳定 evergreen 内容，也适合后续更新版本。"
          }
        ]
      }
    ]
  },
  {
    id: "vibecoding",
    name: "VibeCoding 选题监控",
    goal: "追踪 AI 原型、独立开发与产品创意内容，挖掘高增长话题",
    cadence: "每天 09:00 自动运行",
    platforms: [
      { key: "douyin", enabled: true, volume: "15 条/日", note: "灵感类短内容高频" },
      { key: "xiaohongshu", enabled: true, volume: "30 条/日", note: "产品包装案例多" },
      { key: "weibo", enabled: false, volume: "低频采集", note: "仅保留趋势观察" },
      { key: "bilibili", enabled: true, volume: "11 条/日", note: "案例拆解质量高" }
    ],
    keywords: ["vibe coding", "AI 原型", "独立开发", "MVP", "产品灵感"],
    creators: [
      { name: "增长造物", platform: "xiaohongshu", style: "项目包装型", updateRate: "日更" },
      { name: "一人产品研究所", platform: "bilibili", style: "案例拆解型", updateRate: "周 3 更" },
      { name: "30 秒做产品", platform: "douyin", style: "快节奏灵感型", updateRate: "日更" }
    ],
    contentByDate: [
      {
        date: "03-27",
        label: "今天",
        totalCount: 19,
        peakHeat: 93,
        highlight: "AI 原型生成与个人产品变现是绝对热点",
        items: [
          {
            id: "vc-0327-1",
            title: "我用一句话做出一个 SaaS 首页，居然有人直接私信报价",
            creator: "30 秒做产品",
            platform: "douyin",
            publishTime: "10:05",
            heat: 93,
            engagement: "2.4w 点赞 · 5.2k 收藏",
            summary: "把 AI 原型生成和商业变现直接绑定，强刺激用户想象空间。",
            tags: ["AI 原型", "商业化", "强转化"]
          },
          {
            id: "vc-0327-2",
            title: "独立开发者最该做的不是功能，而是第一屏包装",
            creator: "增长造物",
            platform: "xiaohongshu",
            publishTime: "15:25",
            heat: 90,
            engagement: "9.5k 赞藏",
            summary: "围绕产品价值表达展开，案例图很强，收藏率高。",
            tags: ["包装", "第一屏", "案例"]
          }
        ]
      },
      {
        date: "03-26",
        label: "昨天",
        totalCount: 23,
        peakHeat: 89,
        highlight: "从 idea 到 MVP 的完整链路内容持续走高",
        items: [
          {
            id: "vc-0326-1",
            title: "一个人 48 小时做 MVP，最容易卡在哪三步？",
            creator: "一人产品研究所",
            platform: "bilibili",
            publishTime: "19:10",
            heat: 89,
            engagement: "9.2k 播放 · 1.6k 三连",
            summary: "用户对需求收敛、上线节奏和反馈回路最感兴趣。",
            tags: ["MVP", "流程", "卡点"]
          }
        ]
      }
    ],
    reports: [
      {
        date: "03-27",
        headline: "高热内容普遍在放大极短时间做出可卖原型的想象力",
        focus: "最新报告",
        hotSignals: [
          "商业化暗示会显著提高停留与收藏",
          "第一屏包装优先级高于功能堆叠",
          "一人做 MVP 的时间压缩叙事很有效"
        ],
        aiSummary:
          "AI 总结显示，VibeCoding 赛道当下最有效的内容框架是极短时间、具体收益、可视化结果，用户更想被激发行动冲动，而不是被教育技术细节。",
        topics: [
          {
            id: "vt1",
            title: "24 小时做出能卖的 AI 原型",
            description: "强调时间压缩与结果导向，展示一个从想法到落地页的完整过程。",
            whyNow: "高热内容都在强调速度与收益，能直接承接用户行动欲望。",
            potential: "适合做强节奏短视频，也适合拆成系列图文。"
          },
          {
            id: "vt2",
            title: "独立开发第一屏包装公式",
            description: "拆解高转化首页该如何表达价值、案例与可信度。",
            whyNow: "包装相关内容最近收藏率显著上升。",
            potential: "容易形成模板资产，也能延伸到咨询与课程方向。"
          }
        ]
      }
    ]
  }
];

const tabOptions: { key: TabKey; label: string; description: string }[] = [
  { key: "content", label: "内容", description: "按平台和日期浏览采集内容" },
  { key: "report", label: "选题分析与报告", description: "查看每日 AI 洞察与选题汇总" },
  { key: "settings", label: "监控设置", description: "管理平台、关键词和对标账号" }
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function PlatformBadge({ platform }: { platform: PlatformKey }) {
  const meta = platformMeta[platform];
  return (
    <span className="platform-badge" style={{ borderColor: meta.accent, color: meta.accent }}>
      {meta.label}
    </span>
  );
}

function ContentTab({
  activeCategory,
  activePlatform,
  setActivePlatform,
  activeContentDate,
  setActiveContentDate
}: {
  activeCategory: MonitorCategory;
  activePlatform: PlatformKey;
  setActivePlatform: (value: PlatformKey) => void;
  activeContentDate: string;
  setActiveContentDate: (value: string) => void;
}) {
  const selectedContentDay =
    activeCategory.contentByDate.find((item) => item.date === activeContentDate) ??
    activeCategory.contentByDate[0];

  const filteredContent = selectedContentDay.items.filter((item) => item.platform === activePlatform);

  return (
    <section className="content-view">
      <div className="control-card">
        <div className="section-heading">
          <span>平台筛选</span>
          <small>平铺按钮直接切换，不用下拉查找</small>
        </div>
        <div className="platform-grid">
          {activeCategory.platforms
            .filter((platform) => platform.enabled)
            .map((platform) => {
              const meta = platformMeta[platform.key];
              return (
                <button
                  key={platform.key}
                  type="button"
                  className={cn("platform-tile", activePlatform === platform.key && "active")}
                  onClick={() => setActivePlatform(platform.key)}
                >
                  <div className="platform-topline">
                    <strong>{meta.label}</strong>
                    <span className="platform-dot" style={{ backgroundColor: meta.accent }} />
                  </div>
                  <span>{platform.volume}</span>
                  <small>{platform.note}</small>
                </button>
              );
            })}
        </div>
      </div>

      <div className="control-card">
        <div className="section-heading">
          <span>时间线浏览</span>
          <small>用横向日期卡片展示当天采集量和热点摘要，降低选日期成本</small>
        </div>
        <div className="date-rail">
          {activeCategory.contentByDate.map((day) => (
            <button
              key={day.date}
              type="button"
              className={cn("date-card", activeContentDate === day.date && "active")}
              onClick={() => setActiveContentDate(day.date)}
            >
              <div className="date-card-top">
                <strong>{day.label}</strong>
                <span>{day.date}</span>
              </div>
              <div className="date-card-metrics">
                <span>{day.totalCount} 条内容</span>
                <span>峰值 {day.peakHeat}</span>
              </div>
              <p>{day.highlight}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="content-grid">
        <div className="timeline-card">
          <div className="section-heading">
            <span>
              {selectedContentDay.label} · {platformMeta[activePlatform].label} 内容
            </span>
            <small>{filteredContent.length} 条高相关内容</small>
          </div>

          <div className="timeline-list">
            {filteredContent.length > 0 ? (
              filteredContent.map((item) => (
                <article key={item.id} className="content-card">
                  <div className="content-time">
                    <span>{item.publishTime}</span>
                    <span className="heat-badge">热度 {item.heat}</span>
                  </div>
                  <div className="content-body">
                    <div className="content-headline">
                      <h3>{item.title}</h3>
                      <PlatformBadge platform={item.platform} />
                    </div>
                    <p className="content-meta">
                      {item.creator} · {item.engagement}
                    </p>
                    <p>{item.summary}</p>
                    <div className="tag-row">
                      {item.tags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <strong>这一天该平台暂无假数据</strong>
                <p>你可以保留这个空状态，用来模拟后续真实采集不足时的展示方式。</p>
              </div>
            )}
          </div>
        </div>

        <div className="insight-stack">
          <div className="mini-card">
            <span className="eyebrow">内容摘要</span>
            <strong>{selectedContentDay.highlight}</strong>
            <p>系统会优先标记当天最热视频或帖文的内容结构、话题切口和评论信号。</p>
          </div>
          <div className="mini-card">
            <span className="eyebrow">操作建议</span>
            <strong>推荐保留平台平铺 + 日期卡片轨道</strong>
            <p>这是原型里最适合高频筛选的方式，用户能先看线索再决定切哪天。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportTab({
  activeCategory,
  activeReportDate,
  setActiveReportDate,
  topicWindow,
  setTopicWindow
}: {
  activeCategory: MonitorCategory;
  activeReportDate: string;
  setActiveReportDate: (value: string) => void;
  topicWindow: "3d" | "7d" | "14d";
  setTopicWindow: (value: "3d" | "7d" | "14d") => void;
}) {
  const selectedReport =
    activeCategory.reports.find((item) => item.date === activeReportDate) ?? activeCategory.reports[0];

  const aggregatedTopics = useMemo(() => {
    const reportLimit = topicWindow === "3d" ? 1 : topicWindow === "7d" ? 3 : 14;
    return activeCategory.reports
      .slice(0, reportLimit)
      .flatMap((report) => report.topics.map((topic) => ({ ...topic, fromDate: report.date })));
  }, [activeCategory.reports, topicWindow]);

  return (
    <section className="report-view">
      <div className="report-grid">
        <div className="report-main">
          <div className="control-card">
            <div className="section-heading">
              <span>每日报告时间线</span>
              <small>默认打开最新报告，日期卡片直接给出摘要预览，避免用户盲选</small>
            </div>
            <div className="date-rail">
              {activeCategory.reports.map((report) => (
                <button
                  key={report.date}
                  type="button"
                  className={cn("date-card", activeReportDate === report.date && "active")}
                  onClick={() => setActiveReportDate(report.date)}
                >
                  <div className="date-card-top">
                    <strong>{report.focus}</strong>
                    <span>{report.date}</span>
                  </div>
                  <div className="date-card-metrics">
                    <span>{report.topics.length} 个选题</span>
                    <span>{report.hotSignals.length} 条信号</span>
                  </div>
                  <p>{report.headline}</p>
                </button>
              ))}
            </div>
          </div>

          <article className="report-card">
            <div className="report-header">
              <div>
                <span className="eyebrow">AI 选题分析</span>
                <h3>{selectedReport.headline}</h3>
              </div>
              <span className="report-date">{selectedReport.date}</span>
            </div>

            <p className="report-summary">{selectedReport.aiSummary}</p>

            <div className="signal-list">
              {selectedReport.hotSignals.map((signal) => (
                <div key={signal} className="signal-card">
                  <span>热点信号</span>
                  <strong>{signal}</strong>
                </div>
              ))}
            </div>

            <div className="topic-list">
              {selectedReport.topics.map((topic) => (
                <article key={topic.id} className="topic-card">
                  <div className="topic-title-row">
                    <h4>{topic.title}</h4>
                    <span className="topic-marker">推荐选题</span>
                  </div>
                  <p>{topic.description}</p>
                  <div className="topic-meta-block">
                    <strong>为什么做</strong>
                    <p>{topic.whyNow}</p>
                  </div>
                  <div className="topic-meta-block">
                    <strong>爆点与增长空间</strong>
                    <p>{topic.potential}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        <div className="report-side">
          <div className="mini-card">
            <div className="section-heading">
              <span>按选题汇总</span>
              <small>把最近一段时间的选题聚合浏览</small>
            </div>
            <div className="window-switcher">
              {[
                { key: "3d", label: "近 3 天" },
                { key: "7d", label: "近 7 天" },
                { key: "14d", label: "近 14 天" }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={cn("window-button", topicWindow === option.key && "active")}
                  onClick={() => setTopicWindow(option.key as "3d" | "7d" | "14d")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="aggregate-list">
            {aggregatedTopics.map((topic) => (
              <article key={`${topic.fromDate}-${topic.id}`} className="aggregate-card">
                <div className="aggregate-head">
                  <strong>{topic.title}</strong>
                  <span>{topic.fromDate}</span>
                </div>
                <p>{topic.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsTab({ activeCategory }: { activeCategory: MonitorCategory }) {
  return (
    <section className="settings-view">
      <div className="settings-grid">
        <div className="settings-card">
          <div className="section-heading">
            <span>监控平台</span>
            <small>按分类独立配置采集范围</small>
          </div>
          <div className="settings-list">
            {activeCategory.platforms.map((platform) => (
              <div key={platform.key} className="settings-row">
                <div>
                  <strong>{platformMeta[platform.key].label}</strong>
                  <p>{platform.note}</p>
                </div>
                <div className="settings-status">
                  <span className={cn("status-pill", platform.enabled && "active")}>
                    {platform.enabled ? "已启用" : "已关闭"}
                  </span>
                  <small>{platform.volume}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <div className="section-heading">
            <span>对标关键词</span>
            <small>支持多关键词并行监控</small>
          </div>
          <div className="keyword-cloud">
            {activeCategory.keywords.map((keyword) => (
              <span key={keyword} className="keyword-chip">
                {keyword}
              </span>
            ))}
            <button type="button" className="add-chip">
              + 添加关键词
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="section-heading">
            <span>对标博主 / 账号</span>
            <small>一个分类内可同时监控多个账号</small>
          </div>
          <div className="creator-list">
            {activeCategory.creators.map((creator) => (
              <div key={creator.name} className="creator-card">
                <div>
                  <strong>{creator.name}</strong>
                  <p>{creator.style}</p>
                </div>
                <div className="creator-meta">
                  <PlatformBadge platform={creator.platform} />
                  <small>{creator.updateRate}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-card schedule-card">
          <div className="section-heading">
            <span>自动运行计划</span>
            <small>系统设置完成后每日自动采集并输出 AI 报告</small>
          </div>
          <div className="schedule-panel">
            <strong>{activeCategory.cadence}</strong>
            <p>
              当前原型采用每日定时运行方案：先按平台抓取内容，再筛出热门样本，最后调用 OpenAI
              ChatGPT 生成选题建议与热点洞察。
            </p>
            <div className="schedule-steps">
              <span>1. 内容采集</span>
              <span>2. 热度筛选</span>
              <span>3. AI 分析</span>
              <span>4. 报告归档</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  const [activeCategoryId, setActiveCategoryId] = useState(monitorCategories[0].id);
  const [activeTab, setActiveTab] = useState<TabKey>("content");
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("douyin");
  const [activeContentDate, setActiveContentDate] = useState("03-27");
  const [activeReportDate, setActiveReportDate] = useState("03-27");
  const [topicWindow, setTopicWindow] = useState<"3d" | "7d" | "14d">("7d");

  const activeCategory =
    monitorCategories.find((item) => item.id === activeCategoryId) ?? monitorCategories[0];

  return (
    <main className="page-shell">
      <div className="backdrop-grid" />
      <aside className="sidebar">
        <div className="brand-block">
          <span className="eyebrow">Content Ops Console</span>
          <h1>内容监控工具</h1>
          <p>按分类管理多平台监控任务，自动汇总热门内容并生成 AI 选题洞察。</p>
        </div>

        <section className="sidebar-section">
          <div className="section-heading">
            <span>监控分类</span>
            <button type="button" className="ghost-button">
              + 新建分类
            </button>
          </div>
          <div className="category-list">
            {monitorCategories.map((category) => {
              const isActive = category.id === activeCategoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={cn("category-card", isActive && "active")}
                  onClick={() => {
                    setActiveCategoryId(category.id);
                    setActiveContentDate(category.contentByDate[0]?.date ?? "");
                    setActiveReportDate(category.reports[0]?.date ?? "");
                    const firstEnabled = category.platforms.find((platform) => platform.enabled)?.key;
                    if (firstEnabled) {
                      setActivePlatform(firstEnabled);
                    }
                  }}
                >
                  <div>
                    <strong>{category.name}</strong>
                    <p>{category.goal}</p>
                  </div>
                  <span>{category.cadence}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="sidebar-section">
          <div className="section-heading">
            <span>系统运行</span>
          </div>
          <div className="status-card">
            <div className="status-row">
              <span>任务频率</span>
              <strong>{activeCategory.cadence}</strong>
            </div>
            <div className="status-row">
              <span>今日已采集</span>
              <strong>{activeCategory.contentByDate[0]?.totalCount ?? 0} 条</strong>
            </div>
            <div className="status-row">
              <span>AI 分析状态</span>
              <strong>已完成</strong>
            </div>
          </div>
        </section>
      </aside>

      <section className="main-panel">
        <header className="hero-card">
          <div>
            <span className="eyebrow">当前分类</span>
            <h2>{activeCategory.name}</h2>
            <p>{activeCategory.goal}</p>
          </div>
          <div className="hero-metrics">
            <div className="metric-card">
              <span>监控平台</span>
              <strong>{activeCategory.platforms.filter((item) => item.enabled).length}</strong>
            </div>
            <div className="metric-card">
              <span>关键词</span>
              <strong>{activeCategory.keywords.length}</strong>
            </div>
            <div className="metric-card">
              <span>对标博主</span>
              <strong>{activeCategory.creators.length}</strong>
            </div>
          </div>
        </header>

        <nav className="tab-bar">
          {tabOptions.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn("tab-button", activeTab === tab.key && "active")}
              onClick={() => setActiveTab(tab.key)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.description}</span>
            </button>
          ))}
        </nav>

        {activeTab === "content" ? (
          <ContentTab
            activeCategory={activeCategory}
            activePlatform={activePlatform}
            setActivePlatform={setActivePlatform}
            activeContentDate={activeContentDate}
            setActiveContentDate={setActiveContentDate}
          />
        ) : null}

        {activeTab === "report" ? (
          <ReportTab
            activeCategory={activeCategory}
            activeReportDate={activeReportDate}
            setActiveReportDate={setActiveReportDate}
            topicWindow={topicWindow}
            setTopicWindow={setTopicWindow}
          />
        ) : null}

        {activeTab === "settings" ? <SettingsTab activeCategory={activeCategory} /> : null}
      </section>
    </main>
  );
}
