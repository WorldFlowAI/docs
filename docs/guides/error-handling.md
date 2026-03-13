---
title: Error Handling
description: Understand WorldFlow AI error response formats, error types, retry strategies with exponential backoff, common error fixes, and field validation limits.
sidebar_position: 6
---

# Error Handling

## Error Response Format

All WorldFlow AI API errors return a consistent JSON envelope:

```json
{
  "error": {
    "message": "Human-readable description of the error",
    "type": "error_type_identifier"
  }
}
```

Rate limit errors include an additional field:

```json
{
  "error": {
    "message": "rate limit exceeded: try again in 60 seconds",
    "type": "rate_limit_error",
    "retry_after_secs": 60
  }
}
```

## Error Types

| Type | HTTP Status | Retryable | Description |
|------|-------------|-----------|-------------|
| `authentication_error` | 401 | No | Missing, malformed, or expired JWT token |
| `authorization_error` | 403 | No | Valid token but insufficient permissions |
| `rate_limit_error` | 429 | Yes | Too many requests. Wait `retry_after_secs` |
| `validation_error` | 400 | No | Request body failed validation |
| `invalid_request_error` | 400 | No | Malformed JSON or invalid request format |
| `not_found` | 404 | No | Resource does not exist |
| `proxy_error` | 502 | Yes | Upstream LLM provider error |
| `service_unavailable` | 503 | Yes | Embedding service or dependency down |
| `timeout_error` | 504 | Yes | Request exceeded time limit |
| `embedding_error` | 503 | Yes | Embedding generation failed |
| `internal_error` | 500 | Yes | Unexpected server error |
| `configuration_error` | 500 | No | Server misconfiguration |
| `database_error` | 500 | Yes | Database operation failed |

## Retry Strategy

### Which Errors to Retry

Retry only **transient** errors: `rate_limit_error`, `proxy_error`, `service_unavailable`, `timeout_error`, `embedding_error`, `database_error`.

:::danger
Never retry: `authentication_error`, `authorization_error`, `validation_error`, `invalid_request_error`, `not_found`, `configuration_error`. Retrying these will never succeed and wastes resources.
:::

### Exponential Backoff (Python)

```python
import time
import requests


def call_with_retry(method, url, max_retries=3, **kwargs):
    for attempt in range(max_retries + 1):
        resp = requests.request(method, url, **kwargs)

        if resp.status_code == 429:
            retry_after = resp.json().get("error", {}).get("retry_after_secs", 60)
            time.sleep(retry_after)
            continue

        if resp.status_code in (502, 503, 504) and attempt < max_retries:
            wait = min(2 ** attempt, 30)  # 1s, 2s, 4s... max 30s
            time.sleep(wait)
            continue

        return resp

    return resp  # Return last response after all retries exhausted
```

### Exponential Backoff (TypeScript)

```typescript
async function callWithRetry(
  fn: () => Promise<Response>,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fn();

    if (resp.status === 429) {
      const body = await resp.json();
      const retryAfter = body.error?.retry_after_secs ?? 60;
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if ([502, 503, 504].includes(resp.status) && attempt < maxRetries) {
      const wait = Math.min(2 ** attempt * 1000, 30000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    return resp;
  }
  throw new Error("Max retries exceeded");
}
```

## Common Errors and Fixes

### 401: Token Expired

```json
{"error": {"message": "authentication failed: token expired", "type": "authentication_error"}}
```

**Fix**: Exchange your API key for a new JWT token. See [Authentication](/docs/authentication).

### 400: Validation Error

```json
{"error": {"message": "validation error: this_contribution cannot be empty", "type": "validation_error"}}
```

**Fix**: Check the required fields and field limits for the endpoint you are calling. See the field validation limits table below.

### 404: Project Not Found

```json
{"error": {"message": "not found: project 'nonexistent' does not exist", "type": "not_found"}}
```

**Fix**: Create the project first with `POST /api/v1/memory/projects`, or check the project ID for typos.

### 429: Rate Limited

```json
{"error": {"message": "rate limit exceeded: try again in 60 seconds", "type": "rate_limit_error", "retry_after_secs": 60}}
```

**Fix**: Wait the specified number of seconds before retrying. Implement exponential backoff (see above).

### 503: Embedding Service Down

```json
{"error": {"message": "service unavailable: embedding service not responding", "type": "service_unavailable"}}
```

**Fix**: This is transient. Retry with exponential backoff. If persistent, the embedding service may need a restart.

## Field Validation Limits

Requests that exceed these limits return `400 validation_error`:

| Field | Max Length |
|-------|-----------|
| `projectId` | 128 characters |
| `name` | 256 characters |
| `branchName` | 256 characters |
| `roadmap` | 10,000 characters |
| `branchPurpose` | 2,000 characters |
| `cumulativeProgress` | 50,000 characters |
| `thisContribution` | 10,000 characters |
| `content` (log) | 50,000 characters |
| `summary` (promote) | 10,000 characters |
| `query` (search) | 500 characters |
| `question` (intelligence) | 2,000 characters |
| `sessionId` | 128 characters |
| `contributorId` | 128 characters |
| `displayName` | 256 characters |
| `sourceId` | 128 characters |
| `limit` (search) | 1-100 |
| `limit` (cross-project search) | 1-200 |
| `contextLimit` (intelligence) | 1-200 |
| `reuseScore` (promote) | 0.0-1.0 |
| `timeRange` (intelligence) | `1d`, `7d`, `14d`, `30d`, `90d`, `all` |
| `sourceType` | `slack`, `jira`, `confluence`, `github` |
