---
title: Agentic Workflow Caching
description: Reduce agentic AI costs by 30-50% with cross-agent tool result sharing, plan template reuse, request coalescing, and entity-based smart invalidation.
sidebar_position: 9
---

# Agentic Workflow Caching

WorldFlow AI provides intelligent caching designed for multi-agent workflows, delivering 30-50% cost reduction through cross-agent tool result sharing, automatic cache invalidation, and plan template reuse.

## Overview

Agentic AI systems face unique cost challenges: redundant tool calls across agents, repeated planning for similar goals, no sharing of learned patterns between sessions, and concurrent agents hitting external API rate limits. WorldFlow AI addresses all four with a layered caching engine.

| Feature | How It Works | Typical Savings |
|---------|--------------|-----------------|
| **Cross-Agent Tool Sharing** | Agent B reuses results from Agent A's tool calls | 20-30% token reduction |
| **Plan Template Reuse** | Skip LLM reasoning for known query patterns | 10-15% planning token reduction |
| **Request Coalescing** | Deduplicate concurrent identical tool calls into a single API call | 5-10% API cost reduction |
| **Smart Invalidation** | Automatically clear stale cache entries when a write tool executes | Prevents stale responses |

---

## Architecture

```
+----------------------------------------------------------------------+
|                        AGENT FRAMEWORKS                              |
|  LangChain  |  CrewAI  |  AutoGen  |  Claude Code / MCP  |  Custom  |
+---------|-----------|-----------|---------------------|------------+
          v           v           v                     v
+----------------------------------------------------------------------+
|                     WORLDFLOW AI GATEWAY (8080)                      |
|  Auth / RBAC  -->  Tool Extraction  -->  Cache Key Generation        |
+----------------------------------------------------------------------+
                              |
                              v
+----------------------------------------------------------------------+
|                     WORLDFLOW AI PROXY (8081)                        |
|  +------------------+  +------------------+  +-------------------+   |
|  | TOOL CACHE       |  | PLAN CACHE       |  | REQUEST COALESCE  |   |
|  | - Exact match    |  | - Goal embedding |  | - In-flight dedup |   |
|  | - Semantic match |  | - Variable bind  |  | - Timeout handle  |   |
|  | - TTL by category|  | - Quality score  |  +-------------------+   |
|  +------------------+  +------------------+                          |
|                                                                      |
|  +-------------------+  +-------------------+                        |
|  | INVALIDATION      |  | SMART TOOL CACHE  |                        |
|  | - Write triggers  |  | - File-aware      |                        |
|  | - Entity tracking |  | - Session scoping |                        |
|  +-------------------+  +-------------------+                        |
+----------------------------------------------------------------------+
          |                                        |
          v                                        v
   L1 Cache (Redis)                        L2 Cache (Milvus)
   HNSW index, ~1-5ms                     Vector similarity, ~20-50ms
   Hot data, session state                 Cross-agent, long-term
```

### How a cache hit works

1. An agent calls a tool, for example `get_user_profile(user_id="123")`.
2. The gateway extracts the tool name, parameters, and tenant ID.
3. The proxy generates a deterministic cache key using Blake3 over the normalized tool name and canonicalized parameters.
4. L1 (Redis) is checked first. On a hit the cached result is returned in approximately 1-5 ms with headers `X-Cache-Status: HIT` and `X-Cache-Tier: L1`.
5. On an L1 miss, L2 (Milvus) is checked for a semantic match. A hit there is returned in approximately 20-50 ms.

### How request coalescing works

When multiple agents call the same tool with the same parameters within a configurable window (default 50 ms), only the first call is forwarded to the external service. The remaining callers wait on the in-flight result and receive the same response, avoiding redundant API calls.

---

## End-to-End Tutorial

This section walks through a complete setup: register an MCP server, discover its tools, configure caching, define entities, and set up invalidation rules. All examples use the WorldFlow AI gateway at `https://api.worldflowai.com`.

Replace `$TOKEN` with your JWT bearer token in every request.

### Step 1: Register an MCP Server

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Atlassian MCP",
    "url": "https://mcp.atlassian.example.com:9001",
    "transport": "HTTP",
    "authType": "API_KEY",
    "authConfig": {
      "type": "API_KEY",
      "header": "Authorization",
      "valueEnv": "ATLASSIAN_API_KEY"
    }
  }'
```

The server is created with status `PENDING`. A health check runs automatically. Once it passes, the status transitions to `HEALTHY`.

### Step 2: Verify Server Health

```bash
# Replace {serverId} with the id from Step 1
curl https://api.worldflowai.com/api/v1/mcp/servers/{serverId}/health \
  -H "Authorization: Bearer $TOKEN"
