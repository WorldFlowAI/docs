---
sidebar_position: 8
title: MCP Server API
---

# MCP Server API Reference

All endpoints are prefixed with `/api/v1/mcp` unless otherwise noted. All requests require a JWT bearer token. Results are scoped to your tenant (workspace).

Base URL: `https://api.worldflowai.com`

---

## Server Management

### List MCP Servers

```
GET /api/v1/mcp/servers
```

List all registered MCP servers for the authenticated workspace. Supports pagination and filtering.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `status` | query | string | no | Filter by status: `PENDING`, `HEALTHY`, `DEGRADED`, `DOWN`, `DISABLED` |
| `name` | query | string | no | Search by name (partial match) |
| `page` | query | integer | no | Page number (default 1) |
| `pageSize` | query | integer | no | Results per page (default 20) |

```bash
curl "https://api.worldflowai.com/api/v1/mcp/servers?status=HEALTHY" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "servers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Atlassian MCP",
      "description": "JIRA and Confluence integration",
      "url": "https://mcp.example.com:9001",
      "transport": "HTTP",
      "authType": "API_KEY",
      "status": "HEALTHY",
      "healthLatencyP50Ms": 45,
      "healthLatencyP99Ms": 120,
      "lastHealthCheck": "2026-03-13T10:30:00Z",
      "lastError": null,
      "createdAt": "2026-03-12T08:00:00Z",
      "updatedAt": "2026-03-13T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### Register MCP Server

```
POST /api/v1/mcp/servers
```

Register a new MCP server. The server is created with `PENDING` status until its health check succeeds.

URLs pointing to localhost or internal IPs are blocked to prevent SSRF attacks.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | yes | max 128 chars | Human-readable name |
| `description` | string | no | max 2000 chars | Optional description |
| `url` | string | yes | max 2048 chars | Server URL |
| `transport` | string | no | `HTTP`, `STDIO`, `SSE` (default `HTTP`) | MCP transport protocol |
| `authType` | string | no | `NONE`, `API_KEY`, `OAUTH`, `MTLS` (default `NONE`) | Authentication method |
| `authConfig` | object | no | | Authentication configuration (see below) |

**`authConfig` fields** (vary by `authType`):

| Field | Applies To | Description |
|-------|------------|-------------|
| `type` | all | Must match `authType` |
| `header` | API_KEY | HTTP header name (e.g., `Authorization`) |
| `valueEnv` | API_KEY | Environment variable containing the key value |
| `tokenUrl` | OAUTH | OAuth token endpoint URL |
| `clientId` | OAUTH | OAuth client ID |
| `clientSecretEnv` | OAUTH | Environment variable for client secret |
| `scopes` | OAUTH | Array of OAuth scopes |
| `certPath` | MTLS | Path to client certificate |
| `keyPath` | MTLS | Path to client key |
| `caPath` | MTLS | Path to CA certificate |

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub MCP",
    "description": "GitHub integration via MCP",
    "url": "https://github-mcp.example.com",
    "transport": "HTTP",
    "authType": "API_KEY",
    "authConfig": {
      "type": "API_KEY",
      "header": "Authorization",
      "valueEnv": "GITHUB_TOKEN"
    }
  }'
```

**Response (200)**

```json
{
  "server": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "GitHub MCP",
    "description": "GitHub integration via MCP",
    "url": "https://github-mcp.example.com",
    "transport": "HTTP",
    "authType": "API_KEY",
    "status": "PENDING",
    "createdAt": "2026-03-13T10:00:00Z",
    "updatedAt": "2026-03-13T10:00:00Z"
  },
  "message": "Server registered successfully"
}
```

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 400 | `validation_error` | Invalid request body or blocked URL (SSRF prevention) |
| 401 | `authentication_error` | Missing or invalid bearer token |
| 403 | `permission_error` | Insufficient permissions |

---

### Get MCP Server

```
GET /api/v1/mcp/servers/{id}
```

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Server ID |

```bash
curl https://api.worldflowai.com/api/v1/mcp/servers/{id} \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Same shape as a single item in the `servers` array from [List MCP Servers](#list-mcp-servers).

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Server not found |

---

### Delete MCP Server

```
DELETE /api/v1/mcp/servers/{id}
```

Remove an MCP server and all associated tools, entity mappings, and invalidation rules. This action is irreversible.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Server ID |

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/mcp/servers/{id} \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "deleted": true,
  "message": "Server and associated resources deleted"
}
```

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Server not found |

