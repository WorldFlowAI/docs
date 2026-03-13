---
title: Google ADK Migration
description: Migrate from the Google Agent Development Kit (ADK) to WorldFlow AI for semantic caching, cost-optimized routing, and multi-provider resilience with a drop-in client replacement.
sidebar_position: 8
---

# Google ADK Migration

This guide covers migrating an application that uses the Google Agent Development Kit (ADK) to use WorldFlow AI as its LLM gateway. The migration is a drop-in replacement: swap the client configuration, and you immediately gain semantic caching, cost-optimized routing, and multi-provider support.

## Architecture Comparison

| Aspect | Google ADK | WorldFlow AI |
|--------|-----------|--------------|
| **Client SDK** | Google ADK client library | Any OpenAI-compatible SDK |
| **Provider access** | Google Gemini only | OpenAI, Anthropic, Google, Cohere, self-hosted (vLLM, Triton) |
| **Caching** | None (application-level) | Three-tier semantic cache (L0 GPU, L1 Redis, L2 Milvus) |
| **Cost optimization** | Manual model selection | Automatic query classification and cost-optimized routing |
| **Rate limiting** | Per-provider limits apply directly | WorldFlow AI manages rate limits across all providers |
| **Budget controls** | None | Per-tenant monthly/daily budgets with automatic enforcement |
| **Multi-model routing** | Manual orchestration | Automatic routing with per-request overrides |
| **Observability** | Application logging | Built-in cost headers, usage tracking, savings analytics |

## What You Get

By pointing your application at WorldFlow AI instead of Google's API directly:

1. **Semantic caching** -- Repeated and similar queries are served from cache in under 50ms. No code changes needed. Cache hit rates of 30-60% are common for customer support and FAQ workloads.

2. **Cost optimization** -- Simple queries (classification, extraction, FAQ) are routed to economy models ($0.15/M tokens) instead of premium models ($10/M tokens). Typical savings: 40-70%.

3. **Multi-provider resilience** -- If Google's API is degraded, WorldFlow AI automatically fails over to OpenAI or Anthropic. No downtime for your users.

4. **Budget guardrails** -- Set monthly spend limits per tenant. WorldFlow AI enforces them automatically, routing to cheaper models or blocking requests when budgets are exceeded.

## Step-by-Step Migration

### Step 1: Set Up Providers

Register Google (your current provider) and at least one alternative. See the [Multi-Provider Setup](./multi-provider.md) guide for detailed steps.

```bash
# Register your existing Google API key
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Google AI",
    "providerType": "GOOGLE",
    "apiKey": "AIza...",
    "isActive": true
  }'

# Register an alternative (OpenAI)
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI",
    "providerType": "OPEN_AI",
    "apiKey": "sk-proj-...",
    "baseUrl": "https://api.openai.com/v1",
    "isActive": true
  }'
```

### Step 2: Configure Routing

```bash
curl -X PUT https://api.worldflowai.com/api/v1/routing/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "cost_optimized",
    "rules": []
  }'
```

### Step 3: Replace the ADK Client

**Before (Google ADK):**

```python
from google.adk import Agent

agent = Agent(
    model="gemini-1.5-pro",
    api_key="AIza...",
)

response = agent.generate(
    prompt="Classify this support ticket: 'My order is late'",
)
print(response.text)
```

**After (OpenAI SDK pointing at WorldFlow AI):**

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.worldflowai.com/v1",
    api_key="your-worldflow-api-key",
)

response = client.chat.completions.create(
    model="auto",
    messages=[
        {"role": "user", "content": "Classify this support ticket: 'My order is late'"}
    ],
)
print(response.choices[0].message.content)
```

Key changes:
- Replace the ADK client with the OpenAI SDK
- Set `base_url` to your WorldFlow AI endpoint
- Use `model="auto"` to let the optimizer choose, or specify a model name
- Messages use the OpenAI chat format (`role` + `content`)

### Step 4: Migrate Message Formats

Google ADK uses a prompt-based API. WorldFlow AI uses the OpenAI chat completions format.

**System prompts:**

```python
# Before (ADK)
agent = Agent(
    model="gemini-1.5-pro",
    system_instruction="You are a customer support agent.",
)
response = agent.generate(prompt="Help me with my order")