```

The response includes `status`, `latencyP50Ms`, `latencyP99Ms`, and `checkedAt`. Results are cached for 30 seconds.

### Step 3: Discover Tools

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/servers/{serverId}/discover \
  -H "Authorization: Bearer $TOKEN"
```

This calls the MCP `tools/list` endpoint on the remote server. Each discovered tool is automatically classified as `READ`, `WRITE`, `IDEMPOTENT`, or `UNKNOWN` based on its name:

| Name Pattern | Category |
|--------------|----------|
| `get_*`, `fetch_*`, `list_*`, `search_*`, `find_*`, `query_*`, `read_*`, `lookup_*` | READ |
| `update_*`, `create_*`, `delete_*`, `set_*`, `insert_*`, `remove_*`, `add_*`, `modify_*`, `write_*`, `edit_*` | WRITE |
| `calculate_*`, `compute_*`, `transform_*`, `format_*`, `convert_*`, `parse_*`, `validate_*`, `hash_*`, `encode_*`, `decode_*` | IDEMPOTENT |
| Everything else | UNKNOWN |

### Step 4: Configure Caching for a Tool

```bash
# List discovered tools to find their IDs
curl "https://api.worldflowai.com/api/v1/mcp/tools?serverId={serverId}" \
  -H "Authorization: Bearer $TOKEN"

# Enable caching on a specific tool
curl -X PATCH https://api.worldflowai.com/api/v1/mcp/tools/{toolId}/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "READ",
    "cacheEnabled": true,
    "cacheTtlSecs": 3600,
    "semanticThreshold": 0.90,
    "crossAgentEnabled": true,
    "coalescingWindowMs": 100
  }'
```

All fields are optional. Only the fields you provide are updated. Setting `category` manually marks it as an override and prevents auto-classification from changing it.

### Step 5: Define Entities

Entities represent the data types your tools operate on. They drive automatic cache invalidation: when a WRITE tool modifies an entity, all READ tool caches referencing that entity are cleared.

```bash
# Create a parent entity
curl -X POST https://api.worldflowai.com/api/v1/mcp/entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "jira_project",
    "description": "A JIRA project"
  }'

# Create a child entity (cascade invalidation)
curl -X POST https://api.worldflowai.com/api/v1/mcp/entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "jira_issue",
    "description": "A JIRA issue",
    "parentId": "{projectEntityId}"
  }'
```

When an entity has a `parentId`, invalidating the parent cascades to all child entities. For example, deleting a project entity invalidates all cached issue data.

### Step 6: Map Tools to Entities

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/tool-entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toolId": "{getIssueToolId}",
    "entityId": "{jiraIssueEntityId}",
    "paramName": "issueId",
    "operation": "READ"
  }'

curl -X POST https://api.worldflowai.com/api/v1/mcp/tool-entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toolId": "{updateIssueToolId}",
    "entityId": "{jiraIssueEntityId}",
    "paramName": "issueId",
    "operation": "WRITE"
  }'
```

### Step 7: Auto-Generate Invalidation Rules

Once tools are mapped to entities, WorldFlow AI can generate invalidation rules automatically. Any WRITE tool that writes an entity will invalidate all READ tools that read the same entity.

```bash
curl -X POST https://api.worldflowai.com/api/v1/mcp/rules/generate \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "rulesGenerated": 2,
  "rulesSkipped": 0,
  "generatedRules": [
    {
      "writeToolId": "...",
      "writeToolName": "update_issue",
      "invalidateToolId": "...",
      "invalidateToolName": "get_issue",
      "sharedEntities": ["jira_issue"]
    }
  ],
  "message": "Generated 2 new invalidation rule(s) based on shared entity mappings"
}
```

Existing rules are never duplicated.

### Step 8: Verify with Analytics

```bash
curl "https://api.worldflowai.com/api/v1/mcp/analytics?granularity=hour" \
  -H "Authorization: Bearer $TOKEN"