---

### Check Server Health

```
GET /api/v1/mcp/servers/{id}/health
```

Perform a health check. Results are cached for 30 seconds. Includes observability metrics:
- `access_count`: total cache hits
- `avg_latency_ms`: average operation latency (exponential moving average)
- `error_rate`: error occurrence rate (exponential moving average)

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Server ID |

```bash
curl https://api.worldflowai.com/api/v1/mcp/servers/{id}/health \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "serverId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "HEALTHY",
  "latencyP50Ms": 42,
  "latencyP99Ms": 115,
  "error": null,
  "checkedAt": "2026-03-13T10:30:00Z"
}
```

**Server status values**

| Status | Meaning |
|--------|---------|
| `PENDING` | Registered but not yet verified |
| `HEALTHY` | Responding normally |
| `DEGRADED` | Responding with elevated latency or errors |
| `DOWN` | Not responding |
| `DISABLED` | Manually disabled by admin |

---

## Tool Discovery

### Discover Tools

```
POST /api/v1/mcp/servers/{id}/discover
```

Trigger tool discovery by calling the MCP server's `tools/list` endpoint. Discovered tools are automatically classified by category (`READ`, `WRITE`, `IDEMPOTENT`, `UNKNOWN`) based on their names and descriptions. New tools are added; existing tools are updated.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Server ID |

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/servers/{id}/discover \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "serverId": "550e8400-e29b-41d4-a716-446655440000",
  "toolsDiscovered": 12,
  "toolsAdded": 10,
  "toolsUpdated": 2,
  "tools": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "serverId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "get_jira_issue",
      "description": "Fetch a JIRA issue by key",
      "inputSchema": {
        "type": "object",
        "properties": {
          "issueKey": { "type": "string" }
        },
        "required": ["issueKey"]
      },
      "category": "READ",
      "categoryConfidence": 0.95,
      "categoryManualOverride": false,
      "cacheConfig": {
        "enabled": true,
        "ttlSecs": 3600,
        "semanticThreshold": 0.90,
        "crossAgent": true,
        "coalescingWindowMs": 50
      },
      "createdAt": "2026-03-13T10:01:00Z",
      "updatedAt": "2026-03-13T10:01:00Z"
    }
  ]
}
```

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Server not found |
| 500 | `discovery_error` | Discovery failed (server unreachable or returned an error) |

---

### List MCP Tools

```
GET /api/v1/mcp/tools
```

List all tools across all servers, or filter by server, category, cache status, or name.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `serverId` | query | uuid | no | Filter by server ID |
| `category` | query | string | no | Filter by category: `READ`, `WRITE`, `IDEMPOTENT`, `UNKNOWN` |
| `cacheEnabled` | query | boolean | no | Filter by cache enabled/disabled |
| `name` | query | string | no | Search by name (partial match) |
| `page` | query | integer | no | Page number |
| `pageSize` | query | integer | no | Results per page |

```bash
curl "https://api.worldflowai.com/api/v1/mcp/tools?serverId={serverId}&category=READ" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "tools": [ ... ],
  "total": 8,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

