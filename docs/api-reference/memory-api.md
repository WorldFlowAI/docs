---
sidebar_position: 3
title: Memory API
---

# Memory API

The Memory API provides full lifecycle management for projects, memory stores, recall, logging, branches, search, metrics, and more. All endpoints require a valid JWT bearer token (see [Authentication API](./authentication-api)).

**Base URL:** `https://api.worldflowai.com/api/v1/`

---

## Projects

### List Projects

```
GET /api/v1/projects
```

Returns a paginated list of projects in the organization.

**Query Parameters**

| Parameter | Type    | Default | Description                       |
|-----------|---------|---------|-----------------------------------|
| `limit`   | integer | 20      | Items per page (max 100)          |
| `cursor`  | string  | —       | Pagination cursor                 |

**Response**

```json
{
  "data": [
    {
      "id": "proj_abc123",
      "name": "My Project",
      "description": "Customer support assistant",
      "createdAt": "2026-01-10T12:00:00Z",
      "updatedAt": "2026-01-15T08:30:00Z",
      "branchCount": 3,
      "entryCount": 1250
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTIwfQ",
    "total": 42
  }
}
```

---

### Create Project

```
POST /api/v1/projects
```

**Request Body**

| Field         | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| `name`        | string | Yes      | Project name (1-128 characters)      |
| `description` | string | No       | Project description (max 1024 chars) |
| `config`      | object | No       | Project-level configuration          |

**`config` Object**

| Field              | Type    | Default  | Description                                         |
|--------------------|---------|----------|-----------------------------------------------------|
| `defaultModel`     | string  | —        | Default LLM model for proxy requests                |
| `embeddingModel`   | string  | `"text-embedding-3-small"` | Embedding model for memory search   |
| `recallTopK`       | integer | 10       | Default number of memories to recall                |
| `recallThreshold`  | number  | 0.7      | Minimum similarity score for recall (0.0-1.0)       |
| `autoCommit`       | boolean | true     | Automatically commit interactions to memory         |

**Example Request**

```bash
curl -X POST https://api.worldflowai.com/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Bot",
    "description": "Memory-augmented support assistant",
    "config": {
      "defaultModel": "gpt-4o",
      "recallTopK": 15,
      "recallThreshold": 0.75
    }
  }'
```

**Response** `201 Created`

```json
{
  "id": "proj_abc123",
  "name": "Customer Support Bot",
  "description": "Memory-augmented support assistant",
  "config": {
    "defaultModel": "gpt-4o",
    "embeddingModel": "text-embedding-3-small",
    "recallTopK": 15,
    "recallThreshold": 0.75,
    "autoCommit": true
  },
  "createdAt": "2026-01-15T08:30:00Z",
  "updatedAt": "2026-01-15T08:30:00Z",
  "branchCount": 1,
  "entryCount": 0
}
```

---

### Get Project

```
GET /api/v1/projects/{projectId}
```

**Path Parameters**

| Parameter   | Type   | Description   |
|-------------|--------|---------------|
| `projectId` | string | Project ID    |

**Response** `200 OK`

