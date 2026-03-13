---
sidebar_position: 3
title: Memory API
---

# Memory API Reference

All endpoints are prefixed with `/api/v1/memory`. All requests require a JWT bearer token.

Results are scoped to your tenant (workspace). You cannot access another tenant's data.

---

## Projects

### Create Project

```
POST /api/v1/memory/projects
```

| Field | Type | Required | Limits | Description |
|-------|------|----------|--------|-------------|
| `projectId` | string | yes | 1-128 chars | Unique project identifier |
| `name` | string | yes | 1-256 chars | Human-readable project name |
| `roadmap` | string | yes | max 10,000 chars | Initial roadmap text |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "synapse-backend",
    "name": "Synapse Backend",
    "roadmap": "Build semantic caching layer with memory persistence"
  }'
```

**Response (200)**

```json
{
  "projectId": "synapse-backend",
  "tenantId": "workspace-456",
  "name": "Synapse Backend",
  "roadmap": "Build semantic caching layer with memory persistence",
  "milestoneCount": 0,
  "activeBranches": ["main"],
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

### List Projects

```
GET /api/v1/memory/projects
```

No parameters. Returns all projects for your tenant.

```bash
curl https://api.worldflowai.com/api/v1/memory/projects \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "projects": [
    {
      "projectId": "synapse-backend",
      "tenantId": "workspace-456",
      "name": "Synapse Backend",
      "roadmap": "...",
      "milestoneCount": 12,
      "activeBranches": ["main", "feature-auth"],
      "createdAt": "2026-01-15T10:30:00Z",
      "updatedAt": "2026-02-10T14:22:00Z"
    }
  ]
}
```

### Get Project

```
GET /api/v1/memory/projects/{id}
```

| Parameter | Location | Description |
|-----------|----------|-------------|
| `id` | path | Project ID |

```bash
curl https://api.worldflowai.com/api/v1/memory/projects/synapse-backend \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Same schema as Create Project response.

**Errors**: `404` if project does not exist.

### Delete Project

```
DELETE /api/v1/memory/projects/{id}
```

Permanently deletes a project and all its milestones, branches, and logs. This operation is irreversible.

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/memory/projects/synapse-backend \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Empty body.

**Errors**: `404` if project does not exist.

---

## Store (COMMIT)

### Store Milestone

```
POST /api/v1/memory/projects/{id}/store
```

Creates a new milestone on a branch. Equivalent to `git commit` in the GCC model.

| Field | Type | Required | Default | Limits | Description |
|-------|------|----------|---------|--------|-------------|
| `branchName` | string | no | `"main"` | max 256 chars | Target branch |
| `branchPurpose` | string | yes | | max 2,000 chars | Why this branch exists (GCC part 1) |
| `cumulativeProgress` | string | yes | | max 50,000 chars | What's been done so far (GCC part 2) |
| `thisContribution` | string | yes | | max 10,000 chars | What this milestone adds (GCC part 3) |
| `agentId` | string | yes | | | ID of the agent creating this milestone |
| `agentType` | string | no | `"custom"` | | Agent type (e.g., `"claude-code"`, `"codex"`, `"cursor"`) |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/store \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "main",
    "branchPurpose": "Core cache implementation",
    "cumulativeProgress": "Implemented L1 Redis cache, L2 Milvus store, embedding service integration",
    "thisContribution": "Added cache hit/miss metrics and Prometheus instrumentation",
    "agentId": "claude-code-zach-macbook",
    "agentType": "claude-code"
  }'
```

**Response (200)**

```json
{
  "milestoneId": "ms-a1b2c3d4",
  "projectId": "synapse-backend",
  "branchName": "main",
  "branchPurpose": "Core cache implementation",
  "cumulativeProgress": "Implemented L1 Redis cache, L2 Milvus store, embedding service integration",
  "thisContribution": "Added cache hit/miss metrics and Prometheus instrumentation",
  "contentHash": 12345678901234,
  "sequenceNumber": 5,
  "agentId": "claude-code-zach-macbook",
  "createdAt": "2026-02-10T14:22:00Z"
}
```

**Deduplication**: If the content hash (computed from `branchPurpose` + `cumulativeProgress` + `thisContribution`) matches an existing milestone, the store is silently deduplicated.

---

## Recall (CONTEXT)

### Recall

```
GET /api/v1/memory/projects/{id}/recall
```

Retrieves project context at the requested granularity level. Equivalent to `git log` in the GCC model.

| Parameter | Location | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `id` | path | string | | Project ID |
| `view` | query | string | `"overview"` | View type (see below) |
| `branch` | query | string | `"main"` | Branch name (for `branch` and `log` views) |
| `milestoneId` | query | string | | Milestone ID (required for `milestone` view) |
| `segment` | query | string | | Segment name (required for `metadata` view) |
| `limit` | query | integer | varies | Pagination limit |
| `offset` | query | integer | 0 | Pagination offset |

**View types:**

| View | Default Limit | Returns |
|------|---------------|---------|
| `overview` | - | Project summary, branch list |
| `branch` | 10 | Milestones on a branch (paginated) |
| `milestone` | - | Single milestone detail |
| `log` | 20 | OTA reasoning trace entries |
| `metadata` | - | Custom metadata segment |

```bash
# Overview (default)
curl "https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/recall" \
  -H "Authorization: Bearer $TOKEN"

# Branch view with milestones
curl "https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/recall?view=branch&branch=main&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Single milestone
curl "https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/recall?view=milestone&milestoneId=ms-a1b2c3d4" \
  -H "Authorization: Bearer $TOKEN"

# Log entries
curl "https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/recall?view=log&branch=main&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "project": {
    "projectId": "synapse-backend",
    "tenantId": "workspace-456",
    "name": "Synapse Backend",
    "roadmap": "...",
    "milestoneCount": 12,
    "activeBranches": ["main", "feature-auth"],
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-02-10T14:22:00Z"
  },
  "milestones": [],
  "logEntries": [],
  "branches": [
    {
      "projectId": "synapse-backend",
      "branchName": "main",
      "parentBranch": null,
      "purpose": "Primary development branch",
      "status": "active",
      "agentId": "system",
      "createdAt": "2026-01-15T10:30:00Z",
      "abandonReason": null
    }
  ],
  "view": "overview"
}
```

Fields that are empty for the requested view are omitted from the response.

---

## Log (OTA)

### Append Log Entry

```
POST /api/v1/memory/projects/{id}/log
```

Appends a reasoning trace entry. Unlike milestones (curated checkpoints), log entries capture high-frequency agent observations.

| Field | Type | Required | Default | Limits | Description |
|-------|------|----------|---------|--------|-------------|
| `branchName` | string | no | `"main"` | | Target branch |
| `agentId` | string | yes | | | Agent ID |
| `phase` | string | yes | | | OTA phase: `"observation"`, `"thought"`, or `"action"` |
| `content` | string | yes | | max 50,000 chars | Log content |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/log \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "main",
    "agentId": "claude-code-zach-macbook",
    "phase": "observation",
    "content": "User requested adding rate limiting to the proxy endpoint"
  }'
