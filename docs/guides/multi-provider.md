---
title: Multi-Provider Setup
description: Configure WorldFlow AI to route queries across multiple LLM providers in six steps, from registering API keys to verifying cost savings in production.
sidebar_position: 3
---

# Multi-Provider Setup

This guide walks through configuring WorldFlow AI to route queries across multiple LLM providers. By the end you will have registered API keys, configured providers, defined models, set a routing strategy, tested with the simulate endpoint, and gone live.

## Prerequisites

- A running WorldFlow AI deployment (local or hosted)
- A valid JWT token with `ManageConfig` permission
- API keys for at least two LLM providers

## Step 1: Register Integrations

An integration stores API credentials for one provider account. The API key is encrypted at rest and never exposed in read responses.

```bash
# Register OpenAI
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI Production",
    "providerType": "OPEN_AI",
    "apiKey": "sk-proj-...",
    "baseUrl": "https://api.openai.com/v1",
    "isActive": true
  }'

# Register Anthropic
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anthropic Production",
    "providerType": "ANTHROPIC",
    "apiKey": "sk-ant-...",
    "baseUrl": "https://api.anthropic.com",
    "isActive": true
  }'

# Register Google (Gemini)
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google AI Production",
    "providerType": "GOOGLE",
    "apiKey": "AIza...",
    "isActive": true
  }'
```

### Verify an Integration

Confirm the API key works before proceeding:

```bash
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations/{id}/verify \
  -H "Authorization: Bearer $TOKEN"
```

A successful response confirms the key is valid and the provider is reachable.

## Step 2: Configure Providers

A provider links an integration to your workspace and adds operational configuration like budgets and rate limits.

```bash
# OpenAI provider
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/providers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI",
    "integrationId": "<openai-integration-id>",
    "providerType": "OPEN_AI",
    "isEnabled": true,
    "monthlyBudgetCents": 500000,
    "rateLimitRpm": 6000,
    "priority": 1
  }'

# Anthropic provider
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/providers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anthropic",
    "integrationId": "<anthropic-integration-id>",
    "providerType": "ANTHROPIC",
    "isEnabled": true,
    "monthlyBudgetCents": 300000,
    "rateLimitRpm": 4000,
    "priority": 2
  }'

# Google provider
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/providers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google AI",
    "integrationId": "<google-integration-id>",
    "providerType": "GOOGLE",
    "isEnabled": true,
    "monthlyBudgetCents": 200000,
    "rateLimitRpm": 10000,
    "priority": 3
  }'
```

### Provider Health Checks

Run a health check to verify the provider is operational:

```bash
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/providers/{id}/health-check \
  -H "Authorization: Bearer $TOKEN"
```

## Step 3: Define Models

Register the specific models you want available for routing. Each model is linked to a provider and includes pricing and capability metadata.

```bash
# GPT-4o-mini (economy)
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "gpt-4o-mini",
    "providerId": "<openai-provider-id>",
    "displayName": "GPT-4o Mini",
    "inputCostPer1kTokens": 0.00015,
    "outputCostPer1kTokens": 0.0006,
    "maxContextLength": 128000,
    "capabilities": ["chat", "json_mode", "tools"],
    "qualityScore": 0.70,
    "isActive": true
  }'

# GPT-4o (standard)
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "gpt-4o",
    "providerId": "<openai-provider-id>",
    "displayName": "GPT-4o",
    "inputCostPer1kTokens": 0.0025,
    "outputCostPer1kTokens": 0.01,
    "maxContextLength": 128000,
    "capabilities": ["chat", "json_mode", "tools", "vision"],
    "qualityScore": 0.90,
    "isActive": true
  }'

# Claude 3 Haiku (economy)
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "claude-3-haiku-20240307",
    "providerId": "<anthropic-provider-id>",
    "displayName": "Claude 3 Haiku",
    "inputCostPer1kTokens": 0.00025,
    "outputCostPer1kTokens": 0.00125,
    "maxContextLength": 200000,
    "capabilities": ["chat", "tools"],
    "qualityScore": 0.68,
    "isActive": true
  }'

# Gemini 1.5 Flash (economy)
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "gemini-1.5-flash",
    "providerId": "<google-provider-id>",
    "displayName": "Gemini 1.5 Flash",
    "inputCostPer1kTokens": 0.000075,
    "outputCostPer1kTokens": 0.0003,
    "maxContextLength": 1000000,
    "capabilities": ["chat", "vision"],
    "qualityScore": 0.65,
    "isActive": true
  }'
```

### Sync Models from Provider

Instead of manually defining models, you can sync available models from the provider's API:

```bash
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/models/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerType": "OPEN_AI"
  }'
```

## Step 4: Set Routing Strategy

Configure the routing strategy for your workspace:

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
        "routeTo": "gpt-4o",
        "priority": 2
      }
    ]
  }'
```

See the [Cost-Optimized Routing](./routing-optimizer.md) guide for details on strategies and rules.

## Step 5: Test with Simulate

Before going live, use the simulate endpoint to verify routing behavior without sending requests to providers:

```bash
# Simple query -- should route to economy model
curl -X POST https://api.worldflowai.com/api/v1/routing/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the capital of France?"}'

# Code query -- should route to premium model
curl -X POST https://api.worldflowai.com/api/v1/routing/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Write a function to sort an array in Rust"}'

# Test with strategy override
curl -X POST https://api.worldflowai.com/api/v1/routing/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Summarize this report", "strategy": "quality_first"}'
```

Verify the responses match your expectations:
- Simple queries go to economy models (gpt-4o-mini, gemini-1.5-flash, claude-3-haiku)
- Code queries route to higher-quality models (gpt-4o, claude-3.5-sonnet)
- Strategy overrides change the selection behavior

## Step 6: Go Live

Point your application at the WorldFlow AI proxy endpoint. WorldFlow AI is OpenAI-compatible, so most SDKs work with a `base_url` change:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.worldflowai.com/v1",
    api_key="your-worldflow-api-key",
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Hello, world!"}],
)

# Check cost headers
raw = response._response
print(f"Routed to: {raw.headers.get('x-worldflow-model')}")
print(f"Cost:      ${raw.headers.get('x-worldflow-cost')}")
```

## Verifying It Works

After going live, verify the setup:

1. **Check routing decisions** to see real routing in action:
   ```bash
   curl "https://api.worldflowai.com/api/v1/routing/decisions?limit=5" \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **Monitor savings** to see the cost impact:
   ```bash
   curl "https://api.worldflowai.com/api/v1/routing/analytics/savings?period=day" \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Check provider usage** to see traffic distribution:
   ```bash
   curl "https://api.worldflowai.com/api/v1/model-catalog/providers/{id}/usage" \
     -H "Authorization: Bearer $TOKEN"
   ```

## Disabling or Enabling Providers

Temporarily remove a provider from routing without deleting it:

```bash
# Disable (stops receiving traffic)
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/providers/{id}/disable \
  -H "Authorization: Bearer $TOKEN"

# Enable (resumes receiving traffic)
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/providers/{id}/enable \
  -H "Authorization: Bearer $TOKEN"
```

## Checklist

- [ ] At least two integrations registered and verified
- [ ] Providers created with budgets and rate limits
- [ ] Models defined with pricing and quality scores
- [ ] Routing strategy configured
- [ ] Simulate endpoint tested for key query patterns
- [ ] Application pointed at WorldFlow AI proxy
- [ ] Cost headers confirmed in responses
- [ ] Savings analytics accessible
