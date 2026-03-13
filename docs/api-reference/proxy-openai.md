---
sidebar_position: 4
title: OpenAI Proxy
---

# OpenAI Proxy

The WorldFlow AI OpenAI Proxy provides a fully OpenAI-compatible endpoint that injects recalled memories into LLM requests. Use your existing OpenAI SDK with a one-line base URL change.

## Chat Completions

### Endpoint

```
POST https://api.worldflowai.com/v1/chat/completions
```

This endpoint is wire-compatible with the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create). All standard OpenAI parameters are supported.

### Request Headers

| Header                   | Value                    | Required | Description                                      |
|--------------------------|--------------------------|----------|--------------------------------------------------|
| `Authorization`          | `Bearer <jwt_token>`     | Yes      | WorldFlow AI JWT token                           |
| `Content-Type`           | `application/json`       | Yes      | Request content type                             |
| `X-WorldFlow-Project`    | `<project_id>`           | Yes      | Target project for memory recall                 |
| `X-WorldFlow-User`       | `<user_id>`              | No       | User identifier for personalized memory          |
| `X-WorldFlow-Session`    | `<session_id>`           | No       | Session identifier for conversation grouping     |
| `X-WorldFlow-Branch`     | `<branch_name>`          | No       | Memory branch (defaults to `"main"`)             |

### Request Body

Standard OpenAI Chat Completions request body. All fields are passed through to the upstream LLM provider.

| Field              | Type    | Required | Description                                          |
|--------------------|---------|----------|------------------------------------------------------|
| `model`            | string  | Yes      | Model identifier (e.g., `"gpt-4o"`, `"gpt-4o-mini"`)|
| `messages`         | array   | Yes      | Array of message objects                             |
| `temperature`      | number  | No       | Sampling temperature (0-2)                           |
| `top_p`            | number  | No       | Nucleus sampling parameter                           |
| `max_tokens`       | integer | No       | Maximum tokens in the response                       |
| `stream`           | boolean | No       | Enable streaming (default `false`)                   |
| `tools`            | array   | No       | Tool/function definitions                            |
| `tool_choice`      | string/object | No | Tool selection strategy                              |
| `response_format`  | object  | No       | Response format (e.g., `{"type": "json_object"}`)    |
| `n`                | integer | No       | Number of completions                                |
| `stop`             | string/array | No  | Stop sequences                                       |
| `presence_penalty` | number  | No       | Presence penalty (-2 to 2)                           |
| `frequency_penalty`| number  | No       | Frequency penalty (-2 to 2)                          |
| `logprobs`         | boolean | No       | Include log probabilities                            |
| `top_logprobs`     | integer | No       | Number of top log probabilities                      |
| `seed`             | integer | No       | Deterministic sampling seed                          |

### Example Request

```bash
curl -X POST https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-WorldFlow-Project: proj_abc123" \
  -H "X-WorldFlow-User: user_jane" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "system", "content": "You are a helpful customer support agent."},
      {"role": "user", "content": "What is my current subscription plan?"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

### Response

Standard OpenAI Chat Completions response with additional WorldFlow AI headers.

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1705312200,
  "model": "gpt-4o-2024-08-06",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Based on your account information, you're currently on the Pro plan, which you upgraded to on January 5th. Your plan includes..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 185,
    "completion_tokens": 67,
    "total_tokens": 252
  }
}
```

### Response Headers

In addition to the standard [response headers](./overview#response-headers), the proxy adds:

| Header                       | Description                                           |
|------------------------------|-------------------------------------------------------|
| `X-WorldFlow-Memories-Used`  | Number of memory entries injected into the prompt      |
| `X-WorldFlow-Cache-Status`   | `"HIT"`, `"MISS"`, or `"BYPASS"`                      |
| `X-WorldFlow-Recall-Ms`     | Time spent on memory recall (milliseconds)             |
| `X-WorldFlow-Total-Ms`      | Total proxy processing time (milliseconds)             |
| `X-WorldFlow-Model`         | Actual model used for the request                      |

### Streaming

Enable streaming by setting `"stream": true`. The proxy streams Server-Sent Events (SSE) in the standard OpenAI format:

```bash
curl -X POST https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-WorldFlow-Project: proj_abc123" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Explain our refund policy."}
    ],
    "stream": true
  }'
```

**Stream Response**

```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1705312200,"model":"gpt-4o","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1705312200,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Based"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1705312200,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":" on"},"finish_reason":null}]}

...

data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","created":1705312200,"model":"gpt-4o","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### Tool Calls

Tool calls (function calling) work identically to the OpenAI API. Define tools in the request and handle tool call responses as usual.

**Request with Tools**

```bash
curl -X POST https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-WorldFlow-Project: proj_abc123" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "Look up order #12345"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_order",
          "description": "Retrieve order details by order ID",
          "parameters": {
            "type": "object",
            "properties": {
              "order_id": {
                "type": "string",
                "description": "The order ID"
              }
            },
            "required": ["order_id"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'
```

**Tool Call Response**

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1705312200,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": null,
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "get_order",
              "arguments": "{\"order_id\": \"12345\"}"
            }
          }
        ]
      },
      "finish_reason": "tool_calls"
    }
  ],
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 25,
    "total_tokens": 145
  }
}
```

---

## Python SDK Example

Use the standard OpenAI Python SDK with a base URL override:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.worldflowai.com/v1",
    api_key="<your_jwt_token>",
    default_headers={
        "X-WorldFlow-Project": "proj_abc123",
        "X-WorldFlow-User": "user_jane",
    },
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What did we discuss last week?"},
    ],
    temperature=0.7,
    max_tokens=500,
)

print(response.choices[0].message.content)
```

### Streaming with Python

```python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Summarize my recent activity."},
    ],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="")