```

**Response (200)**

```json
{
  "entryId": "log-e5f6g7h8",
  "projectId": "synapse-backend",
  "branchName": "main",
  "agentId": "claude-code-zach-macbook",
  "phase": "observation",
  "sequenceNumber": 42,
  "createdAt": "2026-02-10T14:25:00Z"
}
```

---

## Branches

### Create Branch

```
POST /api/v1/memory/projects/{id}/branches
```

Creates a new branch forked from a parent branch.

| Field | Type | Required | Default | Limits | Description |
|-------|------|----------|---------|--------|-------------|
| `branchName` | string | yes | | max 256 chars | Unique branch name within project |
| `parentBranch` | string | no | `"main"` | | Branch to fork from |
| `purpose` | string | yes | | max 2,000 chars | Why this branch was created |
| `agentId` | string | yes | | | Agent creating the branch |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/branches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "feature-auth",
    "parentBranch": "main",
    "purpose": "Implement JWT authentication and API key management",
    "agentId": "claude-code-zach-macbook"
  }'
```

**Response (200)**

```json
{
  "projectId": "synapse-backend",
  "branchName": "feature-auth",
  "parentBranch": "main",
  "purpose": "Implement JWT authentication and API key management",
  "status": "active",
  "agentId": "claude-code-zach-macbook",
  "createdAt": "2026-02-10T14:30:00Z",
  "abandonReason": null
}
```