# After (WorldFlow AI)
response = client.chat.completions.create(
    model="auto",
    messages=[
        {"role": "system", "content": "You are a customer support agent."},
        {"role": "user", "content": "Help me with my order"},
    ],
)
```

**Multi-turn conversations:**

```python
# Before (ADK)
chat = agent.start_chat()
response1 = chat.send_message("What's my order status?")
response2 = chat.send_message("Can you expedite it?")

# After (WorldFlow AI)
messages = [
    {"role": "system", "content": "You are a customer support agent."},
    {"role": "user", "content": "What's my order status?"},
]
response1 = client.chat.completions.create(model="auto", messages=messages)

messages.append({"role": "assistant", "content": response1.choices[0].message.content})
messages.append({"role": "user", "content": "Can you expedite it?"})
response2 = client.chat.completions.create(model="auto", messages=messages)
```

:::info
With WorldFlow AI, you manage the conversation history explicitly by appending messages to the list. This gives you full control over what context the model sees on each turn.
:::

### Step 5: Handle Tool Calls

If your ADK agent uses tools (function calling), the OpenAI format is compatible:

```python
response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Look up order #12345"}],
    tools=[
        {
            "type": "function",
            "function": {
                "name": "lookup_order",
                "description": "Look up an order by ID",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {"type": "string"}
                    },
                    "required": ["order_id"]
                }
            }
        }
    ],
)
```

:::tip
For heavy tool-use workloads, add the passthrough header to ensure full response fidelity:

```python
response = client.chat.completions.create(
    model="auto",
    messages=[...],
    tools=[...],
    extra_headers={"X-Synapse-Passthrough": "true"},
)
```
:::

### Step 6: Verify Caching

After migrating, confirm that caching is active:

```python
# Send the same query twice
for _ in range(2):
    response = client.chat.completions.create(
        model="auto",
        messages=[{"role": "user", "content": "What are your business hours?"}],
    )
    raw = response._response
    print(f"Cache: {raw.headers.get('x-synapse-cache-status')}")
    print(f"Tier:  {raw.headers.get('x-synapse-cache-tier')}")
```

The second request should show `x-synapse-cache-status: HIT`.

## Configuration Checklist

- [ ] Google API key registered as a WorldFlow AI integration
- [ ] At least one alternative provider registered (for failover and cost optimization)
- [ ] Providers created with budgets
- [ ] Models defined with accurate pricing and quality scores
- [ ] Routing strategy set to `cost_optimized`
- [ ] Application using OpenAI SDK with WorldFlow AI `base_url`
- [ ] Messages converted from ADK prompt format to OpenAI chat format
- [ ] Tool calls migrated to OpenAI function calling format
- [ ] Cache hits confirmed on repeated queries
- [ ] Cost headers visible in responses (`x-worldflow-cost`, `x-worldflow-cost-saved`)
- [ ] Savings analytics accessible via API

## Gradual Migration

If you prefer a phased rollout:

1. **Phase 1: Shadow mode** -- Send a percentage of traffic through WorldFlow AI alongside your existing ADK calls. Compare results.
2. **Phase 2: Read-only** -- Route all non-critical traffic (FAQ, classification) through WorldFlow AI. Keep critical flows on ADK.
3. **Phase 3: Full cutover** -- Route all traffic through WorldFlow AI. Keep the ADK integration as a fallback provider.

To pin specific queries to Google during the transition:

```python
# Force this request to use Gemini
response = client.chat.completions.create(
    model="gemini-1.5-pro",
    messages=[...],
    extra_headers={"X-WorldFlow-Routing": "fixed:gemini-1.5-pro"},
)
```

:::caution
During the transition period, monitor the `x-worldflow-routing-reason` header to confirm that pinned requests are being routed correctly and that non-pinned requests are being optimized as expected.
:::
