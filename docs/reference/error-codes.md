---
title: Error Codes
description: Complete reference of WorldFlow AI error response format, error types, fine-grained error codes, transient versus permanent classification, and example payloads.
sidebar_position: 1
---

# Error Codes

All errors follow this response format:

```json
{
  "error": {
    "message": "Human-readable error description",
    "type": "error_type_identifier"
  }
}
```

## Error Types

| Type | HTTP Status | Retryable | Description |
|------|-------------|-----------|-------------|
| `authentication_error` | 401 | No | JWT token is missing, malformed, or expired |
| `authorization_error` | 403 | No | Valid token but insufficient role/permissions |
| `rate_limit_error` | 429 | Yes | Request rate exceeded. Response includes `retry_after_secs` |
| `validation_error` | 400 | No | Request body failed field validation (empty required field, exceeded length) |
| `invalid_request_error` | 400 | No | Malformed JSON, wrong content type, or structurally invalid request |
| `not_found` | 404 | No | Requested resource (project, branch, contributor, source) does not exist |
| `proxy_error` | 502 | Yes | Upstream LLM provider returned an error or is unreachable |
| `service_unavailable` | 503 | Yes | Internal dependency (embedding service, vector DB) is down |
| `timeout_error` | 504 | Yes | Request processing exceeded the configured timeout (default: 30s) |
| `embedding_error` | 503 | Yes | Embedding generation failed (service down or model error) |
| `internal_error` | 500 | Yes | Unexpected server error. May succeed on retry |
| `configuration_error` | 500 | No | Server misconfiguration (missing env vars, invalid settings) |
| `database_error` | 500 | Yes | PostgreSQL operation failed (connection, query, constraint) |

## Error Codes (Fine-Grained)

Within error types, specific error codes provide more detail:

| Code | Used When |
|------|-----------|
| `AUTH_INVALID_TOKEN` | Token is malformed or has an invalid signature |
| `AUTH_EXPIRED` | Token's `exp` claim is in the past |
| `AUTH_FORBIDDEN` | Token is valid but the user lacks the required permission |
| `VALIDATION_FAILED` | Request body validation failed |
| `SERVICE_UNAVAILABLE` | A required service (embedding, vector DB) is unreachable |
| `CONFIG_ERROR` | Server configuration is invalid |
| `LOG_NOT_FOUND` | The requested resource was not found |
| `INTERNAL_ERROR` | Catch-all for unexpected errors |

## Transient vs Permanent Errors

**Transient** (safe to retry with backoff):
- `rate_limit_error` --- wait `retry_after_secs` before retrying
- `proxy_error` --- upstream LLM provider may be temporarily overloaded
- `service_unavailable` --- embedding service may be restarting
- `timeout_error` --- request may succeed with a longer timeout or less data
- `embedding_error` --- embedding model may be loading
- `database_error` --- connection pool may be exhausted

**Permanent** (fix the request before retrying):
- `authentication_error` --- get a new token
- `authorization_error` --- request higher permissions
- `validation_error` --- fix the request body
- `invalid_request_error` --- fix the JSON structure
- `not_found` --- create the resource first
- `configuration_error` --- fix server configuration

## Examples

### Authentication Failed

```json
{
  "error": {
    "message": "authentication failed: token expired",
    "type": "authentication_error"
  }
}
```

### Validation Error

```json
{
  "error": {
    "message": "validation error: this_contribution cannot be empty",
    "type": "validation_error"
  }
}
```

### Rate Limited

```json
{
  "error": {
    "message": "rate limit exceeded: try again in 60 seconds",
    "type": "rate_limit_error",
    "retry_after_secs": 60
  }
}
```

### Not Found

```json
{
  "error": {
    "message": "not found: project 'nonexistent' does not exist",
    "type": "not_found"
  }
}
```
