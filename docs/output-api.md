# Output API

用于给文章创作平台提供只读数据源。

## Topics

### `GET /api/output/topics`

查询参数：

- `categoryId`
- `status`
- `keyword`
- `limit`
- `offset`

返回：

```json
{
  "items": [
    {
      "id": "topic-1",
      "categoryId": "cat-ai",
      "title": "AI Agent 选题",
      "description": "聚焦智能体工作流",
      "goal": "给内容平台供稿",
      "status": "analyzed",
      "keywords": ["agent", "workflow"],
      "articleCount": 5,
      "lastAnalysisAt": "2026-04-13T09:00:00.000Z",
      "analysisSummary": "最近一次分析摘要",
      "topInsightTitles": ["角度 1", "角度 2"],
      "updatedAt": "2026-04-13T09:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

### `GET /api/output/topics/[topicId]`

返回单个选题的完整创作参考包：

- `topic`
- `analysis`
- `topicInsights`
- `articleInsights`
- `sourceArticles`
- `recommendedAngles`

## Articles

### `GET /api/output/articles`

查询参数：

- `categoryId`
- `topicId`
- `platform`
- `keyword`
- `limit`
- `offset`

返回：

```json
{
  "items": [
    {
      "id": "article-1",
      "categoryId": "cat-ai",
      "title": "用多 Agent 做内容生产",
      "creator": "内容实验室",
      "platform": "wechatOfficial",
      "publishTime": "09:30",
      "date": "2026-04-11",
      "heat": 96,
      "engagementScore": 88,
      "summary": "文章摘要",
      "matchedKeywords": ["agent"],
      "aiTags": ["工作流"],
      "topicIds": ["topic-1"],
      "topicTitles": ["AI Agent 选题"],
      "hasRawContent": true,
      "hasInsight": true
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

### `GET /api/output/articles/[articleId]`

返回单篇文章完整参考数据：

- `article`
- `insight`
- `topics`
- `relatedTopicInsights`
- `contentReference`