Each item in `tools` follows the same shape as the objects in the [Discover Tools](#discover-tools) response.

---

### Update Tool Configuration

```
PATCH /api/v1/mcp/tools/{id}/config
```

Update caching configuration for a specific tool. All fields are optional; only specified fields are updated. Setting `category` marks it as a manual override and prevents auto-classification.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Tool ID |

**Request body** (all fields optional):

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `category` | string | `READ`, `WRITE`, `IDEMPOTENT`, `UNKNOWN` | Tool classification |
| `cacheEnabled` | boolean | | Enable or disable caching |
| `cacheTtlSecs` | integer | | Cache TTL in seconds |
| `semanticThreshold` | float | 0.0-1.0 | Minimum similarity for semantic cache hit |
| `crossAgentEnabled` | boolean | | Share cached results across agents |
| `coalescingWindowMs` | integer | | Request coalescing window in milliseconds |

```bash
curl -X PATCH https://api.worldflowai.com/api/v1/mcp/tools/{id}/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cacheEnabled": true,
    "cacheTtlSecs": 7200,
    "semanticThreshold": 0.85,
    "crossAgentEnabled": true,
    "coalescingWindowMs": 100
  }'
```

**Response (200)**: The updated tool object (same shape as items in [Discover Tools](#discover-tools)).

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Tool not found |

---

### List Tool Entities

```
GET /api/v1/mcp/tools/{id}/entities
```

List entity mappings for a specific tool.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Tool ID |

```bash
curl https://api.worldflowai.com/api/v1/mcp/tools/{id}/entities \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
[
  {
    "toolId": "660e8400-e29b-41d4-a716-446655440001",
    "entityId": "770e8400-e29b-41d4-a716-446655440002",
    "paramName": "issueKey",
    "operation": "READ"
  }
]
```

---

## Entity Management

### List Entities

```
GET /api/v1/mcp/entities
```

List all entity types defined for cache invalidation. Entities represent data types that tools operate on (e.g., `jira_issue`, `github_repo`).

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `parentId` | query | uuid | no | Filter by parent entity ID |
| `name` | query | string | no | Search by name (partial match) |
| `page` | query | integer | no | Page number |
| `pageSize` | query | integer | no | Results per page |

```bash
curl "https://api.worldflowai.com/api/v1/mcp/entities?name=jira" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "entities": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "jira_issue",
      "description": "A JIRA issue entity",
      "parentId": "880e8400-e29b-41d4-a716-446655440003",
      "createdAt": "2026-03-12T08:00:00Z",
      "updatedAt": "2026-03-12T08:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### Create Entity

```
POST /api/v1/mcp/entities
```

Create a new entity type. Entities can have parent relationships for cascade invalidation. For example, a `jira_comment` entity with `jira_issue` as its parent is invalidated whenever the parent issue is invalidated.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | string | yes | max 128 chars | Entity type name |
| `description` | string | no | | Human-readable description |
| `parentId` | uuid | no | | Parent entity ID for cascade invalidation |

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "jira_comment",
    "description": "Comments on a JIRA issue",
    "parentId": "770e8400-e29b-41d4-a716-446655440002"
  }'
```

**Response (200)**

```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "name": "jira_comment",
  "description": "Comments on a JIRA issue",
  "parentId": "770e8400-e29b-41d4-a716-446655440002",
  "createdAt": "2026-03-13T10:05:00Z",
  "updatedAt": "2026-03-13T10:05:00Z"
}
```

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 400 | `validation_error` | Invalid request body |

---

### Get Entity

```
GET /api/v1/mcp/entities/{id}
```

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Entity ID |

```bash
curl https://api.worldflowai.com/api/v1/mcp/entities/{id} \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Same shape as a single item in the `entities` array from [List Entities](#list-entities).

---

### Update Entity

```
PATCH /api/v1/mcp/entities/{id}
```

Update an entity's properties. Setting `parentId` to `null` removes the parent relationship.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Entity ID |

**Request body** (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Entity name |
| `description` | string | Description |
| `parentId` | uuid or null | Parent entity ID; set to `null` to remove parent |

```bash
curl -X PATCH https://api.worldflowai.com/api/v1/mcp/entities/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "parentId": null
  }'
```

**Response (200)**: The updated entity object.

---

### Delete Entity

```
DELETE /api/v1/mcp/entities/{id}
```

Delete an entity. Triggers cascade invalidation for related cached data. Associated tool-entity mappings and invalidation rules are also removed.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Entity ID |

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/mcp/entities/{id} \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "deleted": true,
  "message": "Entity and associated mappings deleted"
}
```

---

### Create Tool-Entity Mapping

```
POST /api/v1/mcp/tool-entities
```

Map a tool parameter to an entity type. This defines which parameter contains an entity ID and whether the tool reads or writes that entity. Used for automatic cache invalidation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toolId` | uuid | yes | Tool ID |
| `entityId` | uuid | yes | Entity ID |
| `paramName` | string | yes | Name of the tool parameter that contains the entity ID |
| `operation` | string | yes | `READ` or `WRITE` |

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/tool-entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toolId": "660e8400-e29b-41d4-a716-446655440001",
    "entityId": "770e8400-e29b-41d4-a716-446655440002",
    "paramName": "issueKey",
    "operation": "READ"
  }'
```

**Response (200)**

```json
{
  "toolId": "660e8400-e29b-41d4-a716-446655440001",
  "entityId": "770e8400-e29b-41d4-a716-446655440002",
  "paramName": "issueKey",
  "operation": "READ"
}
```

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Tool or entity not found |

---

### Delete Tool-Entity Mapping

```
DELETE /api/v1/mcp/tool-entities/{tool_id}/{entity_id}
```

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `tool_id` | path | uuid | yes | Tool ID |
| `entity_id` | path | uuid | yes | Entity ID |

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/mcp/tool-entities/{tool_id}/{entity_id} \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "deleted": true,
  "message": "Mapping deleted"
}
```

---

## Invalidation Rules

Rules define which READ tool caches are invalidated when a WRITE tool executes.

### List Invalidation Rules

```
GET /api/v1/mcp/rules
```

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `writeToolId` | query | uuid | no | Filter by the write tool that triggers invalidation |
| `invalidateToolId` | query | uuid | no | Filter by the read tool whose cache is invalidated |
| `enabled` | query | boolean | no | Filter by enabled/disabled status |
| `page` | query | integer | no | Page number |
| `pageSize` | query | integer | no | Results per page |

```bash
curl "https://api.worldflowai.com/api/v1/mcp/rules?enabled=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "rules": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "writeToolId": "660e8400-e29b-41d4-a716-446655440010",
      "invalidateToolId": "660e8400-e29b-41d4-a716-446655440001",
      "enabled": true,
      "createdAt": "2026-03-13T10:10:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### Create Invalidation Rule

```
POST /api/v1/mcp/rules
```

Create a rule that invalidates a read tool's cache when a write tool executes.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `writeToolId` | uuid | yes | | The write tool that triggers invalidation |
| `invalidateToolId` | uuid | yes | | The read tool whose cache is cleared |
| `enabled` | boolean | no | `true` | Whether the rule is active |

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "writeToolId": "660e8400-e29b-41d4-a716-446655440010",
    "invalidateToolId": "660e8400-e29b-41d4-a716-446655440001",
    "enabled": true
  }'
