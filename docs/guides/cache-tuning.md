---
title: Cache Threshold Tuning
description: Configure WorldFlow AI semantic cache thresholds, run simulations, test query variations in the playground, tune request coalescing, and manage cache invalidation.
sidebar_position: 13
---

# Cache Threshold Tuning

WorldFlow AI matches incoming queries against cached responses using vector similarity. The **cache hit threshold** controls how similar a query must be to a cached entry before the cached response is returned. This guide covers threshold configuration, simulation, the playground, request coalescing, and cache invalidation strategies.

## Global Threshold Settings

### Get Current Settings

```
GET /api/v1/thresholds
```

Requires the `ViewMetrics` permission.

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/thresholds"
```

The response includes the global cache hit threshold, partial hit threshold, and TTL settings for both L1 (in-memory) and L2 (persistent) cache tiers.

### Update Settings

```
PUT /api/v1/thresholds
```

Requires the `ManageConfig` permission. Only provided fields are updated; omitted fields retain their current values.

```bash
curl -X PUT -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/thresholds" \
  -d '{
    "cacheHitThreshold": 0.85,
    "partialHitThreshold": 0.70,
    "l1TtlSecs": 7200,
    "l2TtlSecs": 86400
  }'
```

**Key fields**

| Field | Type | Description |
|-------|------|-------------|
| `cacheHitThreshold` | float (0-1) | Minimum cosine similarity for a full cache hit. Higher values are stricter (fewer hits, higher precision). |
| `partialHitThreshold` | float (0-1) | Minimum similarity for a partial hit (returned with a lower-confidence flag). |
| `l1TtlSecs` | integer | Time-to-live for L1 (in-memory) cache entries, in seconds. |
| `l2TtlSecs` | integer | Time-to-live for L2 (persistent) cache entries, in seconds. |

### Choosing a Threshold

| Threshold | Hit Rate | Precision | Best For |
|-----------|----------|-----------|----------|
| 0.90 - 0.95 | Low | Very high | Regulated industries, medical/legal content |
| 0.80 - 0.89 | Medium | High | General production workloads (recommended starting point) |
| 0.70 - 0.79 | High | Medium | High-volume FAQ or support bots where approximate answers are acceptable |

:::tip
Start at **0.85** and use the simulation endpoint to measure the impact before lowering.
:::

## Tenant Overrides

Override global thresholds for specific tenants. Overrides are matched by tenant ID and take precedence over global settings.

### List Overrides

```
GET /api/v1/thresholds/tenants
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tenantId` | string | Filter by tenant ID |
| `page` | integer | Page number |
| `pageSize` | integer | Items per page |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/thresholds/tenants"
```

### Create or Update an Override

```
PUT /api/v1/thresholds/tenants/{tenant_id}
```

Requires the `ManageConfig` permission. Creates the override if it does not exist, or updates it.

```bash
curl -X PUT -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/thresholds/tenants/enterprise-acme" \
  -d '{
    "cacheHitThreshold": 0.92,
    "partialHitThreshold": 0.80,
    "l1TtlSecs": 3600
  }'
```

### Delete an Override

```
DELETE /api/v1/thresholds/tenants/{tenant_id}
```

The tenant falls back to global settings after deletion.

```bash
curl -X DELETE -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/thresholds/tenants/enterprise-acme"
```

## Simulation

Before changing thresholds in production, simulate the impact against historical data.

```
GET /api/v1/thresholds/simulate
```

Requires the `ViewMetrics` permission.

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cacheHitThreshold` | float | Proposed cache hit threshold |
| `partialHitThreshold` | float | Proposed partial hit threshold |
| `tenantId` | string | Scope simulation to a specific tenant |
| `period` | string | Historical window: `day`, `week`, or `month` |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/thresholds/simulate?cacheHitThreshold=0.80&period=week"
```

The response includes the projected hit rate, estimated cost savings delta, and a breakdown of how many historical queries would shift between hit, partial hit, and miss at the proposed threshold.

**Example workflow:**

1. Get current settings: `GET /api/v1/thresholds`
2. Simulate a lower threshold: `GET /api/v1/thresholds/simulate?cacheHitThreshold=0.80&period=week`
3. Review projected hit rate and savings.
4. If acceptable, apply: `PUT /api/v1/thresholds` with `{"cacheHitThreshold": 0.80}`
5. Monitor `/api/v1/analytics/savings` for the next 24 hours.

## Playground

The playground lets you test how specific queries interact with the cache before they reach production.

### Preview Cache Behavior

```
POST /api/v1/playground/preview
```

Tests a query against the live cache without making an LLM call. Returns the similarity score, predicted cache tier, and latency estimate.

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Synapse-Preview-Cache: true" \
  "https://gateway.example.com/api/v1/playground/preview" \
  -d '{
    "query": "What is the weather today?",
    "model": "gpt-4o"
  }'
```

### Generate Query Variations

```
POST /api/v1/playground/variations
```

Generates semantically similar rephrasing of a query using an LLM, then predicts cache behavior for each variation. Variations are grouped by which cache entry they would share.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Original query (max 10,000 characters) |
| `model` | string | No | Model for variation generation |
| `threshold` | float (0-1) | No | Similarity threshold for grouping |

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/playground/variations" \
  -d '{
    "query": "What is machine learning?",
    "model": "gpt-4o",
    "threshold": 0.85
  }'
```

