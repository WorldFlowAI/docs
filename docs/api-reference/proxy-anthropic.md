---
sidebar_position: 5
title: Anthropic Proxy
---

# Anthropic Proxy

The WorldFlow AI Anthropic Proxy provides a fully Anthropic-compatible endpoint that injects recalled memories into Claude requests. Use your existing Anthropic SDK with a one-line base URL change.

## Messages

### Endpoint

```
POST https://api.worldflowai.com/v1/messages
```

This endpoint is wire-compatible with the [Anthropic Messages API](https://docs.anthropic.com/en/api/messages). All standard Anthropic parameters are supported.

### Request Headers

| Header                   | Value                    | Required | Description                                      |
|--------------------------|--------------------------|----------|--------------------------------------------------|
| `Authorization`          | `Bearer <jwt_token>`     | Yes      | WorldFlow AI JWT token                           |
| `Content-Type`           | `application/json`       | Yes      | Request content type                             |
| `anthropic-version`      | `2023-06-01`             | Yes      | Anthropic API version                            |
| `X-WorldFlow-Project`    | `<project_id>`           | Yes      | Target project for memory recall                 |
| `X-WorldFlow-User`       | `<user_id>`              | No       | User identifier for personalized memory          |
| `X-WorldFlow-Session`    | `<session_id>`           | No       | Session identifier for conversation grouping     |
| `X-WorldFlow-Branch`     | `<branch_name>`          | No       | Memory branch (defaults to `"main"`)             |

### Request Body

Standard Anthropic Messages request body. All fields are passed through to the upstream provider.

| Field              | Type    | Required | Description                                                    |
|--------------------|---------|----------|----------------------------------------------------------------|
| `model`            | string  | Yes      | Model identifier (e.g., `"claude-sonnet-4-20250514"`)  |
| `messages`         | array   | Yes      | Array of message objects                                       |
| `max_tokens`       | integer | Yes      | Maximum tokens in the response                                 |
| `system`           | string/array | No  | System prompt (string or content block array)                  |
| `temperature`      | number  | No       | Sampling temperature (0-1)                                     |
| `top_p`            | number  | No       | Nucleus sampling parameter                                     |
| `top_k`            | integer | No       | Top-K sampling parameter                                       |
| `stream`           | boolean | No       | Enable streaming (default `false`)                             |
| `tools`            | array   | No       | Tool definitions                                               |
| `tool_choice`      | object  | No       | Tool selection strategy                                        |
| `stop_sequences`   | array   | No       | Custom stop sequences                                          |
| `metadata`         | object  | No       | Request metadata (e.g., `{"user_id": "user_jane"}`)            |

### Example Request

```bash
curl -X POST https://api.worldflowai.com/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-WorldFlow-Project: proj_abc123" \
  -H "X-WorldFlow-User: user_jane" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "system": "You are a helpful customer support agent.",
    "messages": [
      {"role": "user", "content": "What is my current subscription plan?"}
    ]
  }'
```

### Response

Standard Anthropic Messages response with additional WorldFlow AI headers.

```json
{
  "id": "msg_abc123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Based on your account information, you're currently on the Pro plan, which you upgraded to on January 5th. Your plan includes..."
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 195,
    "output_tokens": 72
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

---

## Streaming

Enable streaming by setting `"stream": true`. The proxy streams Server-Sent Events (SSE) in the standard Anthropic format:

```bash
curl -X POST https://api.worldflowai.com/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -H "X-WorldFlow-Project: proj_abc123" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Explain our refund policy."}
    ],
    "stream": true
  }'