```

**Response (200)**

```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440005",
  "writeToolId": "660e8400-e29b-41d4-a716-446655440010",
  "invalidateToolId": "660e8400-e29b-41d4-a716-446655440001",
  "enabled": true,
  "createdAt": "2026-03-13T10:10:00Z"
}
```

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | One or both tools not found |

---

### Update Invalidation Rule

```
PATCH /api/v1/mcp/rules/{id}
```

Enable or disable an invalidation rule.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Rule ID |

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable or disable the rule |

```bash
curl -X PATCH https://api.worldflowai.com/api/v1/mcp/rules/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

**Response (200)**: The updated rule object.

---

### Delete Invalidation Rule

```
DELETE /api/v1/mcp/rules/{id}
```

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Rule ID |

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/mcp/rules/{id} \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "deleted": true,
  "message": "Rule deleted"
}
```

---

### Auto-Generate Invalidation Rules

```
POST /api/v1/mcp/rules/generate
```

Automatically generate invalidation rules based on tool-entity mappings. Analyzes all tools with entity relationships and creates rules where a WRITE tool that writes an entity invalidates all READ tools that read the same entity. Existing rules are skipped to prevent duplicates.

No request body is required.

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/rules/generate \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "rulesGenerated": 5,
  "rulesSkipped": 2,
  "generatedRules": [
    {
      "writeToolId": "660e8400-e29b-41d4-a716-446655440010",
      "writeToolName": "update_issue",
      "invalidateToolId": "660e8400-e29b-41d4-a716-446655440001",
      "invalidateToolName": "get_issue",
      "sharedEntities": ["jira_issue"]
    }
  ],
  "message": "Generated 5 new invalidation rule(s) based on shared entity mappings"
}
```

---

## Tool Result Caching

These endpoints operate on the tool result cache directly. They are useful for programmatic cache management and debugging.

### Search Tool Cache

```
POST /api/v1/tool-cache/search
```

Semantic search for cached tool results. Provide either `queryEmbedding` (a pre-computed vector) or `queryText` (text that will be embedded server-side).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `queryEmbedding` | array of float | one of | Pre-computed embedding vector |
| `queryText` | string | one of | Text to embed and search |

```bash
curl -X POST https://api.worldflowai.com/api/v1/tool-cache/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "queryText": "get_jira_issue issueKey=PROJ-123"
  }'
```

**Response (200)**: Search results with similarity scores and cached tool outputs.

---

### Get Tool Cache Entry

```
GET /api/v1/tool-cache/{cache_key}
```

Exact lookup of a cached tool result by cache key.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `cache_key` | path | int64 | yes | Numeric cache key |