Returns the project object as shown in [Create Project](#create-project).

---

### Update Project

```
PATCH /api/v1/projects/{projectId}
```

**Request Body**

All fields are optional. Only provided fields are updated.

| Field         | Type   | Description                          |
|---------------|--------|--------------------------------------|
| `name`        | string | Project name (1-128 characters)      |
| `description` | string | Project description (max 1024 chars) |
| `config`      | object | Project-level configuration (merged) |

**Response** `200 OK`

Returns the updated project object.

---

### Delete Project

```
DELETE /api/v1/projects/{projectId}
```

Permanently deletes the project and all associated data (memories, branches, logs). This action is irreversible.

**Response** `204 No Content`

---

## Store (COMMIT)

### Commit Memory

```
POST /api/v1/projects/{projectId}/store
```

Commits one or more memory entries to the project's memory store. This is the primary write path for adding structured memories.

**Request Body**

| Field     | Type   | Required | Description                                            |
|-----------|--------|----------|--------------------------------------------------------|
| `entries` | array  | Yes      | Array of memory entries to commit                      |
| `branch`  | string | No       | Target branch (defaults to `"main"`)                   |
| `dedupe`  | boolean| No       | Deduplicate against existing entries (default `true`)  |

**Entry Object**

| Field       | Type   | Required | Description                                             |
|-------------|--------|----------|---------------------------------------------------------|
| `content`   | string | Yes      | The memory content text                                 |
| `role`      | string | No       | Source role: `"user"`, `"assistant"`, `"system"`        |
| `metadata`  | object | No       | Arbitrary key-value metadata                            |
| `tags`      | array  | No       | Array of string tags for filtering                      |
| `source`    | string | No       | Source identifier (e.g., conversation ID)               |
| `timestamp` | string | No       | ISO 8601 timestamp (defaults to server time)            |

**Example Request**

```bash
curl -X POST https://api.worldflowai.com/api/v1/projects/proj_abc123/store \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entries": [
      {
        "content": "User prefers dark mode and compact layout.",
        "role": "system",
        "metadata": {"category": "preferences"},
        "tags": ["ui", "preferences"]
      },
      {
        "content": "User asked about billing on 2026-01-10 and was satisfied with the resolution.",
        "role": "assistant",
        "metadata": {"category": "interaction_summary"},
        "tags": ["billing", "resolved"]
      }
    ],
    "branch": "main",
    "dedupe": true
  }'
```

**Response** `201 Created`

```json
{
  "committed": 2,
  "deduplicated": 0,
  "entries": [
    {
      "id": "mem_001",
      "content": "User prefers dark mode and compact layout.",
      "role": "system",
      "metadata": {"category": "preferences"},
      "tags": ["ui", "preferences"],
      "embedding": null,
      "createdAt": "2026-01-15T08:30:00Z",
      "branch": "main"
    },
    {
      "id": "mem_002",
      "content": "User asked about billing on 2026-01-10 and was satisfied with the resolution.",
      "role": "assistant",
      "metadata": {"category": "interaction_summary"},
      "tags": ["billing", "resolved"],
      "embedding": null,
      "createdAt": "2026-01-15T08:30:00Z",
      "branch": "main"
    }
  ]
}
```

---

## Recall (CONTEXT)

### Recall Memories

```
POST /api/v1/projects/{projectId}/recall
```

Retrieves relevant memories for a given query. Returns ranked results based on semantic similarity.

**Request Body**

| Field       | Type    | Required | Description                                          |
|-------------|---------|----------|------------------------------------------------------|
| `query`     | string  | Yes      | The query text to match against memories             |
| `topK`      | integer | No       | Number of results (default from project config)      |
| `threshold` | number  | No       | Minimum similarity (default from project config)     |
| `branch`    | string  | No       | Branch to search (defaults to `"main"`)              |
| `filters`   | object  | No       | Filter criteria                                      |

**Filters Object**

| Field      | Type   | Description                                             |
|------------|--------|---------------------------------------------------------|
| `tags`     | array  | Only return entries matching any of these tags          |
| `role`     | string | Filter by role (`"user"`, `"assistant"`, `"system"`)    |
| `metadata` | object | Key-value pairs that must match entry metadata          |
| `after`    | string | Only entries created after this ISO 8601 timestamp      |
| `before`   | string | Only entries created before this ISO 8601 timestamp     |

**Example Request**

```bash
curl -X POST https://api.worldflowai.com/api/v1/projects/proj_abc123/recall \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the user'\''s UI preferences?",
    "topK": 5,
    "threshold": 0.7,
    "filters": {
      "tags": ["preferences"]
    }
  }'
```

**Response** `200 OK`

```json
{
  "results": [
    {
      "id": "mem_001",
      "content": "User prefers dark mode and compact layout.",
      "role": "system",
      "metadata": {"category": "preferences"},
      "tags": ["ui", "preferences"],
      "score": 0.92,
      "createdAt": "2026-01-15T08:30:00Z"
    }
  ],
  "query": "What are the user's UI preferences?",
  "totalResults": 1,
  "branch": "main"
}
```

---

## Log (OTA)

### Append Log Entry

```
POST /api/v1/projects/{projectId}/log
```

Appends an over-the-air log entry. Logs capture raw interactions that can later be committed to memory or used for analytics.

**Request Body**

| Field         | Type   | Required | Description                                          |
|---------------|--------|----------|------------------------------------------------------|
| `messages`    | array  | Yes      | Array of message objects                             |
| `sessionId`   | string | No       | Session identifier for grouping logs                 |
| `metadata`    | object | No       | Arbitrary key-value metadata                         |
| `autoCommit`  | boolean| No       | Whether to auto-commit to memory (project default)   |

**Message Object**

| Field     | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| `role`    | string | Yes      | `"user"`, `"assistant"`, or `"system"`|
| `content` | string | Yes      | Message content                       |

**Example Request**

```bash
curl -X POST https://api.worldflowai.com/api/v1/projects/proj_abc123/log \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "How do I reset my password?"},
      {"role": "assistant", "content": "Go to Settings > Security > Reset Password."}
    ],
    "sessionId": "session_xyz789",
    "metadata": {"channel": "web_chat"}
  }'
```

**Response** `201 Created`

```json
{
  "logId": "log_abc123",
  "sessionId": "session_xyz789",
  "messageCount": 2,
  "autoCommitted": true,
  "createdAt": "2026-01-15T08:30:00Z"
}
```

---

### List Logs

```
GET /api/v1/projects/{projectId}/logs
```

**Query Parameters**

| Parameter   | Type    | Default | Description                               |
|-------------|---------|---------|-------------------------------------------|
| `limit`     | integer | 20      | Items per page (max 100)                  |
| `cursor`    | string  | —       | Pagination cursor                         |
| `sessionId` | string  | —       | Filter by session ID                      |

**Response** `200 OK`

Returns a paginated list of log entries.

---

### Get Log

```
GET /api/v1/projects/{projectId}/logs/{logId}
```

**Response** `200 OK`

Returns the full log entry including all messages.

---

### Delete Log

```
DELETE /api/v1/projects/{projectId}/logs/{logId}
```

**Response** `204 No Content`

---

## Branches

### List Branches

```
GET /api/v1/projects/{projectId}/branches
```

**Response** `200 OK`

```json
{
  "data": [
    {
      "name": "main",
      "entryCount": 1250,
      "createdAt": "2026-01-10T12:00:00Z",
      "updatedAt": "2026-01-15T08:30:00Z",
      "isDefault": true
    },
    {
      "name": "experiment-v2",
      "entryCount": 300,
      "createdAt": "2026-01-12T14:00:00Z",
      "updatedAt": "2026-01-14T16:00:00Z",
      "isDefault": false,
      "parentBranch": "main"
    }
  ]
}
```

---

### Create Branch

```
POST /api/v1/projects/{projectId}/branches
```

**Request Body**

| Field          | Type    | Required | Description                                     |
|----------------|---------|----------|-------------------------------------------------|
| `name`         | string  | Yes      | Branch name (alphanumeric, hyphens, underscores)|
| `parentBranch` | string  | No       | Branch to fork from (defaults to `"main"`)      |
| `copyEntries`  | boolean | No       | Copy entries from parent (default `true`)        |

**Response** `201 Created`

```json
{
  "name": "experiment-v2",
  "entryCount": 1250,
  "createdAt": "2026-01-15T08:30:00Z",
  "updatedAt": "2026-01-15T08:30:00Z",
  "isDefault": false,
  "parentBranch": "main"
}
```

---

### Delete Branch

```
DELETE /api/v1/projects/{projectId}/branches/{branchName}
```

The `main` branch cannot be deleted.

**Response** `204 No Content`

---

## Merge

### Merge Branch

```
POST /api/v1/projects/{projectId}/branches/{branchName}/merge
```

Merges entries from the specified branch into a target branch.

**Request Body**

| Field          | Type   | Required | Description                                       |
|----------------|--------|----------|---------------------------------------------------|
| `targetBranch` | string | No       | Branch to merge into (defaults to `"main"`)       |
| `strategy`     | string | No       | Merge strategy: `"union"`, `"replace"`, `"dedupe"`|
| `deleteBranch` | boolean| No       | Delete source branch after merge (default `false`)|

**Response** `200 OK`

```json
{
  "merged": 300,
  "deduplicated": 15,
  "targetBranch": "main",
  "sourceBranch": "experiment-v2",
  "strategy": "dedupe",
  "newEntryCount": 1535
}
```

---

## Search

### Search Memories

```
POST /api/v1/projects/{projectId}/search
```

Full-text and semantic hybrid search across memory entries.

**Request Body**

| Field       | Type    | Required | Description                                        |
|-------------|---------|----------|----------------------------------------------------|
| `query`     | string  | Yes      | Search query text                                  |
| `mode`      | string  | No       | `"semantic"`, `"fulltext"`, or `"hybrid"` (default)|
| `topK`      | integer | No       | Number of results (default 20)                     |
| `branch`    | string  | No       | Branch to search (defaults to `"main"`)            |
| `filters`   | object  | No       | Same filter object as [Recall](#recall-memories)   |
| `highlight` | boolean | No       | Include highlighted snippets (default `false`)     |

**Response** `200 OK`

```json
{
  "results": [
    {
      "id": "mem_001",
      "content": "User prefers dark mode and compact layout.",
      "score": 0.94,
      "matchType": "semantic",
      "highlights": [
        "User prefers <mark>dark mode</mark> and compact layout."
      ],
      "metadata": {"category": "preferences"},
      "tags": ["ui", "preferences"],
      "createdAt": "2026-01-15T08:30:00Z"
    }
  ],
  "totalResults": 1,
  "mode": "hybrid"
}
```

---

## Metrics

### Get Project Metrics

```
GET /api/v1/projects/{projectId}/metrics
```

Returns usage metrics for the project.

**Query Parameters**

| Parameter | Type   | Default   | Description                                    |
|-----------|--------|-----------|------------------------------------------------|
| `from`    | string | 7 days ago| Start date (ISO 8601)                          |
| `to`      | string | now       | End date (ISO 8601)                            |
| `granularity` | string | `"day"` | `"hour"`, `"day"`, or `"week"`              |

**Response** `200 OK`

```json
{
  "projectId": "proj_abc123",
  "period": {
    "from": "2026-01-08T00:00:00Z",
    "to": "2026-01-15T00:00:00Z"
  },
  "totals": {
    "recalls": 15230,
    "commits": 4521,
    "logEntries": 28904,
    "proxyRequests": 12456,
    "tokensProcessed": 8934201
  },
  "timeSeries": [
    {
      "timestamp": "2026-01-08T00:00:00Z",
      "recalls": 2100,
      "commits": 640,
      "logEntries": 4100,
      "proxyRequests": 1780
    }
  ]
}
```

---

## Promote

### Promote Entry

```
POST /api/v1/projects/{projectId}/entries/{entryId}/promote
```

Promotes a memory entry, increasing its retrieval priority in recall operations.

**Request Body**

| Field    | Type    | Required | Description                                        |
|----------|---------|----------|----------------------------------------------------|
| `weight` | number  | No       | Promotion weight multiplier (default `1.5`, max `5.0`) |
| `reason` | string  | No       | Reason for promotion                               |

**Response** `200 OK`

```json
{
  "id": "mem_001",
  "promoted": true,
  "weight": 1.5,
  "promotedAt": "2026-01-15T08:30:00Z"
}
```

---

### Demote Entry

```
POST /api/v1/projects/{projectId}/entries/{entryId}/demote
```

Demotes a memory entry, reducing its retrieval priority.

**Request Body**

| Field    | Type   | Required | Description                  |
|----------|--------|----------|------------------------------|
| `reason` | string | No       | Reason for demotion          |

**Response** `200 OK`

```json
{
  "id": "mem_001",
  "promoted": false,
  "weight": 1.0,
  "demotedAt": "2026-01-15T08:30:00Z"
}
```

---

## Contributors

### List Contributors

```
GET /api/v1/projects/{projectId}/contributors
```

Returns a list of contributors (users and integrations) who have committed entries to the project.

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "user_abc123",
      "type": "user",
      "name": "Jane Smith",
      "entryCount": 850,
      "lastActiveAt": "2026-01-15T08:00:00Z"
    },
    {
      "id": "int_def456",
      "type": "integration",
      "name": "Slack Connector",
      "entryCount": 400,
      "lastActiveAt": "2026-01-14T22:00:00Z"
    }
  ]
}
```

---

### Add Contributor

```
POST /api/v1/projects/{projectId}/contributors
```

**Request Body**

| Field  | Type   | Required | Description                                         |
|--------|--------|----------|-----------------------------------------------------|
| `userId` | string | Yes    | User ID or integration ID to add                    |
| `role` | string | No       | Contributor role: `"editor"`, `"viewer"` (default `"editor"`) |

**Response** `201 Created`

---

### Remove Contributor

```
DELETE /api/v1/projects/{projectId}/contributors/{contributorId}
```

**Response** `204 No Content`

---

## External Sources

### List External Sources

```
GET /api/v1/projects/{projectId}/sources
```

Returns configured external data sources for the project.

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "src_abc123",
      "type": "notion",
      "name": "Engineering Wiki",
      "status": "active",
      "lastSyncAt": "2026-01-15T06:00:00Z",
      "entryCount": 2340,
      "config": {
        "workspaceId": "ws_123",
        "syncFrequency": "hourly"
      }
    }
  ]
}
```

