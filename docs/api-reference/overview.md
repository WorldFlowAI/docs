---
sidebar_position: 1
title: API Overview
---

# API Overview

The WorldFlow AI API provides programmatic access to memory-augmented LLM infrastructure. All endpoints follow RESTful conventions and return JSON responses.

## Base URL

```
https://api.worldflowai.com
```

All API requests must be made over HTTPS. Requests made over plain HTTP will be rejected.

## Authentication

Every request must include a valid JWT bearer token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

Obtain a token by calling the [Authentication API](./authentication-api) token exchange endpoint with your API key.

For full details on authentication flows, see [Authentication](../authentication).

## Content Type

All request bodies must be sent as JSON with the header:

```
Content-Type: application/json
```

All response bodies are returned as JSON with:

```
Content-Type: application/json; charset=utf-8
```

## Field Naming Convention

All JSON field names use **camelCase**:

```json
{
  "projectId": "proj_abc123",
  "createdAt": "2026-01-15T08:30:00Z",
  "memoryStore": {
    "totalEntries": 42,
    "lastUpdated": "2026-01-15T09:00:00Z"
  }
}
```

## Error Envelope

When an error occurs, the API returns a consistent error envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The 'projectId' field is required.",
    "details": {
      "field": "projectId",
      "reason": "missing_required_field"
    }
  }
}
```

| Field             | Type   | Description                                      |
|-------------------|--------|--------------------------------------------------|
| `error.code`      | string | Machine-readable error code                      |
| `error.message`   | string | Human-readable error description                 |
| `error.details`   | object | Optional additional context about the error      |

For a complete list of error codes and their meanings, see [Error Codes](../reference/error-codes).

## HTTP Status Codes

| Status | Meaning                 | When Used                                         |
|--------|-------------------------|---------------------------------------------------|
| `200`  | OK                      | Successful GET, PUT, PATCH, or DELETE              |
| `201`  | Created                 | Successful POST that creates a resource            |
| `204`  | No Content              | Successful DELETE with no response body            |
| `400`  | Bad Request             | Malformed request or invalid parameters            |
| `401`  | Unauthorized            | Missing or invalid authentication token            |
| `403`  | Forbidden               | Valid token but insufficient permissions           |
| `404`  | Not Found               | Resource does not exist                            |
| `409`  | Conflict                | Resource already exists or version conflict        |
| `422`  | Unprocessable Entity    | Valid JSON but semantically invalid                |
| `429`  | Too Many Requests       | Rate limit exceeded                                |
| `500`  | Internal Server Error   | Unexpected server error                            |
| `503`  | Service Unavailable     | Temporary service disruption or maintenance        |

## Pagination

List endpoints return paginated results. Use the `cursor` and `limit` query parameters:

```
GET /api/v1/projects?limit=20&cursor=eyJpZCI6MTAwfQ
```

| Parameter | Type    | Default | Description                                       |
|-----------|---------|---------|---------------------------------------------------|
| `limit`   | integer | 20      | Number of items per page (max 100)                 |
| `cursor`  | string  | —       | Opaque cursor from a previous response             |

Paginated responses include a `pagination` object:

```json
{
  "data": [ ... ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTIwfQ",
    "total": 350
  }
}
```

| Field                     | Type    | Description                                   |
|---------------------------|---------|-----------------------------------------------|
| `pagination.hasMore`      | boolean | Whether more results exist beyond this page   |
| `pagination.nextCursor`   | string  | Cursor to pass in the next request            |
| `pagination.total`        | integer | Total number of items (when available)        |

## Response Headers

Every response includes the following headers:

| Header                  | Description                                                    |
|-------------------------|----------------------------------------------------------------|
| `X-Request-Id`          | Unique identifier for the request (include in support tickets) |
| `X-RateLimit-Limit`     | Maximum requests allowed per window                            |
| `X-RateLimit-Remaining` | Requests remaining in the current window                       |
| `X-RateLimit-Reset`     | Unix timestamp when the rate limit window resets               |

## API Groups

The WorldFlow AI API is organized into three groups:

### Memory API

CRUD operations for projects, memory stores, recall, logging, branches, search, metrics, and more.

**Base path:** `/api/v1/`

See the full [Memory API Reference](./memory-api).

### Proxy API

OpenAI-compatible and Anthropic-compatible proxy endpoints that inject recalled memory into LLM requests.

**Base paths:**
- `/v1/chat/completions` — [OpenAI Proxy](./proxy-openai)
- `/v1/messages` — [Anthropic Proxy](./proxy-anthropic)

### Auth API

Token exchange and API key management.

**Base path:** `/api/v1/auth/`

See the [Authentication API Reference](./authentication-api).

## Versioning

The API is versioned via the URL path (`/api/v1/`). When breaking changes are introduced, a new version is published. The previous version remains available for a deprecation period of at least 12 months.

Non-breaking changes (new optional fields, new endpoints) may be added to the current version without a version bump. Always handle unknown JSON fields gracefully.

### Version Lifecycle

| Phase         | Duration   | Description                                         |
|---------------|------------|-----------------------------------------------------|
| **Current**   | —          | Actively developed, fully supported                 |
| **Deprecated**| 12 months  | Still functional, migration recommended             |
| **Sunset**    | —          | Removed, requests return `410 Gone`                 |

Deprecation notices are communicated via the `Sunset` and `Deprecation` response headers as well as email notifications to account owners.
