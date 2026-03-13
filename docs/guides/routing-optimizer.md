---
title: Cost-Optimized Routing
description: Configure WorldFlow AI's cost optimizer to classify queries and route them to the cheapest LLM provider that meets your quality requirements, with strategies, rules, A/B testing, and budget-aware routing.
sidebar_position: 5
---

# Cost-Optimized Routing

WorldFlow AI's cost optimizer automatically classifies incoming queries and routes them to the cheapest LLM provider that meets your quality requirements. Simple queries go to economy models; complex queries go to premium models. You get lower costs without sacrificing quality where it matters.

## How It Works

Every request flows through a three-step pipeline:

1. **Classify** -- WorldFlow AI analyzes the query's task type (generation, classification, extraction, summarization, conversation, code generation) and complexity tier (simple, moderate, complex, frontier).
2. **Score** -- Each available provider is scored on five dimensions: cost, quality, latency, health, and cache affinity. The scoring weights depend on your routing strategy.
3. **Select** -- The highest-scoring provider handles the request.

:::info
The entire pipeline runs in-process with zero I/O. Classification uses keyword heuristics on the system prompt and last user message. No external calls, no added latency.
:::

## Routing Strategies

Configure your workspace's default strategy via the Routing API.

| Strategy | Cost Weight | Quality Weight | Best For |
|----------|------------|----------------|----------|
| `cost_optimized` | 0.50 | 0.20 | High-volume workloads where cost is the primary concern |
| `quality_first` | 0.10 | 0.50 | Customer-facing applications where quality is paramount |
| `balanced` | 0.30 | 0.30 | General-purpose workloads needing a mix of cost and quality |

### Setting Your Strategy

```bash
curl -X PUT https://api.worldflowai.com/api/v1/routing/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "cost_optimized",
    "rules": []
  }'
```

### Strategy Scoring Weights

Each strategy applies different weights to the composite scoring formula:

```
composite = w_cost * cost + w_quality * quality + w_latency * latency
          + w_health * health + w_cache * cache_affinity
```

| Strategy | Cost | Quality | Latency | Health | Cache Affinity |
|----------|------|---------|---------|--------|---------------|
| `cost_optimized` | 0.50 | 0.20 | 0.15 | 0.10 | 0.05 |
| `quality_first` | 0.10 | 0.50 | 0.15 | 0.15 | 0.10 |
| `balanced` | 0.30 | 0.30 | 0.20 | 0.10 | 0.10 |

You can also provide custom weights:

```bash
curl -X PUT https://api.worldflowai.com/api/v1/routing/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "balanced",
    "rules": [],
    "weights": {
      "cost": 0.40,
      "quality": 0.25,
      "latency": 0.20,
      "health": 0.10,
      "cacheAffinity": 0.05
    }
  }'
```

:::warning
Weights must sum to 1.0.
:::

## Per-Request Overrides

Override the workspace strategy on any individual request using the `X-WorldFlow-Routing` header.

| Header Value | Behavior |
|-------------|----------|
| `auto` | Use the workspace's configured strategy |
| `cheapest` | Pick the cheapest available model (quality threshold = 0) |
| `fastest` | Pick the lowest-latency model |
| `fixed:<model_id>` | Pin to a specific model, bypassing the optimizer |
| `fixed:chain:<chain_id>` | Execute a multi-model chain |

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.worldflowai.com/v1",
    api_key="your-worldflow-api-key",
)

# Let the optimizer choose the cheapest capable model
response = client.chat.completions.create(
    model="auto",  # model field is ignored when routing is active
    messages=[{"role": "user", "content": "What is 2+2?"}],
    extra_headers={"X-WorldFlow-Routing": "cheapest"},
)

# Pin to a specific model for this request
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a recursive Fibonacci in Rust"}],
    extra_headers={"X-WorldFlow-Routing": "fixed:gpt-4o"},
)
```

### TypeScript

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.worldflowai.com/v1",
  apiKey: "your-worldflow-api-key",
});

const response = await client.chat.completions.create(
  {
    model: "auto",
    messages: [{ role: "user", content: "Classify this email as spam or not" }],
  },
  {
    headers: { "X-WorldFlow-Routing": "auto" },
  }
);
```

### curl

```bash
curl https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-WorldFlow-Routing: cheapest" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Summarize this article"}]
  }'
```

## Reading Cost Headers

Every response includes cost optimizer headers so you can track exactly what happened:

| Header | Example Value | Description |
|--------|---------------|-------------|
| `x-worldflow-provider` | `openai` | Which provider handled the request |
| `x-worldflow-model` | `gpt-4o-mini` | Which model was used |
| `x-worldflow-cost` | `0.000450` | Actual cost in USD for this request |
| `x-worldflow-cost-saved` | `0.008550` | Savings vs. the most expensive alternative |
| `x-worldflow-routing-reason` | `auto_cost_optimized` | Why this model was selected |