```

---

## TypeScript SDK Example

Use the standard OpenAI Node.js/TypeScript SDK:

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.worldflowai.com/v1",
  apiKey: "<your_jwt_token>",
  defaultHeaders: {
    "X-WorldFlow-Project": "proj_abc123",
    "X-WorldFlow-User": "user_jane",
  },
});

async function main() {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What did we discuss last week?" },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  console.log(response.choices[0].message.content);
}

main();
```

### Streaming with TypeScript

```typescript
const stream = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "user", content: "Summarize my recent activity." },
  ],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

---

## List Models

### Endpoint

```
GET https://api.worldflowai.com/v1/models
```

Returns the list of models available through the proxy.

### Request Headers

| Header          | Value                | Required |
|-----------------|----------------------|----------|
| `Authorization` | `Bearer <jwt_token>` | Yes      |

### Response

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4o",
      "object": "model",
      "created": 1705312200,
      "owned_by": "openai"
    },
    {
      "id": "gpt-4o-mini",
      "object": "model",
      "created": 1705312200,
      "owned_by": "openai"
    },
    {
      "id": "gpt-4-turbo",
      "object": "model",
      "created": 1705312200,
      "owned_by": "openai"
    },
    {
      "id": "claude-sonnet-4-20250514",
      "object": "model",
      "created": 1705312200,
      "owned_by": "anthropic"
    }
  ]
}
```

---

## Cache Behavior

The WorldFlow AI proxy implements intelligent caching to minimize latency and cost:

1. **Memory Recall Cache**: Recalled memories are cached per user/project/branch combination. Cache TTL is 60 seconds by default.
2. **Response Cache**: Identical requests (same messages, model, and parameters) may return cached responses when cache headers permit.
3. **Embedding Cache**: Embedding computations for recall queries are cached for 5 minutes.

### Cache Control Headers

Control caching behavior with request headers:

| Header                        | Values                     | Description                                  |
|-------------------------------|----------------------------|----------------------------------------------|
| `X-WorldFlow-Cache-Control`   | `no-cache`                 | Bypass all caches and force fresh recall      |
| `X-WorldFlow-Cache-Control`   | `no-store`                 | Do not cache this request or response         |
| `X-WorldFlow-Cache-Control`   | `max-age=<seconds>`        | Override default cache TTL                    |
| `X-WorldFlow-Cache-Control`   | `only-if-cached`           | Return cached response or 504                 |

**Example: Force Fresh Recall**

```bash
curl -X POST https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-WorldFlow-Project: proj_abc123" \
  -H "X-WorldFlow-Cache-Control: no-cache" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "What is my latest account status?"}
    ]
  }'
```

---

## Errors

The proxy returns standard OpenAI-format errors for compatibility:

```json
{
  "error": {
    "message": "Invalid model: gpt-5-ultra",
    "type": "invalid_request_error",
    "param": "model",
    "code": "model_not_found"
  }
}
```

WorldFlow AI-specific errors use the standard [error envelope](./overview#error-envelope):

| Code                    | Status | Description                                          |
|-------------------------|--------|------------------------------------------------------|
| `PROJECT_NOT_FOUND`     | 404    | The project specified in `X-WorldFlow-Project` does not exist |
| `RECALL_FAILED`         | 502    | Memory recall encountered an upstream error          |
| `UPSTREAM_TIMEOUT`      | 504    | The LLM provider did not respond in time             |
| `UPSTREAM_ERROR`        | 502    | The LLM provider returned an error                   |
| `MODEL_NOT_AVAILABLE`   | 400    | The requested model is not available through the proxy |

For the full list of error codes, see [Error Codes](../reference/error-codes).
