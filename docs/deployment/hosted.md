---
title: Hosted Pilot
description: Get started with a WorldFlow AI hosted pilot deployment, including architecture overview, supported models, monitoring, cache behavior, best practices, and resource limits.
sidebar_position: 1
---

# Hosted Pilot Guide

Welcome to WorldFlow AI! This guide will help you get started with your hosted pilot deployment on WorldFlow AI's managed infrastructure.

## Overview

Your WorldFlow AI pilot is a fully-managed semantic caching proxy that sits between your applications and LLM providers. It intelligently caches responses to similar queries, significantly reducing your LLM costs and latency.

```
Your App ──> WorldFlow AI Cache ──> LLM Provider
                  |
            Cache Hit? ──> Return instantly (no LLM call)
                  |
            Cache Miss? ──> Forward to LLM, cache, return
```

## What's Included

- **Dedicated WorldFlow AI instance** in isolated Kubernetes namespace
- **Shared GPU-accelerated embeddings** (TEI with BGE-m3) for fast semantic matching
- **Shared GPU-accelerated LLM inference** (vLLM) - no external API keys required
- **Grafana dashboard** for real-time monitoring
- **OpenAI-compatible API** - just change your `base_url`
- **20GB cache storage** for response data
- **Support for multiple LLM providers** (hosted vLLM, or bring your own OpenAI/Anthropic keys)

## Architecture

```
+-------------------------------------------------------------------------+
|                    WorldFlow AI Managed Infrastructure                    |
|                                                                          |
|  +--------------------------------------------------------------------+ |
|  |                     Your Pilot Namespace                           | |
|  |  +--------------+      +--------------+                           | |
|  |  |   Gateway    |----->|    Proxy     |                           | |
|  |  |  (API auth)  |      |  (caching)   |                           | |
|  |  +--------------+      +--------------+                           | |
|  +--------------------------------|------------------------------------+ |
|                                   |                                      |
|                                   v                                      |
|  +--------------------------------------------------------------------+ |
|  |                  Shared Infrastructure (synapse namespace)          | |
|  |  +----------+  +----------+  +----------+  +------------------+   | |
|  |  |  Redis   |  |  Milvus  |  |   TEI    |  |      vLLM        |  | |
|  |  |  (L1)    |  |  (L2)    |  | (BGE-m3) |  | (Qwen2.5-1.5B)  |  | |
|  |  |          |  |          |  |   GPU    |  |      GPU         |  | |
|  |  +----------+  +----------+  +----------+  +------------------+   | |
|  +--------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

## Getting Started

### 1. Your Endpoint

Your WorldFlow AI endpoint is:
```
https://pilot-{YOUR_PILOT_NAME}.synapse.worldflow.ai
```

### 2. API Key

You will receive an API key for authentication. Include it in the `Authorization` header:
```
Authorization: Bearer {YOUR_API_KEY}
```

### 3. Basic Usage

WorldFlow AI is compatible with the OpenAI API format. Simply change your `base_url`:

**Python (OpenAI SDK)**
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://pilot-{YOUR_PILOT_NAME}.synapse.worldflow.ai/v1",
    api_key="{YOUR_API_KEY}"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is the capital of France?"}]
)
```

**cURL**
```bash
curl -X POST https://pilot-{YOUR_PILOT_NAME}.synapse.worldflow.ai/v1/chat/completions \
  -H "Authorization: Bearer {YOUR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "What is the capital of France?"}]
  }'
```

## Supported Models

### OpenAI
- gpt-4o
- gpt-4o-mini
- gpt-4-turbo

### Anthropic
- claude-3-5-sonnet-20241022
- claude-3-opus-20240229

To use your own OpenAI or Anthropic keys, contact us to configure them.

## Monitoring

### Grafana Dashboard

Access your monitoring dashboard at:
```
https://pilot-{YOUR_PILOT_NAME}.synapse.worldflow.ai/grafana
```

Credentials will be provided separately.

### Key Metrics

- **Cache Hit Rate**: Percentage of requests served from cache
- **Latency (p50/p95/p99)**: Response time percentiles
- **Request Rate**: Queries per second
- **Cost Savings**: Estimated savings from cached responses

### API Endpoints

**Health Check**
```bash
curl https://pilot-{YOUR_PILOT_NAME}.synapse.worldflow.ai/health
```

**Statistics**
```bash
curl https://pilot-{YOUR_PILOT_NAME}.synapse.worldflow.ai/api/v1/stats \
  -H "Authorization: Bearer {YOUR_API_KEY}"
```

## Cache Behavior

### How Caching Works

1. **Query Analysis**: WorldFlow AI generates embeddings for each query
2. **Similarity Search**: Finds semantically similar cached queries
3. **Hit Decision**: Returns cached response if similarity >= 95%
4. **Cache Population**: On miss, forwards to LLM and caches response

### What Gets Cached

- Deterministic queries (temperature = 0 or low)
- Non-PII queries (personal information is not cached)
- Non-personalized queries (user-specific content bypasses cache)

### Cache Thresholds

| Threshold | Value | Description |
|-----------|-------|-------------|
| Exact Hit | >=95% | Full cached response returned |
| Partial Hit | >=85% | Cached response may be used with context |

## Best Practices

### Optimize for Cache Hits

1. **Normalize queries**: Consistent formatting improves hit rates
2. **Use low temperature**: Set `temperature: 0` for deterministic responses
3. **Batch similar queries**: Similar queries benefit from cache warming

### Response Headers

WorldFlow AI adds headers to indicate cache behavior:
- `X-Cache-Status: HIT` or `MISS`
- `X-Cache-Similarity: 0.97` (similarity score for hits)
- `X-Request-ID: abc123` (for debugging)

## Limits

| Resource | Limit |
|----------|-------|
| Rate Limit | 50 requests/second |
| Max Query Size | 32,000 characters |
| Max Response Size | 100,000 characters |
| Storage | 20GB |

## Support

If you have questions or issues:
- Email: support@worldflow.ai
- Slack: Contact your account manager for channel access

## Next Steps

1. **Test the endpoint** with sample queries
2. **Monitor the dashboard** to understand cache behavior
3. **Integrate into your application** by updating base_url
4. **Contact us** to discuss production migration
