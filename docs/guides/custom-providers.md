---
title: "Custom Providers & Chains"
description: Register self-hosted or third-party OpenAI-compatible endpoints as custom providers in WorldFlow AI, and define multi-model chains for sequential model pipelines.
sidebar_position: 4
---

# Custom Providers & Chains

This guide covers registering self-hosted or third-party OpenAI-compatible endpoints as custom providers, and defining multi-model chains that execute sequential model calls through a single API request.

## Registering Custom Providers

Any endpoint that implements the OpenAI chat completions API can be registered as a WorldFlow AI provider. This includes:

- **vLLM** -- self-hosted open-source model inference
- **NVIDIA Triton** -- production inference server
- **TGI (Text Generation Inference)** -- HuggingFace inference server
- **Ollama** -- local model serving
- Any OpenAI-compatible proxy

### Step 1: Create a Custom Integration

Register the endpoint as an integration with provider type `CUSTOM`:

```bash
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Internal vLLM Cluster",
    "providerType": "CUSTOM",
    "apiKey": "internal-api-key",
    "baseUrl": "https://vllm.internal.example.com/v1",
    "isActive": true
  }'
```

:::tip
For endpoints that do not require authentication, provide a placeholder API key.
:::

### Step 2: Create the Provider

```bash
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/providers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "vLLM Internal",
    "integrationId": "<integration-id>",
    "providerType": "CUSTOM",
    "isEnabled": true,
    "priority": 1
  }'
```

### Step 3: Define Models

Register each model served by the endpoint:

```bash
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "llama-3.1-70b",
    "providerId": "<provider-id>",
    "displayName": "LLaMA 3.1 70B (Internal)",
    "inputCostPer1kTokens": 0.0,
    "outputCostPer1kTokens": 0.0,
    "maxContextLength": 131072,
    "capabilities": ["chat", "tools"],
    "qualityScore": 0.85,
    "isActive": true
  }'
```

:::info
For self-hosted models, set token costs to 0 (or your internal chargeback rate). The optimizer will strongly prefer these models when cost-optimized routing is active.
:::

### Step 4: Verify

```bash
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations/{id}/verify \
  -H "Authorization: Bearer $TOKEN"
```

### Dynamic Registration

All catalog operations take effect immediately. You do not need to restart WorldFlow AI. Register, update, or remove providers at any time through the API.

```bash
# Update the base URL of an existing integration (e.g., after a migration)
curl -X PUT https://api.worldflowai.com/api/v1/model-catalog/integrations/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://vllm-v2.internal.example.com/v1"
  }'
```

### Example: Registering a Triton Endpoint

```bash
# Integration
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Triton Vision Models",
    "providerType": "CUSTOM",
    "apiKey": "triton-internal",
    "baseUrl": "https://triton.internal.example.com/v2/models",
    "isActive": true
  }'

# Provider
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/providers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Triton Vision",
    "integrationId": "<triton-integration-id>",
    "providerType": "CUSTOM",
    "isEnabled": true,
    "priority": 1
  }'

# Model
curl -X POST https://api.worldflowai.com/api/v1/model-catalog/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "pixtral-12b",
    "providerId": "<triton-provider-id>",
    "displayName": "Pixtral 12B (Vision)",
    "inputCostPer1kTokens": 0.0,
    "outputCostPer1kTokens": 0.0,
    "maxContextLength": 32768,
    "capabilities": ["chat", "vision"],
    "qualityScore": 0.75,
    "isActive": true
  }'
```

## Multi-Model Chains

Chains let you define a sequence of model calls where each step's output feeds into the next. This is useful for pipelines like:

- Vision model to extract text from an image, then a language model to analyze it
- A fast model to draft, then a premium model to refine
- Classification, then specialized processing based on the class

### Defining a Chain

Register a chain as a model with a `chain:` prefix in the model ID. The chain definition is stored in the model's metadata.

Currently, chains are executed through the routing system using `fixed:chain:<chain_id>` routing. Define the chain steps in your application and route the initial request through WorldFlow AI.

### Chain-Aware Routing

Use the `X-WorldFlow-Routing` header with `fixed:chain:<chain_id>` to invoke a chain:

```bash
curl https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-WorldFlow-Routing: fixed:chain:vision-analysis" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Analyze this image"}]
  }'
```

When the router sees `chain:<id>`, it delegates to the chain execution engine, which runs each step sequentially and returns the final result.

### End-to-End Example: 3-Step Vision Pipeline

This example shows a pipeline that processes an image through three models:
1. **Vision model** (Pixtral 12B) -- extracts text and objects from the image
2. **Language model** (LLaMA 3.1 70B) -- analyzes and structures the extracted content
3. **Summarization model** (GPT-4o-mini) -- produces a concise summary

#### Register the Models

First, ensure all three models are registered in the catalog (see steps above for custom providers).

#### Execute the Pipeline

Using the OpenAI SDK with per-step routing:

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.worldflowai.com/v1",
    api_key="your-worldflow-api-key",
)

# Step 1: Vision extraction
vision_response = client.chat.completions.create(
    model="pixtral-12b",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract all text and describe objects in this image"},
                {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}},
            ],
        }
    ],
    extra_headers={"X-WorldFlow-Routing": "fixed:pixtral-12b"},
)
extracted = vision_response.choices[0].message.content

# Step 2: Analysis
analysis_response = client.chat.completions.create(
    model="llama-3.1-70b",
    messages=[
        {"role": "system", "content": "You are an expert analyst. Structure the following extracted content into categories."},
        {"role": "user", "content": extracted},
    ],
    extra_headers={"X-WorldFlow-Routing": "fixed:llama-3.1-70b"},
)
analysis = analysis_response.choices[0].message.content

# Step 3: Summarization
summary_response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "Produce a 2-sentence executive summary."},
        {"role": "user", "content": analysis},
    ],
    extra_headers={"X-WorldFlow-Routing": "fixed:gpt-4o-mini"},
)
summary = summary_response.choices[0].message.content

print(summary)
```

Each step is independently routed and individually cached by WorldFlow AI. If the same image is processed again, the vision extraction step may be served from cache.

#### Monitoring Chain Costs

Since each step is a separate request, cost headers are returned per-step. Aggregate costs using the analytics API:

```bash
curl "https://api.worldflowai.com/api/v1/routing/usage?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Mixing Custom and Cloud Providers

Custom providers participate in the same routing logic as cloud providers. The optimizer scores all enabled models equally. To control the mix:

- **Set quality scores accurately** -- self-hosted models with lower quality scores will only receive simple queries in `cost_optimized` mode
- **Use provider allowlists** -- restrict routing to specific providers for certain query types via routing rules
- **Set cost to zero** -- self-hosted models with zero cost dominate in cost-optimized routing
- **Pin critical queries** -- use `fixed:<model>` routing for queries that must go to a specific model
