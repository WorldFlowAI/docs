---
sidebar_position: 6
title: Google Gemini-Compatible Proxy API
---

# Google Gemini-Compatible Proxy API

WorldFlow AI provides a drop-in replacement for the Google Gemini API. Point the `google-generativeai` SDK at the WorldFlow AI base URL and get transparent semantic caching with zero code changes.

> **Routing note:** WorldFlow AI uses `/v1beta/models/{model}/generateContent` instead of Gemini's `:generateContent` colon-prefix format. The `google-generativeai` Python SDK handles this automatically when you override the transport endpoint.

## Generate Content

```
POST /v1beta/models/{model}/generateContent
```

Fully compatible with the [Google Gemini generateContent API](https://ai.google.dev/api/generate-content#method:-models.generatecontent). WorldFlow AI checks the semantic cache before forwarding to Google.

### Request

Same schema as Gemini. Key fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contents` | array | yes | Conversation content (role + parts) |
| `generationConfig` | object | no | Generation parameters |

**Contents object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | no | `"user"` or `"model"` |
| `parts` | array | yes | Content parts (text, inlineData) |

**GenerationConfig object:**

| Field | Type | Description |
|-------|------|-------------|
| `temperature` | number | Sampling temperature |
| `topP` | number | Top-p (nucleus) sampling |
| `maxOutputTokens` | integer | Maximum response tokens |

### Example

```bash
curl -X POST https://api.worldflowai.com/v1beta/models/gemini-pro/generateContent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [{"text": "Explain semantic caching in 2 sentences."}]
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 200
    }
  }'
```

### Response

Same schema as Gemini, with an additional `synapse` metadata object:

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "Semantic caching stores LLM responses indexed by meaning rather than exact text. When a semantically similar query arrives, the cached response is returned instantly."
          }
        ]
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 12,
    "candidatesTokenCount": 34,
    "totalTokenCount": 46
  },
  "synapse": {
    "cache_hit": true,
    "similarity": 0.97,
    "source": "l2",
    "latency_ms": 12
  }
}
```

### Response Headers

| Header | Values | Description |
|--------|--------|-------------|
| `X-Cache-Status` | `HIT`, `MISS`, `BYPASS` | Whether the response was served from cache |
| `X-Request-ID` | UUID | Request identifier for debugging |

## Stream Generate Content

```
POST /v1beta/models/{model}/streamGenerateContent
```

Streaming version of content generation. Returns Server-Sent Events.

WorldFlow AI handles streaming for both cache hits and misses:

- **Cache miss**: Streams from Google while caching the full response
- **Cache hit**: Reconstructs the SSE stream from the cached response

```bash
curl -X POST https://api.worldflowai.com/v1beta/models/gemini-1.5-flash/streamGenerateContent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [{"text": "Write a short poem about caching."}]
      }
    ],
    "generationConfig": {
      "maxOutputTokens": 300
    }
  }'
```

## Count Tokens

```
POST /v1beta/models/{model}/countTokens
```

Estimate the token count for the given content. This endpoint is not cached.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contents` | array | yes | Content to count tokens for |

### Example

```bash
curl -X POST https://api.worldflowai.com/v1beta/models/gemini-pro/countTokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [{"text": "How many tokens is this?"}]
      }
    ]
  }'
```

### Response

```json
{
  "totalTokens": 6
}
```

## Embed Content

```
POST /v1beta/models/{model}/embedContent
```

Generate embeddings for the given content.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | object | yes | A single content object (role + parts) |

### Example

```bash
curl -X POST https://api.worldflowai.com/v1beta/models/embedding-001/embedContent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "parts": [{"text": "What is semantic caching?"}]
    }
  }'
```

### Response

```json
{
  "embedding": {
    "values": [0.0123, -0.0456, 0.0789, "..."]
  }
}
```

## List Models

```
GET /v1beta/models
```

Returns the list of available models in Gemini format.

```bash
curl https://api.worldflowai.com/v1beta/models \
  -H "Authorization: Bearer $TOKEN"
