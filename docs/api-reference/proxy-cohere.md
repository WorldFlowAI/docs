---
sidebar_position: 7
title: Cohere-Compatible Proxy API
---

# Cohere-Compatible Proxy API

WorldFlow AI provides a drop-in replacement for the Cohere API. Point the Cohere Python SDK at the WorldFlow AI base URL and get transparent semantic caching with zero code changes.

## Chat

```
POST /v1/chat
```

Fully compatible with the [Cohere Chat API](https://docs.cohere.com/reference/chat). WorldFlow AI checks the semantic cache before forwarding to Cohere. Supports both streaming and non-streaming responses.

### Request

Same schema as Cohere. Key fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | yes | The message to send |
| `model` | string | no | Model name (default: `"command-r-plus"`) |
| `stream` | boolean | no | Enable streaming (default: false) |
| `preamble` | string | no | System prompt / preamble |
| `chat_history` | array | no | Previous conversation turns |
| `conversation_id` | string | no | Conversation ID for multi-turn |
| `temperature` | number | no | Sampling temperature |
| `max_tokens` | integer | no | Maximum response tokens |
| `k` | integer | no | Top-k sampling |
| `p` | number | no | Top-p (nucleus) sampling |
| `stop_sequences` | array | no | Stop sequences |
| `frequency_penalty` | number | no | Frequency penalty |
| `presence_penalty` | number | no | Presence penalty |
| `tools` | array | no | Tool definitions |
| `documents` | array | no | Documents for RAG |
| `connectors` | array | no | Connectors for RAG |

**Chat history message object:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | yes | `"USER"` or `"CHATBOT"` |
| `message` | string | yes | Message content |

### Example

```bash
curl -X POST https://api.worldflowai.com/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain semantic caching in 2 sentences.",
    "model": "command-r-plus",
    "temperature": 0.7,
    "max_tokens": 200
  }'
```

### Response

Same schema as Cohere, with an additional `synapse` metadata object:

```json
{
  "response_id": "abc123",
  "text": "Semantic caching stores LLM responses indexed by meaning rather than exact text. When a semantically similar query arrives, the cached response is returned instantly.",
  "generation_id": "gen-456",
  "finish_reason": "COMPLETE",
  "chat_history": [
    {"role": "USER", "message": "Explain semantic caching in 2 sentences."},
    {"role": "CHATBOT", "message": "Semantic caching stores LLM responses..."}
  ],
  "meta": {
    "api_version": {"version": "1"},
    "billed_units": {"input_tokens": 12, "output_tokens": 34},
    "tokens": {"input_tokens": 12, "output_tokens": 34}
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

### Streaming

Set `"stream": true` to receive Server-Sent Events in Cohere's event format. WorldFlow AI handles streaming for both cache hits and misses:

- **Cache miss**: Streams from Cohere while caching the full response
- **Cache hit**: Reconstructs the SSE stream from the cached response

```bash
curl -X POST https://api.worldflowai.com/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "model": "command-r-plus",
    "stream": true
  }'
```

### Chat History

Pass previous conversation turns for multi-turn conversations:

```bash
curl -X POST https://api.worldflowai.com/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about neural networks",
    "model": "command-r-plus",
    "chat_history": [
      {"role": "USER", "message": "What is machine learning?"},
      {"role": "CHATBOT", "message": "Machine learning is a branch of AI..."}
    ]
  }'
```

### Preamble (System Prompt)

Use the `preamble` field for system-level instructions:

```bash
curl -X POST https://api.worldflowai.com/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain quantum computing",
    "model": "command-r-plus",
    "preamble": "You are a helpful physics tutor. Keep explanations simple.",
    "temperature": 0.7
  }'
```

### RAG with Documents

Pass documents for retrieval-augmented generation:

```bash
curl -X POST https://api.worldflowai.com/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What does the document say about caching?",
    "model": "command-r-plus",
    "documents": [
      {
        "id": "doc-1",
        "title": "Caching Guide",
        "text": "Semantic caching stores responses indexed by query meaning..."
      }
    ]
  }'