### List Branches

```
GET /api/v1/memory/projects/{id}/branches
```

```bash
curl https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/branches \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "branches": [
    {
      "projectId": "synapse-backend",
      "branchName": "main",
      "parentBranch": null,
      "purpose": "Primary development branch",
      "status": "active",
      "agentId": "system",
      "createdAt": "2026-01-15T10:30:00Z",
      "abandonReason": null
    }
  ]
}
```

### Get Branch

```
GET /api/v1/memory/projects/{id}/branches/{name}
```

```bash
curl https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/branches/feature-auth \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**: Same schema as branch in Create Branch response.

### Abandon Branch

```
POST /api/v1/memory/projects/{id}/branches/{name}/abandon
```

Marks a branch as abandoned. The branch and its milestones are preserved for history but no new milestones can be added.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | yes | Why the branch was abandoned |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/branches/feature-auth/abandon \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Superseded by OAuth2 implementation on a new branch"}'
```

---

## Merge

### Merge Branch

```
POST /api/v1/memory/projects/{id}/merge
```

Merges milestones from a source branch into a target branch.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sourceBranch` | string | yes | | Branch to merge from |
| `targetBranch` | string | no | `"main"` | Branch to merge into |
| `mergeSummary` | string | yes | max 50,000 chars | Summary of the merge outcome |
| `agentId` | string | yes | | Agent performing the merge |

The source and target branches must be different.

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/merge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceBranch": "feature-auth",
    "targetBranch": "main",
    "mergeSummary": "JWT auth complete: token exchange, middleware, role-based access control",
    "agentId": "claude-code-zach-macbook"
  }'
```

**Response (200)**

```json
{
  "merged": true,
  "milestonesMerged": 3,
  "mergeMilestoneId": "ms-m9n0p1q2",
  "sourceBranchStatus": "merged"
}
```

---

## Roadmap

### Update Roadmap

```
PUT /api/v1/memory/projects/{id}/roadmap
```

Replaces the project's living roadmap document.

| Field | Type | Required | Limits | Description |
|-------|------|----------|--------|-------------|
| `roadmap` | string | yes | 1-10,000 chars | New roadmap text |

```bash
curl -X PUT https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/roadmap \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roadmap": "Phase 1: Cache layer (done)\nPhase 2: Memory API (done)\nPhase 3: Intelligence layer (in progress)"}'
```

**Response (200)**: Updated project response.

---

## Search

### Search Milestones (per-project)

```
POST /api/v1/memory/projects/{id}/search
```

Full-text search across milestones within a project.

| Field | Type | Required | Default | Limits | Description |
|-------|------|----------|---------|--------|-------------|
| `query` | string | yes | | 1-500 chars | Search text |
| `limit` | integer | no | 20 | 1-100 | Maximum results |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication", "limit": 10}'
```

**Response (200)**

```json
{
  "milestones": [
    {
      "milestoneId": "ms-a1b2c3d4",
      "projectId": "synapse-backend",
      "branchName": "feature-auth",
      "branchPurpose": "Implement JWT authentication",
      "cumulativeProgress": "...",
      "thisContribution": "...",
      "contentHash": 12345678901234,
      "sequenceNumber": 1,
      "agentId": "claude-code-zach-macbook",
      "createdAt": "2026-02-10T14:22:00Z"
    }
  ],
  "query": "authentication",
  "count": 1
}
```

### Cross-Project Search

```
POST /api/v1/memory/search
```

Search milestones across all projects (or a filtered set) within your tenant.

| Field | Type | Required | Default | Limits | Description |
|-------|------|----------|---------|--------|-------------|
| `query` | string | yes | | 1-500 chars | Search text |
| `limit` | integer | no | 50 | 1-200 | Maximum results |
| `projectIds` | string[] | no | all | | Filter to specific project IDs |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "rate limiting implementation",
    "limit": 20,
    "projectIds": ["synapse-backend", "synapse-proxy"]
  }'
```