```

The response includes a `summary` with `totalCalls`, `cacheHits`, `cacheMisses`, `hitRate`, `estimatedTimeSavedMs`, and `estimatedCostSaved`, plus per-server and per-tool breakdowns and a time-series trend.

### Step 9: Export Configuration

For GitOps workflows or backup, export the complete configuration as YAML:

```bash
curl https://api.worldflowai.com/api/v1/mcp/config/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/yaml"
```

---

## Cross-Agent Tool Result Sharing

When `crossAgentEnabled` is `true` for a tool (the default for READ and IDEMPOTENT tools), any agent within the same tenant can reuse cached results from another agent's tool call.

**Example**: A three-agent CrewAI crew where a researcher, analyst, and writer all call `get_customer_info("C-123")`. The researcher's call is a cache miss and is stored. The analyst and writer both get cache hits, eliminating two API calls.

Cache keys are tenant-scoped. Agent A in tenant `acme-corp` can never see cached results from tenant `globex-inc`.

---

## Plan Template Reuse

Plan caching stores the LLM's execution plan (the sequence of tool calls and reasoning steps) for a given goal. When a semantically similar goal appears later, the cached plan is reused with variable rebinding rather than regenerating it from scratch.

Plan templates are scored on three dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Success rate | 0.4 | How often the plan led to a successful outcome |
| Recency | 0.3 | More recent plans are preferred |
| Usage count | 0.3 | Frequently reused plans are preferred |

A plan template is only reused if the variable binding confidence exceeds 0.70 (configurable via `SYNAPSE_PLAN_CACHE_MIN_BINDING_CONFIDENCE`).

---

## Request Coalescing

When multiple agents make identical tool calls within the coalescing window (default 50 ms, configurable up to 5000 ms), only one call reaches the external service. All waiting agents receive the same result.

This is particularly effective for:
- Concurrent agents querying the same database record
- Burst traffic to rate-limited external APIs
- Startup scenarios where many agents initialize with the same data

Monitor coalescing effectiveness with the `synapse_tool_cache_coalesce_total` Prometheus metric.

---

## Smart Invalidation

### Entity-Based Invalidation

When a WRITE tool executes, WorldFlow AI checks the invalidation rules and clears all cached results for READ tools that share the same entity. This happens automatically; no application-level code is needed.

Cascade invalidation follows `parentId` relationships. Invalidating a `jira_project` entity also invalidates all `jira_issue` and `jira_comment` entities that have it as a parent.

### File-Aware Invalidation (Smart Tool Cache)

For coding assistants like Claude Code, the smart tool cache detects file paths in tool results and automatically invalidates cached reads when a file is written or edited.

| Tool Operation | Detection Pattern | Cache Action |
|----------------|-------------------|--------------|
| Read file | Line-numbered content | Track file as accessed |
| Write file | `Successfully wrote to <path>` | Invalidate cached reads for that path |
| Edit file | `Edited <path>` | Invalidate cached reads for that path |

Enable with:

```bash
export SYNAPSE_SMART_TOOL_CACHE_ENABLED=true
export SYNAPSE_SMART_TOOL_CACHE_SESSION_TTL=3600
export SYNAPSE_SMART_TOOL_CACHE_DETECT_PATHS=true
```

---

## Configuration Reference

### Environment Variables

#### Tool Cache

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNAPSE_TOOL_CACHE_ENABLED` | `false` | Enable tool result caching |
| `SYNAPSE_TOOL_CACHE_SEMANTIC_ENABLED` | `true` | Enable semantic (vector) matching for tools |
| `SYNAPSE_TOOL_CACHE_SEMANTIC_THRESHOLD` | `0.90` | Minimum similarity score for a semantic cache hit (0.0-1.0) |
| `SYNAPSE_TOOL_CACHE_CROSS_AGENT` | `true` | Share cached results across agents within the same tenant |
| `SYNAPSE_TOOL_CACHE_DEFAULT_TTL` | `3600` | Default time-to-live in seconds |
| `SYNAPSE_TOOL_CACHE_ERROR_TTL` | `60` | TTL for error results (prevents thundering herd on transient failures) |
| `SYNAPSE_TOOL_CACHE_AUTO_CLASSIFY` | `true` | Classify tools as READ/WRITE/IDEMPOTENT based on name patterns |
| `SYNAPSE_TOOL_CACHE_MAX_RESULTS` | `5` | Maximum semantic search results returned |
| `SYNAPSE_TOOL_CACHE_COALESCING_ENABLED` | `true` | Enable request coalescing for concurrent identical calls |
| `SYNAPSE_TOOL_CACHE_COALESCING_TIMEOUT_MS` | `5000` | Maximum time to wait for an in-flight coalesced request |
| `SYNAPSE_TOOL_CACHE_TENANTS` | `` | Comma-separated list of tenant IDs to enable (empty = all tenants) |