---

### Create External Source

```
POST /api/v1/projects/{projectId}/sources
```

**Request Body**

| Field    | Type   | Required | Description                                               |
|----------|--------|----------|-----------------------------------------------------------|
| `type`   | string | Yes      | Source type: `"notion"`, `"confluence"`, `"gdrive"`, `"github"`, `"slack"`, `"web"` |
| `name`   | string | Yes      | Display name                                              |
| `config` | object | Yes      | Source-specific configuration                             |

**Config by Type**

**Notion**

| Field           | Type   | Description                       |
|-----------------|--------|-----------------------------------|
| `workspaceId`   | string | Notion workspace ID               |
| `accessToken`   | string | Notion integration token          |
| `syncFrequency` | string | `"realtime"`, `"hourly"`, `"daily"` |
| `pageIds`       | array  | Specific page IDs (optional)      |

**Confluence**

| Field           | Type   | Description                       |
|-----------------|--------|-----------------------------------|
| `baseUrl`       | string | Confluence instance URL           |
| `spaceKeys`     | array  | Space keys to sync                |
| `accessToken`   | string | API token                         |
| `syncFrequency` | string | `"realtime"`, `"hourly"`, `"daily"` |

**GitHub**

| Field           | Type   | Description                       |
|-----------------|--------|-----------------------------------|
| `owner`         | string | Repository owner                  |
| `repo`          | string | Repository name                   |
| `accessToken`   | string | GitHub personal access token      |
| `paths`         | array  | File paths or globs to include    |
| `syncFrequency` | string | `"realtime"`, `"hourly"`, `"daily"` |

