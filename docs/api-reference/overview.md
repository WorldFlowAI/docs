---
sidebar_position: 1
title: API Overview
---

# API Overview

## Base URL

```
https://api.worldflowai.com
```

For local development:

```
http://localhost:8080
```

## Authentication

All requests require a JWT bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

See [Authentication](../authentication) for how to obtain tokens.

## Content Type

All request and response bodies use JSON:

```
Content-Type: application/json
```

## Field Naming Convention

All JSON fields use **camelCase**:

```json
{
  "projectId": "my-project",
  "branchName": "main",
  "branchPurpose": "Initial setup",
  "cumulativeProgress": "Completed onboarding",
  "thisContribution": "Added first milestone",
  "agentId": "my-agent",
  "agentType": "custom"
}
```

## Error Responses

All errors follow this envelope format:

```json
{
  "error": {
    "message": "Human-readable error description",
    "type": "error_type_identifier"
  }
}
```

Rate limit errors include a `retry_after_secs` field:

```json
{
  "error": {
    "message": "rate limit exceeded: try again in 60 seconds",
    "type": "rate_limit_error",
    "retry_after_secs": 60
  }
}
```

See [Error Codes](../reference/error-codes) for the full list of error types.

## HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created (new resource) |
| 400 | Bad request (validation failed) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 502 | Bad gateway (proxy upstream error) |
| 503 | Service unavailable (embedding service down) |
| 504 | Gateway timeout |

## Pagination

Endpoints that return lists support pagination via query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | varies | Maximum results to return |
| `offset` | integer | 0 | Number of results to skip |

## Response Headers

| Header | Description |
|--------|-------------|
| `X-Cache-Status` | `HIT` or `MISS` (proxy endpoints only) |
| `X-Request-ID` | Unique request identifier for debugging |

## API Groups

### Memory API

All memory endpoints are prefixed with `/api/v1/memory`.

| Group | Path Prefix | Endpoints |
|-------|-------------|-----------|
| Projects | `/projects` | 4 |
| Store | `/projects/{id}/store` | 1 |
| Recall | `/projects/{id}/recall` | 1 |
| Branches | `/projects/{id}/branches` | 4 |
| Merge | `/projects/{id}/merge` | 1 |
| Log | `/projects/{id}/log` | 1 |
| Roadmap | `/projects/{id}/roadmap` | 1 |
| Search | `/projects/{id}/search`, `/search` | 2 |
| Metrics | `/projects/{id}/metrics` | 2 |
| Promote | `/projects/{id}/promote` | 1 |
| Contributors | `/contributors` | 5 |
| Sources | `/sources` | 6 |
| Intelligence | `/intelligence` | 2 |

### Proxy API

Drop-in replacements for LLM provider APIs.

| Provider | Endpoint | Description |
|----------|----------|-------------|
| OpenAI | `POST /v1/chat/completions` | Chat completions with caching |
| OpenAI | `GET /v1/models` | List available models |
| Anthropic | `POST /v1/messages` | Messages API with caching |
| Gemini | `POST /v1beta/models/{model}/generateContent` | Content generation with caching |
| Gemini | `POST /v1beta/models/{model}/streamGenerateContent` | Streaming content generation |
| Gemini | `POST /v1beta/models/{model}/countTokens` | Token counting |
| Gemini | `POST /v1beta/models/{model}/embedContent` | Embeddings |
| Gemini | `GET /v1beta/models` | List available models |
| Gemini | `GET /v1beta/models/{model}` | Get model info |
| Cohere | `POST /v1/chat` | Chat with caching |
| Cohere | `POST /v1/generate` | Text generation (legacy) |
| Cohere | `POST /v1/embed` | Embeddings |

### Authentication API

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/token` | Exchange API key for JWT |

## Versioning

The API is versioned via URL path (`/v1/`). Breaking changes will increment the version number. Non-breaking additions (new fields, new endpoints) are made to the current version.
