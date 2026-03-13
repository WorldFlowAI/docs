---
sidebar_position: 4
title: OpenAI-Compatible Proxy API
---

# OpenAI-Compatible Proxy API

WorldFlow AI provides a drop-in replacement for the OpenAI API. Point your existing OpenAI SDK at the WorldFlow AI base URL and get transparent semantic caching with zero code changes.

## Chat Completions

```
POST /v1/chat/completions
```

Fully compatible with the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create). WorldFlow AI checks the semantic cache before forwarding to OpenAI.

### Request

Same schema as OpenAI. Key fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | yes | Model name (e.g., `"gpt-4o"`, `"gpt-4o-mini"`) |
| `messages` | array | yes | Conversation messages |
| `stream` | boolean | no | Enable streaming (default: false) |
| `temperature` | number | no | Sampling temperature |
| `max_tokens` | integer | no | Maximum response tokens |
| `tools` | array | no | Tool/function definitions |
| `tool_choice` | string/object | no | Tool selection strategy |

### Example

```bash
curl -X POST https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain semantic caching in 2 sentences."}
    ],
    "temperature": 0.7,
    "max_tokens": 200
  }'
```

### Response

Same schema as OpenAI, with additional headers:

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Semantic caching stores LLM responses indexed by the meaning of queries rather than exact text matches. When a new query is semantically similar to a cached one, the stored response is returned instantly, saving both cost and latency."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 42,
    "total_tokens": 67
  }
}
```

### Response Headers

| Header | Values | Description |
|--------|--------|-------------|
| `X-Cache-Status` | `HIT`, `MISS` | Whether the response was served from cache |
| `X-Request-ID` | UUID | Request identifier for debugging |

### Streaming

Set `"stream": true` to receive Server-Sent Events (SSE). WorldFlow AI handles streaming for both cache hits and misses:

- **Cache miss**: Streams from OpenAI while caching the full response
- **Cache hit**: Reconstructs the SSE stream from the cached response

```bash
curl -X POST https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### Tool Calls

Tool calls (function calling) are supported. The request and response formats match OpenAI exactly.

### Python SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.worldflowai.com/v1",
    api_key="YOUR_SYNAPSE_JWT_TOKEN",
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is a REST API?"}],
)
print(response.choices[0].message.content)
```

### TypeScript SDK

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.worldflowai.com/v1",
  apiKey: "YOUR_SYNAPSE_JWT_TOKEN",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What is a REST API?" }],
});
console.log(response.choices[0].message.content);
```

## List Models

```
GET /v1/models
```

Returns the list of available models.

```bash
curl https://api.worldflowai.com/v1/models \
  -H "Authorization: Bearer $TOKEN"
```

### Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4o",
      "object": "model",
      "created": 1700000000,
      "owned_by": "openai"
    }
  ]
}
```

## Cache Behavior

### What Gets Cached

The cache key is derived from the semantic embedding of the user's messages. Identical or semantically similar queries produce cache hits.

### What Bypasses Cache

- Requests with `"stream": true` and unique system prompts may have lower hit rates
- Tool call responses are cached based on the query, not the tool output
- Set `X-Synapse-Skip-Cache: true` header to bypass caching for a specific request

### Cache-Control Headers

| Header | Values | Description |
|--------|--------|-------------|
| `X-Synapse-Skip-Cache` | `true` | Bypass cache for this request |
| `X-Synapse-Workspace-Context` | string | Workspace context for cache scoping |
| `X-Synapse-Code-Context` | JSON | Detailed code context for cache invalidation |

## Multi-Turn Context Caching

WorldFlow AI implements the [ContextCache](https://arxiv.org/abs/2506.22791) paper's two-stage retrieval architecture for intelligent multi-turn conversation caching. This allows cache hits for conversations that are **semantically similar** (not just identical).

### How It Works

1. **Turn Embeddings**: Each message in the conversation is embedded independently
2. **Context Fusion**: Turn embeddings are fused via multi-head self-attention into a single context embedding
3. **Stage 1 (Coarse)**: HNSW search finds candidates by last query embedding similarity (>=0.85)
4. **Stage 2 (Fine)**: Candidates are scored using weighted combination:
   ```
   final_score = 0.3 * query_similarity + 0.7 * context_similarity
   ```
   Cache hit requires `final_score >= 0.92`

### Enabling Context Caching

Context caching is **enabled by default**. For optimal cache reuse, clients should provide a consistent `session_id`:

```bash
curl -X POST https://api.worldflowai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "model": "gpt-4o-mini",
    "session_id": "user-123-session-abc",
    "messages": [
      {"role": "user", "content": "What is Python?"},
      {"role": "assistant", "content": "Python is a programming language."},
      {"role": "user", "content": "Tell me more"}
    ]
  }'
```

**Important**: Without `session_id`, a new UUID is generated per request, which prevents session-level turn embedding reuse.

### Context Cache Response

The response includes a `synapse_metadata` object with cache status details:

```json
{
  "choices": [...],
  "synapse_metadata": {
    "cache_hit": true,
    "cache_tier": "l2_context",
    "similarity": 1.0,
    "context_similarity": 0.95,
    "session_id": "user-123-session-abc"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cache_hit` | boolean | Whether the response was served from cache |
| `cache_tier` | string | Cache tier that produced the hit (e.g., `"l2_context"`) |
| `similarity` | number | Query similarity score |
| `context_similarity` | number | Context similarity score from Stage 2 |
| `session_id` | string | Session identifier used for this request |

### Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SYNAPSE_CONTEXT_CACHE__ENABLED` | Enable context-aware caching | `true` |
| `SYNAPSE_CONTEXT_CACHE__STAGE1_THRESHOLD` | Stage 1 query similarity threshold | `0.85` |
| `SYNAPSE_CONTEXT_CACHE__CONTEXT_HIT_THRESHOLD` | Final score threshold for cache hit | `0.92` |
| `SYNAPSE_CONTEXT_CACHE__QUERY_WEIGHT` | Weight for query similarity | `0.3` |
| `SYNAPSE_CONTEXT_CACHE__CONTEXT_WEIGHT` | Weight for context similarity | `0.7` |
| `SYNAPSE_CONTEXT_CACHE__MAX_TURNS` | Maximum turns to consider | `20` |
