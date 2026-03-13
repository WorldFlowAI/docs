---
title: Response Headers
description: Complete reference for all HTTP headers returned by WorldFlow AI endpoints, including cost optimizer headers, cache headers, rate limit headers, standard headers, and example responses.
sidebar_position: 4
---

# Response Headers Reference

Complete reference for all HTTP headers returned by WorldFlow AI endpoints.

## Cost Optimizer Headers (`x-worldflow-*`)

Returned by proxy endpoints when the cost optimizer is active.

| Header | Type | Example | Description |
|--------|------|---------|-------------|
| `x-worldflow-provider` | string | `openai` | Provider that handled the request |
| `x-worldflow-model` | string | `gpt-4o-mini` | Model that generated the response |
| `x-worldflow-cost` | float | `0.000450` | Actual cost of this request in USD |
| `x-worldflow-cost-saved` | float | `0.008550` | Estimated savings vs. most expensive alternative in USD |
| `x-worldflow-routing-reason` | string | `auto_cost_optimized` | Why this model was selected |

### `x-worldflow-routing-reason` Values

| Value | Description |
|-------|-------------|
| `auto_cost_optimized` | Optimizer selected cheapest model meeting quality threshold |
| `cheapest_available` | Cheapest routing mode selected the absolute cheapest model |
| `fastest_available` | Fastest routing mode selected the lowest-latency model |
| `fixed_model` | Request pinned to a specific model via `fixed:<model>` |
| `chain_routing` | Request delegated to a multi-model chain |
| `fallback` | No model met the quality threshold; fallback model used |
| `fallback_not_in_matrix` | Fallback model not found in cost matrix |
| `cheapest_capable` | Routing engine selected cheapest capable provider |
| `quality_preferred` | Quality-first strategy preferred a higher-quality model |
| `budget_constrained` | Budget pressure forced a cheaper model selection |
| `cache_affinity` | A model with warm cache data was preferred |
| `policy_override` | A static routing rule or force-provider hint matched |
| `failover` | Primary providers unavailable; failover provider used |
| `cascade_escalation` | Query escalated to a higher-tier model after initial attempt |
| `latency_sla` | Selected to meet a latency SLO constraint |

### Request Header: `X-WorldFlow-Routing`

Controls per-request routing behavior.

| Value | Behavior |
|-------|----------|
| `auto` | Use the workspace's configured routing strategy |
| `cheapest` | Pick the cheapest available model (no quality threshold) |
| `fastest` | Pick the lowest-latency model |
| `fixed:<model_id>` | Pin to a specific model (e.g., `fixed:gpt-4o`) |
| `fixed:chain:<chain_id>` | Execute a multi-model chain |

## Cache Headers (`x-synapse-*`)

Returned by all proxy endpoints (OpenAI-compatible, Anthropic-compatible, Gemini-compatible, Cohere-compatible).

### Response Headers

| Header | Type | Example | Description |
|--------|------|---------|-------------|
| `x-synapse-cache-status` | string | `HIT` | Cache result: `HIT`, `MISS`, `SKIP`, or `BYPASS` |
| `x-synapse-cache-tier` | string | `L2` | Cache tier that served the response: `L0`, `L1`, `L2`, or `NONE` |
| `x-synapse-latency-ms` | integer | `23` | Total request processing latency in milliseconds |
| `x-synapse-similarity` | float | `0.9400` | Cosine similarity score on cache hits (0.0-1.0) |
| `x-synapse-cost-saved` | float | `0.042000` | Estimated cost saved by cache hit in USD |
| `x-synapse-response-bucket-index` | integer | `2` | Cache bucket index used (when bucketing is active) |

#### `x-synapse-cache-status` Values

| Value | Description |
|-------|-------------|
| `HIT` | Response served from semantic cache. No LLM call was made. |
| `HIT-L1` | Response served from L1 (Redis) cache. |
| `HIT-L2` | Response served from L2 (Milvus) vector cache. |
| `MISS` | No similar query found in cache. Request forwarded to provider. Response cached for future use. |
| `SKIP` | Cache was bypassed due to `X-Synapse-Skip-Cache: true` or `BYPASS` configuration. |
| `BYPASS` | Request forwarded directly without cache interaction (passthrough mode). |

#### `x-synapse-cache-tier` Values

| Value | Description |
|-------|-------------|
| `L0` | GPU-resident HBM cache (CAGRA index). Lowest latency (~1ms). |
| `L1` | Redis with RediSearch HNSW index. Low latency (~5ms). |
| `L2` | Milvus vector database. Higher capacity, slightly higher latency (~15ms). |
| `NONE` | No cache tier was involved (cache miss, skip, or bypass). |