```

### Response

```json
{
  "models": [
    {
      "name": "models/gemini-pro",
      "displayName": "Gemini Pro",
      "description": "Google's Gemini Pro model",
      "inputTokenLimit": 30720,
      "outputTokenLimit": 2048
    },
    {
      "name": "models/gemini-1.5-flash",
      "displayName": "Gemini 1.5 Flash",
      "description": "Google's Gemini 1.5 Flash model",
      "inputTokenLimit": 1048576,
      "outputTokenLimit": 8192
    }
  ]
}
```

## Get Model

```
GET /v1beta/models/{model}
```

Get information about a specific model.

```bash
curl https://api.worldflowai.com/v1beta/models/gemini-pro \
  -H "Authorization: Bearer $TOKEN"
```

### Response

```json
{
  "name": "models/gemini-pro",
  "displayName": "Gemini Pro",
  "description": "Google's Gemini Pro model",
  "inputTokenLimit": 30720,
  "outputTokenLimit": 2048
}
```

## Python SDK

Point the `google-generativeai` SDK at WorldFlow AI by configuring a custom transport:

```python
import google.generativeai as genai

genai.configure(
    api_key="YOUR_SYNAPSE_JWT_TOKEN",
    transport="rest",
    client_options={"api_endpoint": "https://api.worldflowai.com"},
)

model = genai.GenerativeModel("gemini-pro")
response = model.generate_content("What is a REST API?")
print(response.text)
```

### Streaming

```python
import google.generativeai as genai

genai.configure(
    api_key="YOUR_SYNAPSE_JWT_TOKEN",
    transport="rest",
    client_options={"api_endpoint": "https://api.worldflowai.com"},
)

model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content("Explain caching strategies.", stream=True)
for chunk in response:
    print(chunk.text, end="")
```

### Token Counting

```python
model = genai.GenerativeModel("gemini-pro")
count = model.count_tokens("How many tokens is this?")
print(count.total_tokens)
```

### Embeddings

```python
result = genai.embed_content(
    model="models/embedding-001",
    content="What is semantic caching?",
)
print(result["embedding"][:5])  # first 5 dimensions
```

## Multi-Turn Conversations

Pass conversation history via the `contents` array with alternating `user` and `model` roles:

```bash
curl -X POST https://api.worldflowai.com/v1beta/models/gemini-pro/generateContent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "What is Python?"}]},
      {"role": "model", "parts": [{"text": "Python is a programming language."}]},
      {"role": "user", "parts": [{"text": "What are its main uses?"}]}
    ]
  }'
```

## Inline Data (Images)

Pass base64-encoded images via `inlineData`:

```bash
curl -X POST https://api.worldflowai.com/v1beta/models/gemini-1.5-flash/generateContent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {"text": "Describe this image."},
          {
            "inlineData": {
              "mimeType": "image/png",
              "data": "iVBORw0KGgo..."
            }
          }
        ]
      }
    ]
  }'
```

## Cache Behavior

### X-Cache-Status Header

Every response includes the `X-Cache-Status` header:

| Value | Description |
|-------|-------------|
| `HIT` | Response served from semantic cache |
| `MISS` | Response fetched from Google and cached |
| `BYPASS` | Cache was skipped (see below) |

### Synapse Metadata

Gemini responses include a `synapse` object with cache details:

| Field | Type | Description |
|-------|------|-------------|
| `cache_hit` | boolean | Whether the response was served from cache |
| `similarity` | number | Semantic similarity score (0.0 to 1.0) |
| `source` | string | Cache tier that produced the hit |
| `latency_ms` | integer | Cache lookup latency in milliseconds |

### Cache-Control Headers

| Header | Values | Description |
|--------|--------|-------------|
| `X-Synapse-Skip-Cache` | `true` or `1` | Bypass cache entirely (no lookup, no write) |
| `X-Synapse-Workspace-Context` | string | Workspace context for cache scoping |

```bash
# Bypass cache for this request
curl -X POST https://api.worldflowai.com/v1beta/models/gemini-pro/generateContent \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Synapse-Skip-Cache: true" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "Give me a fresh response."}]}
    ]
  }'
```

## Error Responses

Errors follow the standard WorldFlow AI envelope format:

```json
{
  "error": {
    "message": "model not found: gemini-nonexistent",
    "type": "not_found"
  }
}
```

See [API Overview](./overview) for the full list of HTTP status codes and error types.