```json
{
  "originalQuery": "What is machine learning?",
  "variations": [
    {
      "query": "Can you explain machine learning?",
      "similarity": 0.94,
      "prediction": {
        "willHitCache": true,
        "tier": "L1",
        "confidence": 0.97
      }
    },
    {
      "query": "Define ML for me",
      "similarity": 0.82,
      "prediction": {
        "willHitCache": false,
        "tier": "MISS",
        "confidence": 0.88
      }
    }
  ],
  "cacheGroups": [
    {
      "representative": "What is machine learning?",
      "members": [
        "What is machine learning?",
        "Can you explain machine learning?"
      ],
      "similarity": 0.94
    }
  ],
  "processingTimeMs": 1250
}
```

This helps you understand which natural-language variations of a query will share a cache entry and which will miss.

## Request Coalescing

When multiple identical (or near-identical) requests arrive concurrently, WorldFlow AI can coalesce them into a single upstream LLM call. The first request ("original") is forwarded; subsequent requests ("piggybacked") wait for the original's response.

Response headers indicate coalescing status:
- `X-Coalesced: original` -- This request was the one forwarded to the LLM.
- `X-Coalesced: piggybacked` -- This request reused the original's response.

### Get Coalescer Statistics

```
GET /api/v1/coalescer/stats
```

Requires the `ViewMetrics` permission. Returns counters for total coalesced requests, pending groups, and hit rates.

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/coalescer/stats"
```

### Flush the Coalescer

```
POST /api/v1/coalescer/flush
```

Requires the `ManageConfig` permission. Clears all in-flight coalescing entries. Use this after deploying a configuration change that affects cache keys.

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/coalescer/flush"
```

## Savings Analytics

Track the cost impact of your cache configuration over time.

```
GET /api/v1/analytics/savings
```

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `granularity` | string | Time bucket: `hour`, `day`, `week`, `month`, `quarter`, or `year` (default `day`) |
| `startDate` | string (date) | Start of the range (ISO 8601) |
| `endDate` | string (date) | End of the range (ISO 8601) |
| `tenantId` | string | Scope to a specific tenant |
| `model` | string | Scope to a specific model |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/analytics/savings?granularity=day&startDate=2025-06-01&endDate=2025-06-15"
```

```json
{
  "data": [
    {
      "period": "2025-06-01T00:00:00Z",
      "totalRequests": 15000,
      "cacheHits": 10500,
      "cacheMisses": 4500,
      "hitRate": 0.70,
      "tokensSaved": 3200000,
      "estimatedSavings": 48.00,
      "actualCost": 20.50
    }
  ],
  "summary": {
    "totalRequests": 225000,
    "totalCacheHits": 157500,
    "overallHitRate": 0.70,
    "totalTokensSaved": 48000000,
    "totalEstimatedSavings": 720.00,
    "totalActualCost": 307.50
  },
  "metadata": {
    "granularity": "day",
    "executionTimeMs": 45
  }
}
```

## Request Logs

Browse and search individual request logs to debug cache behavior.

### List Logs

```
GET /api/v1/logs
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string (datetime) | Filter from this timestamp |
| `endDate` | string (datetime) | Filter until this timestamp |
| `status` | string | Filter by response status |
| `tier` | string | Filter by cache tier (`L1`, `L2`, `MISS`, `BYPASS`) |
| `model` | string | Filter by model |
| `search` | string | Free-text search in query content |
| `page` | integer | Page number |
| `pageSize` | integer | Items per page |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/logs?tier=MISS&model=gpt-4o&pageSize=5"
```

### Get Log Detail

```
GET /api/v1/logs/{id}
```

Returns the full request and response bodies, similarity scores, and timing breakdown.

### Find Similar Logs

```
GET /api/v1/logs/{id}/similar
```

Performs a vector similarity search to find other log entries whose queries are semantically close to the given entry.

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Maximum results (default 10) |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/logs/log-123.../similar?limit=5"
```

## Cache Invalidation Strategies

### TTL-Based Expiration

Set `l1TtlSecs` and `l2TtlSecs` in the threshold settings. Entries expire automatically after the configured duration. Shorter TTLs keep the cache fresh but reduce hit rates.

### Cache Bypass Header

Any request can bypass the cache entirely by including the `X-Synapse-Skip-Cache: true` header. This is useful for:
- Testing new model versions against live traffic.
- Forcing a fresh response for a specific query.
- Debugging unexpected cache behavior.

The bypassed response includes `source: "bypass"` in the `synapse_metadata` and an `X-Synapse-Cache-Status: BYPASS` response header.

### Tenant-Level Threshold Overrides

Use tenant overrides to effectively reduce caching for specific customers. Setting a tenant's `cacheHitThreshold` to `1.0` disables semantic matching for that tenant (only exact duplicates hit).

### Coalescer Flush

After a major configuration change (threshold adjustment, model swap, or guardrail update), flush the coalescer to ensure in-flight requests are not matched against stale groupings:

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/coalescer/flush"
```

### Tuning Workflow

1. **Baseline.** Record current hit rate and savings from `/api/v1/analytics/savings?granularity=day&period=7d`.
2. **Simulate.** Try a new threshold via `/api/v1/thresholds/simulate?cacheHitThreshold=0.80&period=week`.
3. **Playground.** Test representative queries with `/api/v1/playground/variations` to verify grouping behavior.
4. **Apply.** Update global settings or add a tenant override.
5. **Flush.** Clear the coalescer with `POST /api/v1/coalescer/flush`.
6. **Monitor.** Watch `/api/v1/analytics/savings` and `/api/v1/logs` for the next 24-48 hours. Roll back if precision drops below your quality bar.