**Response (200)**

```json
{
  "milestones": [],
  "query": "rate limiting implementation",
  "count": 0
}
```

---

## Metrics

### Store Session Metrics

```
POST /api/v1/memory/projects/{id}/metrics
```

Records agent session effectiveness metrics.

| Field | Type | Required | Default | Limits | Description |
|-------|------|----------|---------|--------|-------------|
| `sessionId` | string | yes | | max 128 chars | Unique session identifier |
| `branchName` | string | no | `"main"` | | Branch this session operated on |
| `agentId` | string | yes | | | Agent identifier |
| `agentType` | string | no | `""` | | Agent type (e.g., `"claude-code"`) |
| `milestonesRecalled` | integer | yes | | | Milestones recall returned at session start |
| `compactionCount` | integer | no | 0 | | Context window compactions |
| `toolCallsTotal` | integer | yes | | | Total tool calls in session |
| `toolCallsRead` | integer | no | 0 | | File read operations |
| `toolCallsSearch` | integer | no | 0 | | Search operations |
| `toolCallsEdit` | integer | no | 0 | | Edit/write operations |
| `toolCallsExecute` | integer | no | 0 | | Shell executions |
| `toolCallsAgent` | integer | no | 0 | | Sub-agent delegations |
| `sessionDurationSecs` | integer | yes | | | Session duration in seconds |
| `startedAt` | string | yes | | | ISO 8601 timestamp |
| `endedAt` | string | yes | | | ISO 8601 timestamp |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess-abc123",
    "branchName": "main",
    "agentId": "claude-code-zach-macbook",
    "agentType": "claude-code",
    "milestonesRecalled": 5,
    "compactionCount": 2,
    "toolCallsTotal": 47,
    "toolCallsRead": 15,
    "toolCallsSearch": 8,
    "toolCallsEdit": 12,
    "toolCallsExecute": 7,
    "toolCallsAgent": 5,
    "sessionDurationSecs": 1800,
    "startedAt": "2026-02-10T14:00:00Z",
    "endedAt": "2026-02-10T14:30:00Z"
  }'
```

### Get Metrics Summary

```
GET /api/v1/memory/projects/{id}/metrics/summary
```

Returns aggregated metrics comparing sessions with memory recall vs without.

```bash
curl https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/metrics/summary \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "totalSessions": 45,
  "sessionsWithMemory": 38,
  "sessionsWithoutMemory": 7,
  "avgCompactionsWithMemory": 1.2,
  "avgCompactionsWithoutMemory": 4.8,
  "compactionReductionPct": 75.0,
  "avgContextToolsWithMemory": 8.5,
  "avgContextToolsWithoutMemory": 22.3,
  "contextToolReductionPct": 61.9,
  "avgDurationWithMemorySecs": 1200.0,
  "avgDurationWithoutMemorySecs": 2100.0,
  "contextRecoveryRate": 0.84,
  "sessionsByAgentType": [
    {
      "agentType": "claude-code",
      "sessionCount": 35,
      "avgCompactionReductionPct": 78.0,
      "avgContextToolReductionPct": 65.0
    }
  ],
  "recentSessions": []
}
```

---

## Promote

### Promote Cache Entry to Memory

```
POST /api/v1/memory/projects/{id}/promote
```

Promotes a high-reuse cache entry to long-term knowledge.

| Field | Type | Required | Limits | Description |
|-------|------|----------|--------|-------------|
| `cacheKey` | string | yes | | Cache entry key |
| `reuseScore` | number | yes | 0.0-1.0 | Reuse score that triggered promotion |
| `summary` | string | yes | max 10,000 chars | Summary of the cached content |
| `summaryEmbedding` | number[] | no | | Embedding vector for semantic search |
| `l2Collection` | string | yes | | L2 collection where the entry lives |
| `blobKey` | string | no | | S3 blob key if response was offloaded |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/synapse-backend/promote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cacheKey": "cache-key-xyz",
    "reuseScore": 0.92,
    "summary": "Detailed explanation of Rust async/await patterns with examples",
    "l2Collection": "default"
  }'
```

