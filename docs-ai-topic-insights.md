# AI 选题洞察说明

复制 `.env.local.example` 为 `.env.local`，然后配置以下变量：

- `OPENAI_API_KEY`：OpenAI 或兼容模型服务的 API Key
- `OPENAI_BASE_URL`：兼容 OpenAI 的服务地址，默认 `https://api.openai.com/v1`
- `OPENAI_MODEL`：用于文章摘录和选题洞察的模型名
- `WECHAT_MONITOR_TOKEN`：公众号监控接口使用的 Bearer Token

当前实现通过服务端接口 `app/api/topic-insights/route.ts` 调用模型，避免在前端暴露密钥。
`app/api/wechat-articles/route.ts` 也通过服务端代理方式读取 `WECHAT_MONITOR_TOKEN`。

## 当前分析策略

- 仅对当前选题下的微信公众号文章执行高质量全文分析
- 固定按热度选取 Top 5 公众号文章进入 AI 主链路
- 第一阶段先基于全文做结构化文章摘录
- 第二阶段再基于文章摘录生成至少 5 条结构化选题洞察

## 注意事项

- 如果当前选题下没有公众号文章，分析会直接返回错误提示
- 如果公众号文章存在但没有正文，系统会跳过无正文文章
- 旧数据如果只保存了摘要，没有保存正文，需要重新同步公众号内容后才能进入全文分析链路