```

The response may include `citations` referencing the provided documents.

## Generate (Legacy)

```
POST /v1/generate
```

Cohere-compatible text generation endpoint. For new integrations, prefer `/v1/chat`.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | yes | The prompt to generate from |
| `model` | string | no | Model name (default: `"command"`) |
| `num_generations` | integer | no | Number of generations to return |
| `max_tokens` | integer | no | Maximum response tokens |
| `temperature` | number | no | Sampling temperature |
| `k` | integer | no | Top-k sampling |
| `p` | number | no | Top-p (nucleus) sampling |
| `frequency_penalty` | number | no | Frequency penalty |
| `presence_penalty` | number | no | Presence penalty |
| `stop_sequences` | array | no | Stop sequences |
| `return_likelihoods` | string | no | `"GENERATION"`, `"ALL"`, or `"NONE"` |

### Example

```bash
curl -X POST https://api.worldflowai.com/v1/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Once upon a time",
    "model": "command",
    "max_tokens": 500,
    "temperature": 0.9
  }'
```

### Response

```json
{
  "id": "gen-abc123",
  "generations": [
    {
      "id": "gen-item-1",
      "text": "Once upon a time, in a land of distributed systems, there lived a cache that understood meaning...",
      "finish_reason": "COMPLETE"
    }
  ],
  "prompt": "Once upon a time",
  "meta": {
    "api_version": {"version": "1"},
    "billed_units": {"input_tokens": 4, "output_tokens": 20},
    "tokens": {"input_tokens": 4, "output_tokens": 20}
  },
  "synapse": {
    "cache_hit": false,
    "similarity": 0.0,
    "source": "provider",
    "latency_ms": 450
  }
}
```

## Embed

```
POST /v1/embed
```

Generate embeddings for a list of texts.

### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `texts` | array | yes | Texts to embed (max 96 items) |
| `model` | string | no | Model name (default: `"embed-english-v3.0"`) |
| `input_type` | string | no | `"search_document"`, `"search_query"`, `"classification"`, or `"clustering"` |
| `truncate` | string | no | Truncation strategy: `"NONE"`, `"START"`, or `"END"` |

### Example

```bash
curl -X POST https://api.worldflowai.com/v1/embed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Hello world",
      "Machine learning is fascinating"
    ],
    "model": "embed-english-v3.0",
    "input_type": "search_document"
  }'
```

### Response

```json
{
  "id": "emb-abc123",
  "embeddings": [
    [0.0123, -0.0456, 0.0789, "..."],
    [0.0321, -0.0654, 0.0987, "..."]
  ],
  "texts": [
    "Hello world",
    "Machine learning is fascinating"
  ],
  "meta": {
    "api_version": {"version": "1"},
    "billed_units": {"input_tokens": 8}
  }
}
```

## Python SDK

Point the Cohere SDK at WorldFlow AI by setting the `base_url`:

```python
import cohere

client = cohere.Client(
    api_key="YOUR_SYNAPSE_JWT_TOKEN",
    base_url="https://api.worldflowai.com",
)

response = client.chat(
    message="What is a REST API?",
    model="command-r-plus",
)
print(response.text)
```

### Streaming

```python
import cohere

client = cohere.Client(
    api_key="YOUR_SYNAPSE_JWT_TOKEN",
    base_url="https://api.worldflowai.com",
)

for event in client.chat_stream(
    message="Explain caching strategies.",
    model="command-r-plus",
):
    if event.event_type == "text-generation":
        print(event.text, end="")
```

### RAG with Documents

```python
response = client.chat(
    message="Summarize this document.",
    model="command-r-plus",
    documents=[
        {"id": "doc-1", "title": "Guide", "text": "Semantic caching stores..."}
    ],
)
print(response.text)
for citation in response.citations or []:
    print(citation)
```

### Embeddings

```python
response = client.embed(
    texts=["What is semantic caching?", "How does vector search work?"],
    model="embed-english-v3.0",
    input_type="search_document",
)
print(len(response.embeddings[0]))  # embedding dimensions
```

### Text Generation (Legacy)

```python
response = client.generate(
    prompt="Once upon a time",
    model="command",
    max_tokens=500,
    temperature=0.9,
)
print(response.generations[0].text)
```

## Cache Behavior

### X-Cache-Status Header

Every response includes the `X-Cache-Status` header:

| Value | Description |
|-------|-------------|
| `HIT` | Response served from semantic cache |
| `MISS` | Response fetched from Cohere and cached |
| `BYPASS` | Cache was skipped (see below) |

### Synapse Metadata

Cohere responses include a `synapse` object with cache details:

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
curl -X POST https://api.worldflowai.com/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Synapse-Skip-Cache: true" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Give me a fresh response.",
    "model": "command-r-plus"
  }'
```

## Error Responses

Errors follow the standard WorldFlow AI envelope format:

```json
{
  "error": {
    "message": "model not found: command-nonexistent",
    "type": "not_found"
  }
}
```

See [API Overview](./overview) for the full list of HTTP status codes and error types.