**Response (200)**

```json
{
  "promoted": true,
  "knowledgeId": "know-r3s4t5u6",
  "reuseScore": 0.92
}
```

---

## Contributors

### Upsert Contributor

```
POST /api/v1/memory/contributors
```

Creates or updates a contributor. Contributors map human identities to agent IDs.

| Field | Type | Required | Limits | Description |
|-------|------|----------|--------|-------------|
| `contributorId` | string | yes | max 128 chars | Unique contributor identifier |
| `displayName` | string | yes | max 256 chars | Human-readable name |
| `agentIds` | string[] | no | | Agent IDs linked to this contributor |
| `role` | string | no | | Role or title |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/contributors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contributorId": "alice",
    "displayName": "Alice Chen",
    "agentIds": ["claude-code-alice-macbook", "cursor-alice-work"],
    "role": "Senior Engineer"
  }'
```

**Response (200)**

```json
{
  "contributorId": "alice",
  "tenantId": "workspace-456",
  "displayName": "Alice Chen",
  "agentIds": ["claude-code-alice-macbook", "cursor-alice-work"],
  "role": "Senior Engineer",
  "createdAt": "2026-02-10T15:00:00Z"
}
```

### List Contributors

```
GET /api/v1/memory/contributors
```

```bash
curl https://api.worldflowai.com/api/v1/memory/contributors \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "contributors": []
}
```

### Get Contributor

```
GET /api/v1/memory/contributors/{id}
```

```bash
curl https://api.worldflowai.com/api/v1/memory/contributors/alice \
  -H "Authorization: Bearer $TOKEN"
```

### Delete Contributor

```
DELETE /api/v1/memory/contributors/{id}
```

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/memory/contributors/alice \
  -H "Authorization: Bearer $TOKEN"
```

### Get Contributor Activity

```
GET /api/v1/memory/contributors/{id}/activity
```

Returns the contributor's cross-project milestone activity.

| Parameter | Location | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `limit` | query | integer | 50 | Maximum milestones to return |

```bash
curl "https://api.worldflowai.com/api/v1/memory/contributors/alice/activity?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "contributor": {
    "contributorId": "alice",
    "tenantId": "workspace-456",
    "displayName": "Alice Chen",
    "agentIds": ["claude-code-alice-macbook"],
    "role": "Senior Engineer",
    "createdAt": "2026-02-10T15:00:00Z"
  },
  "milestones": [],
  "totalMilestones": 0
}
```

---

## External Sources

### Create External Source

```
POST /api/v1/memory/sources
```

Registers an external data source for context ingestion.

| Field | Type | Required | Limits | Description |
|-------|------|----------|--------|-------------|
| `sourceId` | string | yes | max 128 chars | Unique source identifier |
| `projectId` | string | yes | | Project this source feeds into |
| `sourceType` | string | yes | | One of: `"slack"`, `"jira"`, `"confluence"`, `"github"` |
| `config` | object | no | | Source-specific configuration |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/sources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "slack-engineering",
    "projectId": "synapse-backend",
    "sourceType": "slack",
    "config": {
      "channelId": "C0123456789",
      "channelName": "engineering"
    }
  }'
