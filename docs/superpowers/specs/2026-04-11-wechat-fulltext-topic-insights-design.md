# 2026-04-11 公众号全文优先选题洞察设计

## 目标

把当前“选题洞察”从基于轻量摘要的浅层分析，升级为“公众号全文优先”的高质量双阶段分析流程：

1. 只对当前选题下的微信公众号文章做深度分析
2. 固定选取热度最高的前 5 篇公众号文章
3. 第一阶段由 OpenAI 兼容模型对每篇全文做摘录、简析和结构化抽取
4. 第二阶段基于文章级结构化结果，生成至少 5 条结构化选题洞察
5. 洞察结果必须可回溯到支撑它的具体文章

## 现状问题

当前系统虽然已经有“两阶段分析”的接口结构，但还存在几个关键问题：

- `app/api/topic-insights/route.ts` 接收的是轻量内容列表，不是真正的文章全文
- 公众号上游接口虽然返回了 `content`，但当前只在前端被裁切成 120 字摘要
- `contents` 持久化结构没有保存正文，刷新后无法稳定复用全文重新分析
- “选题洞察”结果更接近通用总结，还不够像可执行的内容选题工作底稿

## 方案选择

### 方案 A：继续基于标题和摘要增强 prompt

优点：
- 改动最小

缺点：
- 无法真正利用原文细节
- 洞察质量提升有限

### 方案 B：公众号全文优先双阶段分析（推荐）

优点：
- 充分利用现有上游的 `content` 字段
- 能稳定输出更细的文章亮点和选题切角
- 改动范围可控，兼容当前页面结构

缺点：
- 需要扩展内容持久化结构和分析结果结构
- 模型调用成本和耗时会高于当前实现

### 方案 C：全平台统一全文分析

优点：
- 最终形态更完整

缺点：
- 当前其他平台没有稳定全文来源
- 范围明显超出本次目标

推荐：
- 第一版采用方案 B
- 其他平台暂不进入高质量洞察主链路

## 范围

### 本次包含

- 当前选题下公众号文章的 Top 5 筛选
- 公众号全文持久化
- 文章级 AI 结构化摘录增强
- 基于文章摘录的第二阶段选题洞察增强
- 报告页展示“仅分析公众号 Top 5”

### 本次不包含

- 非公众号平台的全文分析
- 用户自定义 Top N
- 洞察导出
- 人工编辑摘录结果
- 多轮 agent 式深推理工作流

## 核心流程

### 流程 1：公众号内容入池

1. `app/api/wechat-articles/route.ts` 从上游返回文章列表，其中已包含 `content`
2. 前端在映射 `WechatArticle -> ContentItem` 时保留正文原文
3. `contents` 持久化时写入正文字段，供后续分析复用

### 流程 2：Top 5 文章选择

1. 用户在“选题分析与报告”中选择一个选题
2. 系统从该选题归集内容中筛出 `platform = wechatOfficial` 的内容
3. 按现有 `heat` 倒序排序
4. 固定取前 5 篇作为高质量分析输入

### 流程 3：第一阶段文章级摘录

每篇文章把以下信息送入模型：

- `title`
- `creator`
- `publishTime`
- `heat`
- `engagementScore`
- `matchedKeywords`
- `aiTags`
- 去 HTML 后的正文纯文本

模型输出结构化字段，作为 `articleInsights`

### 流程 4：第二阶段选题洞察

把第一阶段 `articleInsights` 作为唯一主输入，生成至少 5 条 `topicInsights`

要求：

- 每条洞察必须足够具体
- 每条洞察必须关联 `relatedArticleIds`
- 输出结果应像内容团队可继续展开的选题卡片

## 数据结构设计

### ContentItem / StoredContentItem 新增字段

- `rawContent?: string`
  公众号原始正文内容，保留 HTML 或原始富文本字符串

- `plainTextContent?: string`
  可选的纯文本正文缓存，避免重复做 HTML 清洗

说明：
- 第一版至少需要持久化 `rawContent`
- `plainTextContent` 可以在分析时动态计算，也可以在入库时一起写入

### ArticleInsight 扩展字段

- `articleId`
- `title`
- `summary`
- `keyPoints`
- `keywords`
- `highlights`
- `hook`
- `contentAngle`
- `platformFit`
- `sourceSnippets`
  关键原文摘录片段，便于复核和后续再加工
- `originalSignals`
  说明这篇文章最值得借鉴的原文信号，如论据、冲突、表达方式、结构设计

### StructuredTopicInsight 扩展字段

- `id`
- `title`
- `summary`
- `whyNow`
- `growthPotential`
- `highlightPoints`
- `suggestedPlatforms`
- `relatedArticleIds`
- `contentBlueprint`
  说明这个选题可如何展开
- `targetAudience`
  说明更适合讲给谁

## 接口设计

### `POST /api/topic-insights`

建议收敛为以后端按 `topicId` 自行读取数据为主，而不是完全信任前端传入的轻量 `items`

请求参数：

- `topicId`
- `topicTitle`
- `categoryName`

服务端流程：

1. 读取当前选题关联内容
2. 过滤公众号内容
3. 选出 Top 5
4. 校验正文是否存在
5. 执行第一阶段文章级摘录
6. 执行第二阶段选题洞察
7. 持久化结果

失败策略：

- 没有公众号内容：返回明确提示
- 公众号内容不足 5 篇：使用实际篇数继续分析
- 文章缺少正文：跳过无正文文章并记录数量
- 有效文章为 0：返回错误，不生成洞察

## 页面展示设计

### 报告区头部

新增说明：

- 本次分析仅使用当前选题下的微信公众号文章
- 固定选取热度 Top 5
- 如果有效文章少于 5 篇，显示实际篇数

### 单篇摘录卡片

保留：

- 摘要
- 关键词
- 关键信息
- 亮点
- 钩子
- 内容角度

新增：

- 原文关键信号
- 关键原文片段

### 选题洞察卡片

保留：

- 标题
- 简述
- 为什么现在值得做
- 增长空间
- 亮点拆解
- 建议平台
- 关联文章

新增：

- 目标受众
- 内容展开建议

## 文件改动范围

高概率修改：

- `app/api/topic-insights/route.ts`
- `app/api/wechat-articles/route.ts`
- `app/page.tsx`
- `app/globals.css`
- `lib/topic-types.ts`
- `lib/db.ts`
- `lib/repositories/content-repository.ts`
- `lib/repositories/topic-repository.ts`
- `docs-ai-topic-insights.md`

低概率修改：

- `app/api/category-contents/route.ts`
- `app/api/topics/route.ts`

## 风险与取舍

### 风险 1：正文内容较长，模型调用成本上升

处理：
- 固定只取 Top 5
- 使用正文清洗和截断策略，优先保留前部、中部和结尾重点内容

### 风险 2：部分公众号文章正文为空或质量差

处理：
- 分析前过滤无正文文章
- 页面明确展示“有效分析文章数”

### 风险 3：旧数据不含正文

处理：
- 旧数据仍可展示，但无法进入高质量全文分析
- 用户重新同步公众号内容后可获得完整链路

## 验收标准

- 选题分析仅使用公众号文章进入高质量主链路
- 默认固定选取热度前 5 篇公众号文章
- 文章级摘录使用正文而不是只有摘要
- 每次分析至少尝试输出 5 条结构化选题洞察
- 每条洞察都能关联支撑文章
- 页面能明确说明“公众号全文优先”和“Top 5”规则
