---
title: Python SDK
description: Use WorldFlow AI with the Python OpenAI SDK and requests library. Covers authentication, proxy usage, streaming, the Memory API, error handling, and a complete session hook.
sidebar_position: 1
---

# Python SDK Examples

WorldFlow AI works with existing Python SDKs. No WorldFlow AI-specific SDK is needed.

## Setup

```bash
pip install openai requests
```

## Authentication

```python
import requests

SYNAPSE_URL = "https://api.worldflowai.com"

def get_token(api_key: str) -> str:
    resp = requests.post(
        f"{SYNAPSE_URL}/api/v1/auth/token",
        json={"api_key": api_key},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]

TOKEN = get_token("sk-syn-abc123")
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}
```

## Proxy: OpenAI SDK

The OpenAI SDK works with WorldFlow AI by changing `base_url`:

```python
from openai import OpenAI

client = OpenAI(
    base_url=f"{SYNAPSE_URL}/v1",
    api_key=TOKEN,
)

# First call: cache MISS (forwarded to OpenAI)
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is a semantic cache?"}],
)
print(response.choices[0].message.content)

# Second call: cache HIT (served from WorldFlow AI in <50ms)
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What is a semantic cache?"}],
)
print(response.choices[0].message.content)
```

### Streaming

```python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain caching"}],
    stream=True,
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## Memory API

### Create a Project

```python
resp = requests.post(
    f"{SYNAPSE_URL}/api/v1/memory/projects",
    headers=HEADERS,
    json={
        "projectId": "my-project",
        "name": "My Project",
        "roadmap": "Build an awesome product",
    },
)
print(resp.json())
```

### Store a Milestone

```python
resp = requests.post(
    f"{SYNAPSE_URL}/api/v1/memory/projects/my-project/store",
    headers=HEADERS,
    json={
        "branchName": "main",
        "branchPurpose": "Core feature implementation",
        "cumulativeProgress": "Set up project structure, added auth",
        "thisContribution": "Implemented rate limiting middleware",
        "agentId": "python-agent-1",
        "agentType": "custom",
    },
)
print(resp.json())
```

### Recall Context

```python
resp = requests.get(
    f"{SYNAPSE_URL}/api/v1/memory/projects/my-project/recall",
    headers=HEADERS,
    params={"view": "branch", "branch": "main", "limit": 5},
)
context = resp.json()
print(f"Project: {context['project']['name']}")
for m in context.get("milestones", []):
    print(f"  [{m['sequenceNumber']}] {m['thisContribution']}")
```

### Search Across Projects

```python
resp = requests.post(
    f"{SYNAPSE_URL}/api/v1/memory/search",
    headers=HEADERS,
    json={"query": "authentication implementation", "limit": 10},
)
results = resp.json()
for m in results["milestones"]:
    print(f"  [{m['projectId']}] {m['thisContribution'][:80]}")
```

### Intelligence Query

```python
resp = requests.post(
    f"{SYNAPSE_URL}/api/v1/memory/intelligence/query",
    headers=HEADERS,
    json={
        "question": "What did the team work on this week?",
        "timeRange": "7d",
    },
)
answer = resp.json()
print(answer["answer"])
for source in answer["sources"]:
    print(f"  Source: {source['projectId']}/{source['branchName']} - {source['excerpt']}")
```

## Error Handling

```python
import time

def call_with_retry(method, url, max_retries=3, **kwargs):
    for attempt in range(max_retries + 1):
        resp = requests.request(method, url, **kwargs)

        if resp.status_code == 429:
            retry_after = resp.json().get("error", {}).get("retry_after_secs", 60)
            time.sleep(retry_after)
            continue

        if resp.status_code in (502, 503, 504) and attempt < max_retries:
            time.sleep(min(2 ** attempt, 30))
            continue

        resp.raise_for_status()
        return resp

    resp.raise_for_status()
    return resp
```

## Complete Session Hook

A minimal agent session hook in Python:

```python
import os
import requests
from datetime import datetime, timezone

SYNAPSE_URL = os.environ.get("SYNAPSE_GATEWAY_URL", "https://api.worldflowai.com")
TOKEN = os.environ["SYNAPSE_TOKEN"]
PROJECT_ID = os.environ["SYNAPSE_PROJECT_ID"]
BRANCH = os.environ.get("SYNAPSE_BRANCH", "main")
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def on_session_start() -> dict:
    """Recall context at the start of a session."""
    resp = requests.get(
        f"{SYNAPSE_URL}/api/v1/memory/projects/{PROJECT_ID}/recall",
        headers=HEADERS,
        params={"view": "branch", "branch": BRANCH, "limit": 10},
    )
    resp.raise_for_status()
    return resp.json()


def on_session_end(purpose: str, progress: str, contribution: str, agent_id: str) -> dict:
    """Store a milestone at the end of a session."""
    resp = requests.post(
        f"{SYNAPSE_URL}/api/v1/memory/projects/{PROJECT_ID}/store",
        headers=HEADERS,
        json={
            "branchName": BRANCH,
            "branchPurpose": purpose,
            "cumulativeProgress": progress,
            "thisContribution": contribution,
            "agentId": agent_id,
            "agentType": "custom",
        },
    )
    resp.raise_for_status()
    return resp.json()
```