```

**Response (200)**

```json
{
  "sourceId": "slack-engineering",
  "tenantId": "workspace-456",
  "projectId": "synapse-backend",
  "sourceType": "slack",
  "config": {"channelId": "C0123456789", "channelName": "engineering"},
  "syncCursor": "",
  "lastSyncedAt": null,
  "enabled": true,
  "createdAt": "2026-02-10T15:30:00Z"
}
```

### List External Sources

```
GET /api/v1/memory/sources
```

```bash
curl https://api.worldflowai.com/api/v1/memory/sources \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "sources": []
}
```

### Update External Source

```
PUT /api/v1/memory/sources/{id}
```

Partial update --- only include the fields you want to change.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | no | New target project |
| `sourceType` | string | no | New source type |
| `config` | object | no | New configuration |
| `enabled` | boolean | no | Enable or disable the source |

```bash
curl -X PUT https://api.worldflowai.com/api/v1/memory/sources/slack-engineering \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Delete External Source

```
DELETE /api/v1/memory/sources/{id}
```

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/memory/sources/slack-engineering \
  -H "Authorization: Bearer $TOKEN"
```

### Trigger Manual Sync

```
POST /api/v1/memory/sources/{id}/sync
```

Triggers an immediate sync for the source.

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/sources/slack-engineering/sync \
  -H "Authorization: Bearer $TOKEN"
```

### Get Sync Status

```
GET /api/v1/memory/sources/{id}/status
```

```bash
curl https://api.worldflowai.com/api/v1/memory/sources/slack-engineering/status \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200)**

```json
{
  "sourceId": "slack-engineering",
  "lastSyncedAt": "2026-02-10T15:35:00Z",
  "syncCursor": "1707580500.000100",
  "enabled": true
}
```

---

## Intelligence

### Query

```
POST /api/v1/memory/intelligence/query
```

Ask a natural language question over the full memory graph.

| Field | Type | Required | Default | Limits | Description |
|-------|------|----------|---------|--------|-------------|
| `question` | string | yes | | max 2,000 chars | Natural language question |
| `projectIds` | string[] | no | all | | Filter to specific projects |
| `contributorFilter` | string | no | | | Filter by contributor name or ID |
| `timeRange` | string | no | `"30d"` | | Time window: `"1d"`, `"7d"`, `"14d"`, `"30d"`, `"90d"`, `"all"` |
| `includeExternalSources` | boolean | no | `true` | | Include data from external sources |
| `contextLimit` | integer | no | 50 | 1-200 | Maximum context milestones to gather |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/intelligence/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What progress has been made on the authentication system this week?",
    "timeRange": "7d",
    "projectIds": ["synapse-backend"]
  }'
```

**Response (200)**

```json
{
  "answer": "This week, JWT authentication was implemented with token exchange...",
  "sources": [
    {
      "milestoneId": "ms-a1b2c3d4",
      "projectId": "synapse-backend",
      "branchName": "feature-auth",
      "excerpt": "Added JWT token exchange endpoint and middleware",
      "createdAt": "2026-02-08T10:00:00Z"
    }
  ],
  "question": "What progress has been made on the authentication system this week?",
  "projectsSearched": ["synapse-backend"]
}
```

### Execute Action

```
POST /api/v1/memory/intelligence/action
```

Execute a follow-up action based on intelligence results.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | yes | Action type (e.g., `"create_jira_ticket"`, `"post_slack"`) |
| `params` | object | yes | Action-specific parameters |

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/intelligence/action \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_jira_ticket",
    "params": {
      "project": "SYN",
      "summary": "Follow up on auth implementation",
      "description": "Review and finalize JWT token rotation strategy"
    }
  }'
```

**Response (200)**

```json
{
  "executed": true,
  "action": "create_jira_ticket",
  "result": {
    "ticketId": "SYN-123",
    "url": "https://yourorg.atlassian.net/browse/SYN-123"
  }
}
```
