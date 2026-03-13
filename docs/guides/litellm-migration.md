---
title: LiteLLM Migration
description: Step-by-step guide for migrating from LiteLLM to WorldFlow AI, covering the automated migration tool, manual configuration mapping, code changes, and rollback plan.
sidebar_position: 7
---

# LiteLLM Migration

A step-by-step guide for organizations migrating from LiteLLM to WorldFlow AI. Covers the automated migration tool, manual configuration mapping, and validation procedures.

## Why Migrate?

WorldFlow AI provides everything LiteLLM offers plus enterprise capabilities:

| Capability | LiteLLM | WorldFlow AI |
|-----------|---------|--------------|
| OpenAI-compatible proxy | Yes | Yes |
| Multi-provider routing | Basic (round-robin, cost) | Advanced (5-dimension scoring, rules, A/B testing) |
| Semantic caching | No | Yes (L1 Redis + L2 Milvus, <50ms cache hits) |
| Provider budget controls | Basic | Per-provider monthly budgets with enforcement zones |
| Rate limiting | Per-model RPM/TPM | Tiered rate limits with burst support |
| API key management | Virtual keys | Virtual keys + scoped key analytics + anomaly detection |
| User management | No | Full CRUD with SSO/SCIM integration |
| Team hierarchy | No | Teams with budget inheritance and key organization |
| Observability dashboard | Basic Prometheus | Full analytics: savings, routing decisions, model usage |
| Self-hosted deployment | Docker Compose | Helm chart for Kubernetes (VPC, air-gapped, edge, hybrid) |
| Context memory | No | Cross-session memory with project-based organization |

## Automated Migration

WorldFlow AI includes a migration tool that reads your LiteLLM YAML configuration and generates equivalent API calls.

### Prerequisites

```bash
pip install pyyaml
```

### Dry Run (Recommended First Step)

Generate the migration plan without applying changes:

```bash
python scripts/litellm_migrate.py \
  --input /path/to/litellm_config.yaml \
  --output ./migration-output/
```

This creates:
- `migration-output/payloads/` --- JSON payloads for each API call
- `migration-output/apply.sh` --- Shell script with curl commands
- `migration-output/report.md` --- Migration report with warnings and manual steps

### Review the Report

```bash
cat migration-output/report.md
```

The report highlights:
- **Mapped**: LiteLLM settings that map directly to WorldFlow AI
- **Manual**: Settings that need manual configuration (e.g., custom callbacks, guardrails)
- **Skipped**: LiteLLM-specific settings with no WorldFlow AI equivalent

### Apply Automatically

Once satisfied with the dry run, apply the migration directly:

```bash
python scripts/litellm_migrate.py \
  --input /path/to/litellm_config.yaml \
  --output ./migration-output/ \
  --apply \
  --gateway-url https://your-instance.example.com \
  --api-key sk-syn-xxx
```

### Validate

After applying, validate that all entities were created correctly:

```bash
python scripts/litellm_migrate.py \
  --input /path/to/litellm_config.yaml \
  --output ./migration-output/ \
  --validate \
  --gateway-url https://your-instance.example.com \
  --api-key sk-syn-xxx
```

## Manual Configuration Mapping

### Model List to Model Catalog

LiteLLM's `model_list` maps to WorldFlow AI's three-tier Model Catalog:

```yaml
# LiteLLM config.yaml
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: sk-proj-xxx
      rpm: 6000
      tpm: 80000
```

Equivalent WorldFlow AI setup:

```bash
# 1. Create integration (stores API key securely)
curl -X POST $GATEWAY/api/v1/model-catalog/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI Production",
    "providerType": "OPEN_AI",
    "apiKey": "sk-proj-xxx",
    "baseUrl": "https://api.openai.com/v1"
  }'

# 2. Create provider (operational config)
curl -X POST $GATEWAY/api/v1/model-catalog/providers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI",
    "integrationId": "<integration-id>",
    "rateLimitRpm": 6000,
    "monthlyBudgetCents": 500000
  }'

# 3. Create model (pricing and capabilities)
curl -X POST $GATEWAY/api/v1/model-catalog/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "gpt-4o",
    "providerId": "<provider-id>",
    "inputCostPer1kTokens": 0.0025,
    "outputCostPer1kTokens": 0.01,
    "contextLength": 128000,
    "qualityScore": 0.90
  }'
```

### Provider Type Mapping

| LiteLLM Prefix | WorldFlow AI Provider Type |
|----------------|---------------------------|
| `openai/` | `OPEN_AI` |
| `azure/` | `AZURE_OPEN_AI` |
| `anthropic/` | `ANTHROPIC` |
| `bedrock/` | `AWS_BEDROCK` |
| `vertex_ai/` | `VERTEX_AI` |
| `gemini/` | `GEMINI` |
| `cohere/` | `COHERE` |
| `groq/` | `GROQ` |
| `together_ai/` | `TOGETHER` |
| `mistral/` | `MISTRAL` |
| `fireworks_ai/` | `FIREWORKS` |
| `deepseek/`, `ollama/`, `vllm/` | `CUSTOM` (OpenAI-compatible) |

### Routing Strategy Mapping