### Request Headers

| Header | Type | Values | Description |
|--------|------|--------|-------------|
| `x-synapse-skip-cache` | boolean | `true`, `1` | Bypass cache for this request |
| `x-synapse-preview-cache` | boolean | `true`, `1` | Return cache prediction without making an LLM call |
| `x-synapse-passthrough` | boolean | `true`, `1` | Forward directly to provider without caching or stream processing. Use for tool-use heavy clients. |
| `x-synapse-workspace-context` | string | `commit:abc1234,dirty:3` | Workspace state for code-aware cache invalidation |
| `x-synapse-code-context` | JSON | See below | Code session context for three-stage cache matching |
| `x-synapse-bucket-size` | integer | `10` | Override bucket size (1-255) |
| `x-synapse-bucket-index` | integer | `3` | Select a specific bucket entry (0-based) |
| `x-synapse-bucket-mode` | string | `deterministic` | Override bucket selection: `random`, `recency`, `deterministic` |
| `x-synapse-bucket-disabled` | boolean | `true`, `1` | Disable bucketing for this request |
| `x-api-key` | string | `sk-...` | Client's own API key for transparent cache mode (used on cache misses) |

#### `x-synapse-workspace-context` Format

Comma-separated key-value pairs:

```
commit:<git-hash>,dirty:<count>,files_hash:<hash>,root:<path>
```

| Key | Description |
|-----|-------------|
| `commit` | Current git commit hash |
| `dirty` | Number of uncommitted file changes |
| `files_hash` | Hash of mentioned file contents |
| `root` | Workspace root path |

#### `x-synapse-code-context` Schema

JSON-encoded object:

```json
{
  "session_id": "session-abc123",
  "file_paths_mentioned": ["src/lib.rs", "src/main.rs"],
  "recent_tool_calls": [["Read", "src/lib.rs"]],
  "system_prompt_hash": "hash123",
  "working_directory": "/path/to/project",
  "git_commit": "abc123",
  "mentioned_files_mtime": {"src/lib.rs": 1704067200}
}
```

## Rate Limit Headers (`X-RateLimit-*`)

Returned by all API endpoints when rate limiting is enabled.

### Response Headers (Success)

| Header | Type | Example | Description |
|--------|------|---------|-------------|
| `X-RateLimit-Limit` | integer | `6000` | Maximum requests allowed per minute |
| `X-RateLimit-Remaining` | integer | `5999` | Approximate requests remaining in current window |
| `X-RateLimit-Reset` | integer | `60` | Seconds until the rate limit window resets |

### Response Headers (Rate Limited -- HTTP 429)

| Header | Type | Example | Description |
|--------|------|---------|-------------|
| `Retry-After` | integer | `5` | Seconds to wait before retrying |

### Rate Limit Tiers

| Tier | RPS | RPM | TPM | RPD | Burst |
|------|-----|-----|-----|-----|-------|
| Starter | 10 | 600 | 100K | 10K | 2x RPS |
| Pro | 100 | 6,000 | 1M | 100K | 2x RPS |
| Enterprise | 500 | 30,000 | 10M | 1M | 2x RPS |

Burst tolerance allows short spikes at 2x the per-second limit for up to 5 seconds.

## Standard Headers

Returned by all endpoints.

| Header | Type | Example | Description |
|--------|------|---------|-------------|
| `Content-Type` | string | `application/json` | Response content type |
| `X-Request-ID` | UUID | `550e8400-e29b-41d4-a716-446655440000` | Unique request identifier for tracing and support |

## Example Response

A cache miss with cost-optimized routing:

```
HTTP/1.1 200 OK
Content-Type: application/json
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
x-synapse-cache-status: MISS
x-synapse-cache-tier: NONE
x-synapse-latency-ms: 1250
x-worldflow-provider: openai
x-worldflow-model: gpt-4o-mini
x-worldflow-cost: 0.000450
x-worldflow-cost-saved: 0.008550
x-worldflow-routing-reason: auto_cost_optimized
X-RateLimit-Limit: 6000
X-RateLimit-Remaining: 5999
X-RateLimit-Reset: 60
```

A cache hit (no LLM call, no cost):

```
HTTP/1.1 200 OK
Content-Type: application/json
X-Request-ID: 660f9500-f30c-52e5-b827-557766551111
x-synapse-cache-status: HIT-L2
x-synapse-cache-tier: L2
x-synapse-latency-ms: 15
x-synapse-similarity: 0.9650
x-synapse-cost-saved: 0.009000
X-RateLimit-Limit: 6000
X-RateLimit-Remaining: 5998
X-RateLimit-Reset: 59
```