**Google Drive**

| Field           | Type   | Description                       |
|-----------------|--------|-----------------------------------|
| `folderId`      | string | Root folder ID                    |
| `serviceAccountKey` | string | Service account JSON key      |
| `syncFrequency` | string | `"realtime"`, `"hourly"`, `"daily"` |

**Slack**

| Field           | Type   | Description                       |
|-----------------|--------|-----------------------------------|
| `channelIds`    | array  | Slack channel IDs to monitor      |
| `botToken`      | string | Slack bot token                   |
| `syncFrequency` | string | `"realtime"`, `"hourly"`, `"daily"` |

**Web**

| Field           | Type    | Description                       |
|-----------------|---------|-----------------------------------|
| `urls`          | array   | URLs to crawl                     |
| `depth`         | integer | Crawl depth (default 1)           |
| `syncFrequency` | string | `"daily"`, `"weekly"`             |

**Response** `201 Created`

---

### Update External Source

```
PATCH /api/v1/projects/{projectId}/sources/{sourceId}
```

**Request Body**

| Field    | Type   | Required | Description               |
|----------|--------|----------|---------------------------|
| `name`   | string | No       | Updated display name      |
| `config` | object | No       | Updated configuration     |
| `status` | string | No       | `"active"` or `"paused"`  |