```bash
curl https://api.worldflowai.com/api/v1/tool-cache/8827364519204 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: The cached tool result entry.

**Errors**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Cache entry not found or expired |

---

### Get Tool Cache Stats

```
POST /api/v1/tool-cache/stats
```

Get observability metrics for a specific cache key.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| (cache key identifier) | | yes | Cache key to query stats for |

```bash
curl -X POST https://api.worldflowai.com/api/v1/tool-cache/stats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cacheKey": 8827364519204}'
```

**Response (200)**: Metrics including access count, hit rate, and latency for the given cache key.

---

### Invalidate Tool Cache

```
POST /api/v1/tool-cache/invalidate
```

Invalidate cached tool results by entity, with optional cascade to child entities.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entityType` | string | yes | Entity type name to invalidate |
| `entityId` | string | no | Specific entity instance ID |
| `cascade` | boolean | no | Whether to cascade to child entities (default `false`) |

```bash
curl -X POST https://api.worldflowai.com/api/v1/tool-cache/invalidate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "jira_issue",
    "entityId": "PROJ-123",
    "cascade": true
  }'
```

**Response (200)**: Count of invalidated cache entries.

---

### Get Tool Cache Metrics

```
GET /api/v1/tool-cache/metrics
```

Get overall tool cache statistics and configuration.

```bash
curl https://api.worldflowai.com/api/v1/tool-cache/metrics \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Aggregate cache metrics including total entries, memory usage, hit rate, and configuration parameters.

---

## Analytics

### MCP Analytics

```
GET /api/v1/mcp/analytics
```

Aggregated analytics for MCP servers and tools, including cache hit rates, latency, time series trends, and estimated cost savings.

| Parameter | In | Type | Required | Default | Description |
|-----------|-----|------|----------|---------|-------------|
| `granularity` | query | string | no | `day` | Time bucket size: `hour`, `day`, `week`, `month` |
| `startDate` | query | date-time | no | | Filter from this date (ISO 8601) |
| `endDate` | query | date-time | no | | Filter until this date (ISO 8601) |
| `serverId` | query | uuid | no | | Filter by server ID |
| `toolName` | query | string | no | | Filter by tool name (partial match) |

```bash
curl "https://api.worldflowai.com/api/v1/mcp/analytics?granularity=hour&startDate=2026-03-12T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "summary": {
    "totalCalls": 15234,
    "cacheHits": 8421,
    "cacheMisses": 6813,
    "hitRate": 0.5528,
    "avgLatencyCacheMs": 3.2,
    "avgLatencyMissMs": 245.7,
    "estimatedTimeSavedMs": 2069043,
    "estimatedCostSaved": 42.15
  },
  "byServer": [
    {
      "serverId": "550e8400-e29b-41d4-a716-446655440000",
      "serverName": "Atlassian MCP",
      "totalCalls": 8500,
      "cacheHits": 5100,
      "hitRate": 0.60,
      "toolCount": 12
    }
  ],
  "byTool": [
    {
      "toolId": "660e8400-e29b-41d4-a716-446655440001",
      "toolName": "get_jira_issue",
      "serverId": "550e8400-e29b-41d4-a716-446655440000",
      "category": "READ",
      "totalCalls": 3200,
      "cacheHits": 2560,
      "hitRate": 0.80,
      "avgLatencyMs": 2.8
    }
  ],
  "trend": [
    {
      "period": "2026-03-12T10:00:00Z",
      "totalCalls": 534,
      "cacheHits": 321,
      "cacheMisses": 213,
      "hitRate": 0.6011
    }
  ],
  "executionTimeMs": 45
}
```

---

### Export MCP Configuration

```
GET /api/v1/mcp/config/export
```

Export the complete MCP configuration as YAML. Includes all servers, tools, entities, mappings, and invalidation rules. Suitable for backup or GitOps workflows.

```bash
curl https://api.worldflowai.com/api/v1/mcp/config/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/yaml"
```

**Response (200)**: `Content-Type: application/yaml`

```yaml
servers:
  - name: "Atlassian MCP"
    url: "https://mcp.example.com:9001"
    transport: "HTTP"
    auth:
      type: "API_KEY"
      header: "Authorization"
      valueEnv: "ATLASSIAN_API_KEY"

tools:
  get_jira_issue:
    category: read
    cache:
      enabled: true
      ttlSecs: 3600
      semanticThreshold: 0.90
      crossAgent: true
    entities:
      - param: issueKey
        type: jira_issue

