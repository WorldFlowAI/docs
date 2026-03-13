---
sidebar_position: 5
title: Anthropic-Compatible Proxy API
---

# Anthropic-Compatible Proxy API

WorldFlow AI provides a drop-in replacement for the Anthropic Messages API. Point Claude Code or your Anthropic SDK at the WorldFlow AI base URL for transparent semantic caching.

## Messages

```
POST /v1/messages
```

Fully compatible with the [Anthropic Messages API](https://docs.anthropic.com/en/api/messages). WorldFlow AI checks the semantic cache before forwarding to Anthropic.

### Request

Same schema as Anthropic. Key fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | yes | Model name (e.g., `"claude-sonnet-4-20250514"`) |
| `messages` | array | yes | Conversation messages |
| `max_tokens` | integer | yes | Maximum response tokens |
| `stream` | boolean | no | Enable streaming (default: false) |
| `system` | string/array | no | System prompt (supports `cache_control`) |
| `temperature` | number | no | Sampling temperature |
| `tools` | array | no | Tool definitions |

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | yes | `Bearer <synapse_token>` |
| `x-api-key` | alternative | Anthropic API key (for pass-through auth) |
| `anthropic-version` | yes | API version (e.g., `"2023-06-01"`) |
| `Content-Type` | yes | `application/json` |

### Example

```bash
curl -X POST https://api.worldflowai.com/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 200,
    "messages": [
      {"role": "user", "content": "Explain semantic caching in 2 sentences."}
    ]
  }'
```

### Response

Same schema as Anthropic:

```json
{
  "id": "msg_abc123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Semantic caching stores LLM responses indexed by meaning rather than exact text. When a semantically similar query arrives, the cached response is returned instantly."
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 18,
    "output_tokens": 35
  }
}
```

### Response Headers

| Header | Values | Description |
|--------|--------|-------------|
| `X-Cache-Status` | `HIT`, `MISS` | Whether the response was served from cache |
| `X-Request-ID` | UUID | Request identifier for debugging |

### Streaming

Set `"stream": true` for Server-Sent Events. WorldFlow AI handles streaming for both cache hits and misses:

```bash
curl -X POST https://api.worldflowai.com/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 200,
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### System Prompts with Cache Control

Anthropic's `cache_control` directive is supported:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 200,
  "system": [
    {
      "type": "text",
      "text": "You are a helpful coding assistant.",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [
    {"role": "user", "content": "Write a Python hello world"}
  ]
}
```

## Claude Code Integration

Claude Code routes through WorldFlow AI when `ANTHROPIC_BASE_URL` is set:

```bash
export ANTHROPIC_BASE_URL=https://api.worldflowai.com/v1
```

Or for local development:

```bash
export ANTHROPIC_BASE_URL=http://localhost:8080/v1
```

See [Claude Code Integration Guide](../guides/claude-code) for the full setup.

## Python SDK

```python
import anthropic

client = anthropic.Anthropic(
    base_url="https://api.worldflowai.com/v1",
    api_key="YOUR_SYNAPSE_JWT_TOKEN",
)

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=200,
    messages=[{"role": "user", "content": "What is a REST API?"}],
)
print(message.content[0].text)
```

## TypeScript SDK

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: "https://api.worldflowai.com/v1",
  apiKey: "YOUR_SYNAPSE_JWT_TOKEN",
});

const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 200,
  messages: [{ role: "user", content: "What is a REST API?" }],
});
console.log(message.content[0].text);
```
