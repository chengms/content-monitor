# AI 选题洞察配置

复制 `.env.local.example` 为 `.env.local`，并填写以下变量：

- `OPENAI_API_KEY`：OpenAI 兼容模型服务的 API Key
- `OPENAI_BASE_URL`：兼容 OpenAI 协议的服务地址，例如 `https://api.openai.com/v1`
- `OPENAI_MODEL`：用于生成摘录与选题洞察的模型名
- `WECHAT_MONITOR_TOKEN`：公众号监控接口使用的 Bearer Token

当前实现使用服务端接口 `app/api/topic-insights/route.ts` 调用模型，不会在前端暴露密钥。
`app/api/wechat-articles/route.ts` 也通过服务端环境变量读取 `WECHAT_MONITOR_TOKEN`，避免把凭证写进仓库。
