---
title: "Quickstart"
description: "Make your first cached query and store your first memory milestone with WorldFlow AI in under 5 minutes."
sidebar_position: 2
---

# Quickstart

Make your first cached query and store your first memory milestone in under 5 minutes.

## Prerequisites

- An API key (contact us at [worldflowai.com](https://worldflowai.com)) **or** a local Docker setup
- `curl` installed
- An OpenAI or Anthropic API key (for the LLM proxy)

## Step 1: Get Your JWT Token

Exchange your API key for a JWT:

```bash
curl -s -X POST https://api.worldflowai.com/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}' | jq .
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "role": "admin"
}
```

Save the token:

```bash
export SYNAPSE_TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

:::tip Local development?
Skip this step. Use `./scripts/install-synapse.sh --local` to start a local WorldFlow AI instance with auto-generated tokens. See [Authentication](./authentication) for details.
:::

## Step 2: Make Your First Cached Query

Use the OpenAI-compatible proxy endpoint. Your existing OpenAI SDK code works unchanged --- just point it at WorldFlow AI:

```bash
curl -s -X POST https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $SYNAPSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "What is a semantic cache?"}
    ]
  }' | jq '.choices[0].message.content'
```

Check the `X-Cache-Status` header:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -D - https://api.worldflowai.com/v1/chat/completions \
  -H "Authorization: Bearer $SYNAPSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "What is a semantic cache?"}
    ]
  }' 2>&1 | grep -i x-cache
```

- First request: `X-Cache-Status: MISS` (forwarded to OpenAI).
- Second request: `X-Cache-Status: HIT` (served from cache in <50ms).

:::info
WorldFlow AI's semantic cache matches on meaning, not exact string equality. Rephrasing a question slightly will still produce a cache hit if the semantic similarity exceeds the threshold (default 0.85).
:::

## Step 3: Store Your First Memory Milestone

Create a project and store a milestone:

```bash
# Create a project
curl -s -X POST https://api.worldflowai.com/api/v1/memory/projects \
  -H "Authorization: Bearer $SYNAPSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-first-project",
    "name": "My First Project",
    "roadmap": "Learning WorldFlow AI memory API"
  }' | jq .
```

```bash
# Store a milestone
curl -s -X POST https://api.worldflowai.com/api/v1/memory/projects/my-first-project/store \
  -H "Authorization: Bearer $SYNAPSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "main",
    "branchPurpose": "Initial project setup",
    "cumulativeProgress": "Created project and stored first milestone",
    "thisContribution": "Completed WorldFlow AI quickstart tutorial",
    "agentId": "quickstart-demo",
    "agentType": "custom"
  }' | jq .
```

## Step 4: Recall Your Context

Retrieve your project's current state:

```bash
curl -s "https://api.worldflowai.com/api/v1/memory/projects/my-first-project/recall?view=branch&branch=main" \
  -H "Authorization: Bearer $SYNAPSE_TOKEN" | jq .
```

The response includes your project overview, active branches, and the milestone you just stored. Any agent starting a new session can call this endpoint to recover full project context.

## Step 5: Use with the OpenAI Python SDK

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.worldflowai.com/v1",
    api_key=SYNAPSE_TOKEN,  # Your JWT token
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is a semantic cache?"}],
)
print(response.choices[0].message.content)
```

The second time you (or anyone on your team) asks a semantically similar question, WorldFlow AI serves the cached response instantly.

## Next Steps

- [Authentication](./authentication) --- Token lifecycle, key rotation, multi-environment setup
- [Core Concepts](./concepts) --- How the semantic cache, three-tier architecture, and memory model work
- [Memory API Reference](./api-reference/memory-api) --- All 32 memory endpoints
- [Claude Code Integration](./guides/claude-code) --- Automatic memory for Claude Code sessions
- [Error Handling](./guides/error-handling) --- Retry strategies and error codes