| LiteLLM Strategy | WorldFlow AI Strategy |
|-----------------|----------------------|
| `simple-shuffle` | `cost_optimized` |
| `cost-based-routing` | `cost_optimized` |
| `latency-based-routing` | `balanced` (with latency weight increase) |
| `usage-based-routing` | `balanced` |
| `least-busy` | `balanced` (with latency weight increase) |

### API Key Migration

LiteLLM virtual keys map to WorldFlow AI API keys and virtual keys:

```bash
# Create an API key (workspace-level)
curl -X POST $GATEWAY/api/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production App Key",
    "expiresAt": "2027-01-01T00:00:00Z",
    "permissions": ["ReadLogs", "ProxyAccess"]
  }'

# Create a virtual key (scoped to specific models/budgets)
curl -X POST $GATEWAY/api/v1/api-keys/virtual \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Alpha Key",
    "monthlyBudgetCents": 100000,
    "allowedModels": ["gpt-4o-mini", "claude-3-haiku-20240307"],
    "rateLimitRpm": 1000
  }'
```

## Code Changes

### Python (OpenAI SDK)

The only change is the `base_url`:

```python
from openai import OpenAI

# Before (LiteLLM)
client = OpenAI(
    base_url="http://litellm-proxy:4000",
    api_key="sk-litellm-xxx",
)

# After (WorldFlow AI)
client = OpenAI(
    base_url="https://your-instance.example.com/v1",
    api_key="sk-syn-xxx",
)

# Everything else stays the same
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
```

### TypeScript (OpenAI SDK)

```typescript
import OpenAI from "openai";

// Before (LiteLLM)
const client = new OpenAI({
  baseURL: "http://litellm-proxy:4000",
  apiKey: "sk-litellm-xxx",
});

// After (WorldFlow AI)
const client = new OpenAI({
  baseURL: "https://your-instance.example.com/v1",
  apiKey: "sk-syn-xxx",
});
```

### Environment Variable Approach

For minimal code changes across many services:

```bash
# Before
export OPENAI_BASE_URL=http://litellm-proxy:4000
export OPENAI_API_KEY=sk-litellm-xxx

# After
export OPENAI_BASE_URL=https://your-instance.example.com/v1
export OPENAI_API_KEY=sk-syn-xxx
```

## WorldFlow AI-Specific Features

After migration, take advantage of capabilities LiteLLM does not offer.

### Semantic Caching

WorldFlow AI automatically caches responses for semantically similar queries. No code changes required. Check the `x-synapse-cache-status` header:

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What are the benefits of cloud computing?"}],
)

raw = response._response
print(f"Cache: {raw.headers.get('x-synapse-cache-status')}")  # HIT or MISS
```

To bypass the cache for a specific request:

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What are the benefits of cloud computing?"}],
    extra_headers={"X-Synapse-Skip-Cache": "true"},
)
```

### Cost-Optimized Routing

Override routing per-request using the `X-WorldFlow-Routing` header:

```python
# Route to the cheapest capable model
response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "What is 2+2?"}],
    extra_headers={"X-WorldFlow-Routing": "cheapest"},
)

# Pin to a specific model
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Complex analysis..."}],
    extra_headers={"X-WorldFlow-Routing": "fixed:gpt-4o"},
)
```

### Response Headers

Every response includes cost and routing metadata:

| Header | Description |
|--------|-------------|
| `x-synapse-cache-status` | `HIT` or `MISS` |
| `x-worldflow-model` | Which model handled the request |
| `x-worldflow-cost` | Cost in USD |
| `x-worldflow-cost-saved` | Savings vs. most expensive alternative |
| `x-worldflow-routing-reason` | Why this model was selected |

### User Management

WorldFlow AI provides full user lifecycle management with SSO support:

```bash
# Create a user
curl -X POST $GATEWAY/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "analyst@company.com",
    "name": "Jane Doe",
    "external_id": "okta-12345",
    "identity_provider": "okta"
  }'

# List users with search
curl "$GATEWAY/api/v1/users?search=analyst&status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"

# Assign a role
curl -X POST $GATEWAY/api/v1/users/{user-id}/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "operator"}'
```

## Migration Checklist

- [ ] Run `litellm_migrate.py` in dry-run mode and review the report
- [ ] Create integrations for each LLM provider
- [ ] Create providers with budget and rate limit configuration
- [ ] Register models with pricing metadata
- [ ] Configure routing strategy and rules
- [ ] Create API keys for each team/service
- [ ] Update `base_url` in application code or environment variables
- [ ] Verify cache headers appear in responses
- [ ] Confirm routing decisions via `/api/v1/routing/simulate`
- [ ] Set up users and role assignments (if using SSO)
- [ ] Review savings analytics after 24 hours of traffic

## Rollback Plan

If issues arise during migration, rollback is straightforward:

1. Revert `base_url` to LiteLLM endpoint
2. Both systems can run in parallel during the transition
3. WorldFlow AI does not modify LiteLLM's configuration

:::tip
Run both LiteLLM and WorldFlow AI in parallel during the transition period. You can gradually shift traffic by updating `base_url` service by service rather than all at once.
:::

## Next Steps

- [Multi-Provider Setup](./multi-provider.md) --- Detailed provider configuration
- [Cost-Optimized Routing](./routing-optimizer.md) --- Advanced routing rules and A/B testing
- [Authentication](/docs/authentication) --- Token lifecycle and key management