**Response** `200 OK`

---

### Delete External Source

```
DELETE /api/v1/projects/{projectId}/sources/{sourceId}
```

**Response** `204 No Content`

---

### Trigger Sync

```
POST /api/v1/projects/{projectId}/sources/{sourceId}/sync
```

Manually triggers a sync for the specified external source.

**Response** `202 Accepted`

```json
{
  "syncId": "sync_abc123",
  "status": "in_progress",
  "startedAt": "2026-01-15T08:30:00Z"
}
```

---

### Get Sync Status

```
GET /api/v1/projects/{projectId}/sources/{sourceId}/syncs/{syncId}
```

**Response** `200 OK`

```json
{
  "syncId": "sync_abc123",
  "status": "completed",
  "startedAt": "2026-01-15T08:30:00Z",
  "completedAt": "2026-01-15T08:32:00Z",
  "entriesAdded": 45,
  "entriesUpdated": 12,
  "entriesDeleted": 3,
  "errors": []
}
```

---

## Roadmap

### Get Roadmap

```
GET /api/v1/projects/{projectId}/roadmap
```

Returns the memory roadmap -- a high-level view of the project's memory growth and coverage over time.

**Query Parameters**

| Parameter     | Type   | Default    | Description                                    |
|---------------|--------|------------|------------------------------------------------|
| `from`        | string | 30 days ago| Start date (ISO 8601)                          |
| `to`          | string | now        | End date (ISO 8601)                            |
| `granularity` | string | `"day"`    | `"hour"`, `"day"`, or `"week"`                 |

**Response** `200 OK`