### Reading Headers in Python

```python
response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Hello"}],
    extra_headers={"X-WorldFlow-Routing": "auto"},
)

# Access headers from the raw response
raw = response._response
print(f"Provider: {raw.headers.get('x-worldflow-provider')}")
print(f"Model:    {raw.headers.get('x-worldflow-model')}")
print(f"Cost:     ${raw.headers.get('x-worldflow-cost')}")
print(f"Saved:    ${raw.headers.get('x-worldflow-cost-saved')}")
print(f"Reason:   {raw.headers.get('x-worldflow-routing-reason')}")
```

### Routing Reasons

| Reason | Meaning |
|--------|---------|
| `auto_cost_optimized` | Optimizer selected cheapest model meeting quality threshold |
| `cheapest_available` | Cheapest mode selected the absolute cheapest model |
| `fastest_available` | Fastest mode selected the lowest-latency model |
| `fixed_model` | Request pinned to a specific model |
| `chain_routing` | Request delegated to a multi-model chain |
| `fallback` | No model met the quality threshold; fallback model used |
| `cheapest_capable` | Routing engine selected cheapest capable model |
| `quality_preferred` | Quality-first strategy preferred a higher-quality model |
| `budget_constrained` | Budget pressure forced a cheaper model |
| `cache_affinity` | A model with warm cache was preferred |
| `policy_override` | A static routing rule or force-provider hint matched |

## Monitoring Savings

The analytics API provides aggregate savings data broken down by time period, complexity tier, and provider.

### Get Savings Summary

```bash
# Monthly savings (default)
curl https://api.worldflowai.com/api/v1/routing/analytics/savings \
  -H "Authorization: Bearer $TOKEN"

# Weekly savings
curl "https://api.worldflowai.com/api/v1/routing/analytics/savings?period=week" \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "period": "month",
  "totalRequests": 45000,
  "totalActualCostCents": 12500,
  "totalCounterfactualCostCents": 34000,
  "totalSavingsCents": 21500,
  "savingsPercent": 63.2,
  "byComplexity": [
    {
      "complexity": "simple",
      "requestCount": 30000,
      "actualCostCents": 4500,
      "counterfactualCostCents": 22000,
      "savingsCents": 17500
    }
  ],
  "byProvider": [
    {
      "providerId": "...",
      "providerName": "openai",
      "requestCount": 25000,
      "actualCostCents": 7500
    }
  ]
}
```

### List Routing Decisions

Review individual routing decisions for debugging:

```bash
curl "https://api.worldflowai.com/api/v1/routing/decisions?limit=10&complexity=simple" \
  -H "Authorization: Bearer $TOKEN"
```

### Simulate a Routing Decision

Test how the optimizer would route a query without sending it to a provider:

```bash
curl -X POST https://api.worldflowai.com/api/v1/routing/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Extract all email addresses from this document",
    "strategy": "auto"
  }'
```

Response:

```json
{
  "modelId": "gemini-1.5-flash",
  "reason": "auto_cost_optimized",
  "estimatedCostCents": 0,
  "complexity": "extraction",
  "domain": "general",
  "alternatives": [
    { "modelId": "gpt-4o-mini", "score": 0.70 },
    { "modelId": "claude-3-haiku-20240307", "score": 0.68 }
  ]
}
```

## Quality Feedback Loop

The optimizer improves over time through quality feedback. You can submit feedback explicitly or let WorldFlow AI collect implicit signals from response metadata.

### Explicit Feedback

```bash
curl -X POST https://api.worldflowai.com/api/v1/routing/quality/feedback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "routingDecisionId": "550e8400-e29b-41d4-a716-446655440000",
    "score": 0.85,
    "confidence": 0.9,
    "source": "user"
  }'
```

### Implicit Signals

After receiving an LLM response, submit response metadata for automatic quality scoring:

```bash
curl -X POST https://api.worldflowai.com/api/v1/routing/quality/signals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "routingDecisionId": "550e8400-e29b-41d4-a716-446655440000",
    "latencyMs": 450,
    "inputTokens": 100,
    "outputTokens": 200,
    "completed": true,
    "truncated": false,
    "error": false
  }'
```

WorldFlow AI computes an implicit quality score from these signals:
- Completion: +0.4
- No error: +0.3
- Latency under 2s: +0.15
- Reasonable output length (10-2000 tokens): +0.15
- Truncation penalty: -0.2

### View Quality Profiles

Quality profiles track per-model, per-domain quality using Bayesian estimation:

```bash
curl "https://api.worldflowai.com/api/v1/routing/quality/profiles?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Deterministic Routing Rules

For predictable routing, define rules that override the optimizer for specific complexity/domain combinations:

```bash
curl -X PUT https://api.worldflowai.com/api/v1/routing/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "cost_optimized",
    "rules": [
      {
        "complexity": "simple",
        "routeTo": "gpt-4o-mini",
        "priority": 1
      },
      {
        "domain": "code_generation",
        "routeTo": "claude-3-5-sonnet-20241022",
        "priority": 2
      }
    ]
  }'
```

Rules are evaluated by priority (higher first). The first matching rule wins. If no rule matches, the optimizer's scoring pipeline runs.

## Extended Routing Rules

Beyond complexity and domain matching, rules support pluggable conditions for fine-grained control over routing decisions.

### Pluggable Conditions

Each rule can include one or more conditions:

| Condition | Type | Description |
|-----------|------|-------------|
| `headerMatch` | `object` | Match on HTTP request headers. Keys are header names (case-insensitive), values are exact matches. Example: `{"x-user-tier": "premium"}` |
| `modelPattern` | `string` | Glob pattern matched against the requested model name. Examples: `"gpt-4*"`, `"claude-*"`, `"gemini-1.5-*"` |
| `contentMatch` | `string[]` | Keywords searched in the query text (case-insensitive). If any keyword is found, the condition matches. Example: `["urgent", "critical"]` |
| `metadataMatch` | `object` | Match on tenant metadata supplied via the `X-Tenant-Metadata` header (JSON-encoded). Keys are metadata field names, values are exact matches. |
| `timeWindow` | `object` | Restrict the rule to specific times. Fields: `startHour` (0-23), `endHour` (0-23), `daysOfWeek` (array of `"mon"` through `"sun"`). |

### Condition Operators

When a rule has multiple conditions, the `conditionOperator` field controls how they combine:

| Operator | Behavior |
|----------|----------|
| `"and"` | All conditions must match (default) |
| `"or"` | Any single condition matching is sufficient |

## A/B Testing

Rules support weighted traffic splitting for A/B experiments. Add `weight`, `experimentId`, and `variant` fields to create experiment groups:

```bash
curl -X PUT https://api.worldflowai.com/api/v1/routing/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "balanced",
    "rules": [
      {
        "experimentId": "exp-2026-q1-model-eval",
        "variant": "control",
        "routeTo": "gpt-4o",
        "weight": 80,
        "priority": 10
      },
      {
        "experimentId": "exp-2026-q1-model-eval",
        "variant": "treatment",
        "routeTo": "claude-3-5-sonnet-20241022",
        "weight": 20,
        "priority": 10
      }
    ]
  }'
```

Requests are assigned to a variant using consistent hashing on the tenant ID and experiment ID, so a given tenant always sees the same variant. Weights are relative within the same `experimentId` and `priority` level.

### Comprehensive Example

This rule matches premium-tier users requesting a GPT-4 model with urgent content, routes them to `gpt-4o`, and enrolls them in an experiment with 80% weight:

```bash
curl -X PUT https://api.worldflowai.com/api/v1/routing/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "cost_optimized",
    "rules": [
      {
        "headerMatch": {"x-user-tier": "premium"},
        "modelPattern": "gpt-4*",
        "contentMatch": ["urgent", "critical"],
        "conditionOperator": "and",
        "routeTo": "gpt-4o",
        "experimentId": "exp-premium-routing",
        "variant": "fast-track",
        "weight": 80,
        "priority": 5
      },
      {
        "headerMatch": {"x-user-tier": "premium"},
        "modelPattern": "gpt-4*",
        "contentMatch": ["urgent", "critical"],
        "conditionOperator": "and",
        "routeTo": "gpt-4o-mini",
        "experimentId": "exp-premium-routing",
        "variant": "economy",
        "weight": 20,
        "priority": 5
      }
    ]
  }'
```

### Extended Routing Reasons

These routing reasons appear in the `x-worldflow-routing-reason` header when extended rules match:

| Reason | Meaning |
|--------|---------|
| `experiment_split` | A/B traffic split rule selected the variant |
| `header_match` | A header-matching rule determined the route |
| `content_match` | Content keyword matching determined the route |

## Budget-Aware Routing

When budget limits are configured, the optimizer automatically adjusts:

| Budget Zone | Remaining | Behavior |
|-------------|-----------|----------|
| Healthy | >50% | Route per strategy |
| Warning | 20-50% | Bias toward cheaper models (cost weight multiplier increases) |
| Critical | <20% | Force economy tier unless query is Frontier complexity |
| Exceeded | 0% | Block, warn, or auto-failover to cheapest (configurable) |

:::caution
When a provider's budget enters the **Critical** zone, only Frontier-complexity queries will be routed to premium models. All other traffic is forced to economy tier to preserve budget for high-priority requests.
:::