#### Smart Tool Cache

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNAPSE_SMART_TOOL_CACHE_ENABLED` | `false` | Enable file-aware cache invalidation for coding assistants |
| `SYNAPSE_SMART_TOOL_CACHE_SESSION_TTL` | `3600` | Session TTL in seconds |
| `SYNAPSE_SMART_TOOL_CACHE_DETECT_PATHS` | `true` | Detect file paths in tool results and queries |
| `SYNAPSE_SMART_TOOL_CACHE_MAX_FILES` | `1000` | Maximum number of files tracked per session |

#### Plan Cache

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNAPSE_PLAN_CACHE_ENABLED` | `false` | Enable plan template caching |
| `SYNAPSE_PLAN_CACHE_SEMANTIC_THRESHOLD` | `0.85` | Minimum similarity for a plan template match |
| `SYNAPSE_PLAN_CACHE_MIN_BINDING_CONFIDENCE` | `0.70` | Minimum confidence for variable binding in a reused plan |
| `SYNAPSE_PLAN_CACHE_DEFAULT_TTL` | `86400` | Plan template TTL in seconds (default 24 hours) |

### Tuning Guidance

**Semantic threshold** (`SYNAPSE_TOOL_CACHE_SEMANTIC_THRESHOLD`): Start with the default of 0.90. If your cache hit rate is below 30% and you have high tool call redundancy, try lowering to 0.85. If you see stale or incorrect cache hits, raise to 0.95.

**TTL by category**: The defaults (READ = 1 hour, IDEMPOTENT = 24 hours, external API = 5 minutes) work well for most workloads. For rapidly changing data sources, reduce the TTL. For stable reference data, increase it.

**Coalescing window**: The default 50 ms window catches most concurrent duplicate calls. Increase to 100-200 ms if you see many agents starting simultaneously. Avoid values above 500 ms as they add latency to the first caller.

**Cross-agent sharing**: Disable for tools that return user-specific or session-specific data that should not be shared. Use the `crossAgent.excludeTools` list in Helm values to exclude sensitive tools globally.

### Helm Values (Complete Example)

```yaml
proxy:
  toolCache:
    enabled: true
    semantic:
      enabled: true
      threshold: 0.90
    crossAgent:
      enabled: true
      excludeTools:
        - "get_user_credentials"
        - "fetch_api_key"
    coalescing:
      enabled: true
      timeoutMs: 5000
      maxWaiters: 100
    ttl:
      read: 3600
      idempotent: 86400
      externalApi: 300
      error: 60
    toolOverrides:
      "mcp__atlassian__*":
        category: "read"
        ttlSecs: 1800
        crossAgentEligible: true

  planCache:
    enabled: true
    semantic:
      threshold: 0.85
    binding:
      minConfidence: 0.70
    quality:
      successWeight: 0.4
      recencyWeight: 0.3
      usageWeight: 0.3
    ttlSecs: 86400

  smartToolCache:
    enabled: true
    sessionTtlSecs: 3600
    detectPaths: true
    maxFilesPerSession: 1000
```

---

## Monitoring

WorldFlow AI exposes Prometheus metrics for all caching operations:

| Metric | Type | Description |
|--------|------|-------------|
| `synapse_tool_cache_hits_total` | counter | Tool cache hits, labeled by `tenant_id`, `tool_name`, `tier` |
| `synapse_tool_cache_misses_total` | counter | Tool cache misses, labeled by `tenant_id`, `tool_name`, `reason` |
| `synapse_tool_cache_latency_seconds` | histogram | Operation latency, labeled by `tenant_id`, `operation` |
| `synapse_tool_cache_coalesce_total` | counter | Coalesced (deduplicated) tool calls |
| `synapse_plan_cache_hits_total` | counter | Plan template cache hits |
| `synapse_tokens_saved_total` | counter | Total tokens saved by caching |
| `synapse_api_calls_saved_total` | counter | External API calls avoided |

The MCP analytics endpoint (`GET /api/v1/mcp/analytics`) provides the same data in JSON format with per-server and per-tool breakdowns, suitable for dashboards. See the [MCP Server API reference](/docs/api-reference/mcp-api) for details.

### Real-Time Activity Stream

Connect to the WebSocket endpoint `GET /api/v1/mcp/stream` for live events including tool invocations, cache hits and misses, invalidation triggers, and health check results.

---

## Cost Savings Estimate

For a workload of 1,000 agent runs per day with 5 tool calls per run and 800 tokens per call at $0.03/1K tokens:

| Metric | Without Caching | With Caching |
|--------|-----------------|--------------|
| Daily tool calls | 5,000 | 2,500 (50% hit rate) |
| Daily tokens | 4,000,000 | 1,960,000 |
| Daily cost | $120.00 | $58.80 |
| **Monthly savings** | -- | **$1,836** (51%) |

Actual savings depend on workload characteristics. Workloads with high tool call redundancy (CRM lookups, reference data queries) see the highest hit rates. Unique or write-heavy workloads see lower hit rates but still benefit from coalescing and plan reuse.