```json
{
  "projectId": "proj_abc123",
  "period": {
    "from": "2025-12-15T00:00:00Z",
    "to": "2026-01-15T00:00:00Z"
  },
  "coverage": {
    "totalTopics": 145,
    "coveredTopics": 128,
    "coveragePercent": 88.3
  },
  "growth": [
    {
      "timestamp": "2025-12-15T00:00:00Z",
      "totalEntries": 800,
      "newEntries": 45,
      "topTopics": ["billing", "onboarding", "api"]
    }
  ]
}
```

---

## Intelligence

### Get Intelligence Report

```
GET /api/v1/projects/{projectId}/intelligence
```

Returns AI-generated insights about memory quality, gaps, and recommendations.

**Response** `200 OK`

```json
{
  "projectId": "proj_abc123",
  "generatedAt": "2026-01-15T08:30:00Z",
  "qualityScore": 0.87,
  "insights": [
    {
      "type": "gap",
      "severity": "medium",
      "message": "No memories found for 'refund policy' -- this topic appears in 12% of user queries.",
      "recommendation": "Add memories covering refund policy details."
    },
    {
      "type": "stale",
      "severity": "low",
      "message": "23 entries related to 'pricing' have not been updated in 90 days.",
      "recommendation": "Review and update pricing-related memories."
    },
    {
      "type": "duplicate",
      "severity": "low",
      "message": "5 potential duplicate entries detected in the 'onboarding' tag group.",
      "recommendation": "Review and deduplicate entries."
    }
  ],
  "topicDistribution": [
    {"topic": "billing", "count": 230, "percent": 18.4},
    {"topic": "onboarding", "count": 180, "percent": 14.4},
    {"topic": "api", "count": 150, "percent": 12.0}
  ]
}
```

---

### Generate Intelligence Report

```
POST /api/v1/projects/{projectId}/intelligence/generate
```

Triggers generation of a new intelligence report. Reports are cached for 24 hours.

**Response** `202 Accepted`

```json
{
  "reportId": "rpt_abc123",
  "status": "generating",
  "estimatedCompletionAt": "2026-01-15T08:32:00Z"
}
```

---

## Entry Management

### Get Entry

```
GET /api/v1/projects/{projectId}/entries/{entryId}
```

**Response** `200 OK`

```json
{
  "id": "mem_001",
  "content": "User prefers dark mode and compact layout.",
  "role": "system",
  "metadata": {"category": "preferences"},
  "tags": ["ui", "preferences"],
  "branch": "main",
  "weight": 1.0,
  "createdAt": "2026-01-15T08:30:00Z",
  "updatedAt": "2026-01-15T08:30:00Z"
}
```

---

### Update Entry

```
PATCH /api/v1/projects/{projectId}/entries/{entryId}
```

**Request Body**

| Field      | Type   | Required | Description                           |
|------------|--------|----------|---------------------------------------|
| `content`  | string | No       | Updated memory content                |
| `metadata` | object | No       | Updated metadata (merged)             |
| `tags`     | array  | No       | Replacement tag array                 |

**Response** `200 OK`

Returns the updated entry object.

---

### Delete Entry

```
DELETE /api/v1/projects/{projectId}/entries/{entryId}
```

**Response** `204 No Content`

---

### Bulk Delete Entries

```
POST /api/v1/projects/{projectId}/entries/bulk-delete
```

**Request Body**

| Field      | Type  | Required | Description                             |
|------------|-------|----------|-----------------------------------------|
| `entryIds` | array | Yes      | Array of entry IDs to delete (max 100)  |

**Response** `200 OK`

```json
{
  "deleted": 15,
  "failed": 0,
  "errors": []
}
```

---

## Errors

All Memory API endpoints use the standard error envelope described in the [API Overview](./overview#error-envelope). Common error codes for memory operations:

| Code                     | Status | Description                                      |
|--------------------------|--------|--------------------------------------------------|
| `PROJECT_NOT_FOUND`      | 404    | The specified project does not exist             |
| `BRANCH_NOT_FOUND`       | 404    | The specified branch does not exist              |
| `ENTRY_NOT_FOUND`        | 404    | The specified memory entry does not exist        |
| `SOURCE_NOT_FOUND`       | 404    | The specified external source does not exist     |
| `BRANCH_ALREADY_EXISTS`  | 409    | A branch with that name already exists           |
| `MERGE_CONFLICT`         | 409    | Conflicting entries detected during merge        |
| `INVALID_FILTER`         | 422    | Filter parameters are semantically invalid       |
| `QUOTA_EXCEEDED`         | 429    | Project storage or request quota exceeded        |
| `SYNC_IN_PROGRESS`       | 409    | A sync is already running for this source        |

For the full list of error codes, see [Error Codes](../reference/error-codes).