```

**Stream Response**

```
event: message_start
data: {"type":"message_start","message":{"id":"msg_abc123","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":195,"output_tokens":0}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Based"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" on your"}}

...

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":72}}

event: message_stop
data: {"type":"message_stop"}
```

---

## System Prompts with Cache Control

The Anthropic API supports structured system prompts with `cache_control` for prompt caching. The WorldFlow AI proxy passes these through and injects recalled memories as additional system content blocks.

### String System Prompt

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "system": "You are a helpful assistant with expertise in billing.",
  "messages": [
    {"role": "user", "content": "How do I update my payment method?"}
  ]
}
```

### Structured System Prompt with Cache Control

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "system": [
    {
      "type": "text",
      "text": "You are a helpful customer support agent for WorldFlow AI. You have access to the following knowledge base...",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "Today's date is 2026-01-15. Current promotions include..."
    }
  ],
  "messages": [
    {"role": "user", "content": "Are there any active promotions?"}
  ]
}
```

When `cache_control` is set to `{"type": "ephemeral"}`, Anthropic caches that content block across requests, reducing input token costs for repeated system prompts.

**How memory injection works with system prompts:**

1. WorldFlow AI recalls relevant memories from the project.
2. Memories are injected as an additional system content block after your existing system content.
3. Your `cache_control` settings on existing blocks are preserved.
4. The injected memory block does not include `cache_control` by default (since memories change per query).

---

## Claude Code Integration

WorldFlow AI can be used as a drop-in backend for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Configure the proxy URL to give Claude Code access to project memory.

### Configuration

Set the following environment variables:

```bash
export ANTHROPIC_BASE_URL="https://api.worldflowai.com"
export ANTHROPIC_API_KEY="<your_jwt_token>"
```

Add WorldFlow AI headers via a configuration file or wrapper:

```bash
# ~/.config/claude-code/config.json
{
  "apiBaseUrl": "https://api.worldflowai.com",
  "defaultHeaders": {
    "X-WorldFlow-Project": "proj_abc123",
    "X-WorldFlow-User": "developer_jane"
  }
}
```

With this configuration, every Claude Code request automatically benefits from project memory -- previous conversations, codebase context, and team knowledge are recalled and injected into prompts.

---

## Python SDK Example

Use the standard Anthropic Python SDK with a base URL override:

```python
import anthropic

client = anthropic.Anthropic(
    base_url="https://api.worldflowai.com",
    api_key="<your_jwt_token>",
    default_headers={
        "X-WorldFlow-Project": "proj_abc123",
        "X-WorldFlow-User": "user_jane",
    },
)

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system="You are a helpful assistant.",
    messages=[
        {"role": "user", "content": "What did we discuss last week?"},
    ],
)

print(message.content[0].text)
```

### Streaming with Python

```python
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Summarize my recent activity."},
    ],
) as stream:
    for text in stream.text_stream:
        print(text, end="")
```

### Prompt Caching with Python

```python
message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "You are a helpful customer support agent. Here is the full product documentation: ...",
            "cache_control": {"type": "ephemeral"},
        }
    ],
    messages=[
        {"role": "user", "content": "How do I reset my password?"},
    ],
)
```

---

## TypeScript SDK Example

Use the standard Anthropic TypeScript SDK:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: "https://api.worldflowai.com",
  apiKey: "<your_jwt_token>",
  defaultHeaders: {
    "X-WorldFlow-Project": "proj_abc123",
    "X-WorldFlow-User": "user_jane",
  },
});

async function main() {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: "You are a helpful assistant.",
    messages: [
      { role: "user", content: "What did we discuss last week?" },
    ],
  });

  console.log(message.content[0].text);
}

main();
```

### Streaming with TypeScript

```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Summarize my recent activity." },
  ],
});

stream.on("text", (text) => {
  process.stdout.write(text);
});

await stream.finalMessage();
```

---

## Multi-turn Conversations

Multi-turn conversations work identically to the standard Anthropic API. Include the full message history in each request:

```python
messages = [
    {"role": "user", "content": "What is my subscription plan?"},
    {"role": "assistant", "content": "You're on the Pro plan."},
    {"role": "user", "content": "When does it renew?"},
]

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=messages,
)
```

WorldFlow AI recalls memories based on the full conversation context, not just the latest message. This means earlier turns contribute to more relevant memory retrieval.

---

## Errors

The proxy returns standard Anthropic-format errors for compatibility:

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "max_tokens: field required"
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
| `INVALID_API_VERSION`   | 400    | The `anthropic-version` header value is not supported |

For the full list of error codes, see [Error Codes](../reference/error-codes).