entities:
  jira_issue:
    parent: jira_project
  jira_project: {}
```

---

### MCP Activity Stream (WebSocket)

```
GET /api/v1/mcp/stream
```

Real-time WebSocket stream of MCP activity events. Connect via WebSocket upgrade.

Events include:
- Tool invocations
- Cache hits and misses
- Invalidation triggers
- Health check results

```bash
# Using websocat
websocat "wss://api.worldflowai.com/api/v1/mcp/stream" \
  -H "Authorization: Bearer $TOKEN"
```

**Response**: `101 Switching Protocols` on successful upgrade, then a stream of JSON event objects.

---

## Connections

Manage MCP client connections (the links between WorldFlow AI and remote MCP servers at the transport level).

### List MCP Connections

```
GET /api/v1/mcp/connections
```

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `serverId` | query | uuid | no | Filter by server ID |
| `clientId` | query | string | no | Filter by client ID |
| `state` | query | string | no | Filter by state: `CONNECTING`, `CONNECTED`, `DISCONNECTING`, `DISCONNECTED`, `ERROR` |
| `page` | query | integer | no | Page number |
| `pageSize` | query | integer | no | Results per page |

```bash
curl "https://api.worldflowai.com/api/v1/mcp/connections?state=CONNECTED" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Paginated list of connection objects with IDs, server references, client IDs, states, and timestamps.

---

### Create MCP Connection

```
POST /api/v1/mcp/connections
```

Create a new MCP client connection. Requires `ManageConfig` permission.

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/connections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "agent-pool-1"
  }'
```

**Response (200)**: The created connection object with its assigned ID and initial state.

---

### Get MCP Connection

```
GET /api/v1/mcp/connections/{id}
```

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Connection ID |

```bash
curl https://api.worldflowai.com/api/v1/mcp/connections/{id} \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Connection details including state, server reference, and tracking metadata.

---

### Update Connection State

```
PATCH /api/v1/mcp/connections/{id}/state
```

Update the state of an MCP connection. Requires `ManageConfig` permission.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Connection ID |

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | string | yes | New state: `CONNECTING`, `CONNECTED`, `DISCONNECTING`, `DISCONNECTED`, `ERROR` |

```bash
curl -X PATCH https://api.worldflowai.com/api/v1/mcp/connections/{id}/state \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state": "DISCONNECTING"}'
```

**Response (200)**: The updated connection state.

---

### Record Connection Heartbeat

```
POST /api/v1/mcp/connections/{id}/heartbeat
```

Record a heartbeat for an MCP connection to signal it is still alive.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `id` | path | uuid | yes | Connection ID |

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/connections/{id}/heartbeat \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Heartbeat acknowledgment with the recorded timestamp.

---

### Connection Events (WebSocket)

```
GET /api/v1/mcp/connections/events
```

Real-time WebSocket stream of MCP connection events. Maximum 100 concurrent WebSocket connections.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `token` | query | string | no | JWT token for WebSocket authentication (alternative to header) |

```bash
websocat "wss://api.worldflowai.com/api/v1/mcp/connections/events?token=$TOKEN"
```

**Response**: `101 Switching Protocols` on successful upgrade, then a stream of connection state change events.

---

### Get Server Connection Stats

```
GET /api/v1/mcp/servers/{server_id}/connection-stats
```

Get connection statistics for a specific MCP server.

| Parameter | In | Type | Required | Description |
|-----------|-----|------|----------|-------------|
| `server_id` | path | uuid | yes | Server ID |

```bash
curl https://api.worldflowai.com/api/v1/mcp/servers/{server_id}/connection-stats \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Connection statistics including active count, total historical connections, and error rates.

---

## Error Format

All error responses use the following format:

```json
{
  "type": "not_found",
  "message": "Server with ID 550e8400-... not found"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Machine-readable error category |
| `message` | string | Human-readable description |

Common error types:

| Type | HTTP Status | Description |
|------|-------------|-------------|
| `validation_error` | 400 | Invalid request body or parameters |
| `authentication_error` | 401 | Missing or invalid bearer token |
| `permission_error` | 403 | Insufficient permissions for the operation |
| `not_found` | 404 | Requested resource does not exist |
| `discovery_error` | 500 | MCP tool discovery failed |
| `internal_error` | 500 | Unexpected server error |
