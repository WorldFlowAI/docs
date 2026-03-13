---
title: Memory for Agents
description: Integrate WorldFlow AI's persistent memory layer with any agent framework using git-like primitives for Store, Recall, Branch, and Merge operations.
sidebar_position: 2
---

# Memory for Agents

This guide shows how to integrate WorldFlow AI's memory layer with any agent framework --- not just Claude Code. The memory API provides persistent project knowledge using git-like primitives: Store (commit), Recall (log), Branch, and Merge.

## Session Lifecycle

Every agent session follows the same pattern:

```
1. Session Start  ──> Recall context from memory
2. Agent Work     ──> (read files, edit code, run tests)
3. Session End    ──> Store milestone summarizing progress
```

### 1. Recall Context (Session Start)

At the beginning of each session, retrieve the project's current state:

```bash
curl "https://api.worldflowai.com/api/v1/memory/projects/my-project/recall?view=branch&branch=main&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

Inject the response into your agent's system prompt or context window. This gives the agent awareness of:
- The project roadmap
- Recent milestones (what has been done)
- Active branches (parallel workstreams)

### 2. Store Milestone (Session End)

When the session ends, store a milestone summarizing what was accomplished:

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/my-project/store \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "main",
    "branchPurpose": "Build user authentication system",
    "cumulativeProgress": "Login form, JWT validation, password reset implemented",
    "thisContribution": "Added email verification step to password reset flow",
    "agentId": "my-agent-instance-id",
    "agentType": "langchain"
  }'
```

### 3. Handle Context Compaction

If your agent truncates its context window mid-session, store a checkpoint first:

```bash
# Before compaction
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/my-project/store \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "main",
    "branchPurpose": "...",
    "cumulativeProgress": "...",
    "thisContribution": "Checkpoint before context compaction",
    "agentId": "my-agent-instance-id"
  }'
```

:::tip
Storing a checkpoint before compaction ensures no progress is lost when the context window is truncated. The next Recall will return the checkpoint along with all prior milestones.
:::

## Building a Session Hook (Python)

Here is a minimal Python session hook:

```python
import os
import requests

SYNAPSE_URL = os.environ.get("SYNAPSE_GATEWAY_URL", "https://api.worldflowai.com")
TOKEN = os.environ["SYNAPSE_TOKEN"]
PROJECT_ID = os.environ["SYNAPSE_PROJECT_ID"]
BRANCH = os.environ.get("SYNAPSE_BRANCH", "main")
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def recall_context() -> dict:
    """Call at session start to retrieve project context."""
    resp = requests.get(
        f"{SYNAPSE_URL}/api/v1/memory/projects/{PROJECT_ID}/recall",
        params={"view": "branch", "branch": BRANCH, "limit": 10},
        headers=HEADERS,
    )
    resp.raise_for_status()
    return resp.json()


def store_milestone(
    branch_purpose: str,
    cumulative_progress: str,
    this_contribution: str,
    agent_id: str,
) -> dict:
    """Call at session end to persist progress."""
    resp = requests.post(
        f"{SYNAPSE_URL}/api/v1/memory/projects/{PROJECT_ID}/store",
        headers=HEADERS,
        json={
            "branchName": BRANCH,
            "branchPurpose": branch_purpose,
            "cumulativeProgress": cumulative_progress,
            "thisContribution": this_contribution,
            "agentId": agent_id,
            "agentType": "custom",
        },
    )
    resp.raise_for_status()
    return resp.json()
```

## Branching for Parallel Work

When your agent starts a new workstream, create a memory branch:

```python
def create_branch(branch_name: str, purpose: str, agent_id: str) -> dict:
    resp = requests.post(
        f"{SYNAPSE_URL}/api/v1/memory/projects/{PROJECT_ID}/branches",
        headers=HEADERS,
        json={
            "branchName": branch_name,
            "parentBranch": "main",
            "purpose": purpose,
            "agentId": agent_id,
        },
    )
    resp.raise_for_status()
    return resp.json()
```

Merge when done:

```python
def merge_branch(source_branch: str, summary: str, agent_id: str) -> dict:
    resp = requests.post(
        f"{SYNAPSE_URL}/api/v1/memory/projects/{PROJECT_ID}/merge",
        headers=HEADERS,
        json={
            "sourceBranch": source_branch,
            "targetBranch": "main",
            "mergeSummary": summary,
            "agentId": agent_id,
        },
    )
    resp.raise_for_status()
    return resp.json()
```

## Cross-Project Search

Search for knowledge across all your projects:

```python
def search_all_projects(query: str, limit: int = 20) -> dict:
    resp = requests.post(
        f"{SYNAPSE_URL}/api/v1/memory/search",
        headers=HEADERS,
        json={"query": query, "limit": limit},
    )
    resp.raise_for_status()
    return resp.json()
```

:::info
This is useful for agents that need context from other projects (e.g., "how did we implement auth in the other service?").
:::

## Contributor Tracking

Register your agent's identity so activity can be tracked per person:

```python
def register_contributor(
    contributor_id: str, display_name: str, agent_ids: list[str]
) -> dict:
    resp = requests.post(
        f"{SYNAPSE_URL}/api/v1/memory/contributors",
        headers=HEADERS,
        json={
            "contributorId": contributor_id,
            "displayName": display_name,
            "agentIds": agent_ids,
            "role": "Developer",
        },
    )
    resp.raise_for_status()
    return resp.json()
```

Then view a contributor's activity across all projects:

```bash
curl "https://api.worldflowai.com/api/v1/memory/contributors/alice/activity?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Session Metrics

Track agent effectiveness to measure memory's value:

```python
def store_session_metrics(
    session_id: str, agent_id: str, metrics: dict
) -> None:
    resp = requests.post(
        f"{SYNAPSE_URL}/api/v1/memory/projects/{PROJECT_ID}/metrics",
        headers=HEADERS,
        json={
            "sessionId": session_id,
            "agentId": agent_id,
            "agentType": "custom",
            "milestonesRecalled": metrics.get("milestones_recalled", 0),
            "compactionCount": metrics.get("compaction_count", 0),
            "toolCallsTotal": metrics.get("tool_calls_total", 0),
            "sessionDurationSecs": metrics.get("duration_secs", 0),
            "startedAt": metrics["started_at"],
            "endedAt": metrics["ended_at"],
        },
    )
    resp.raise_for_status()
```

Then view the summary to see whether memory reduces context window compactions:

```bash
curl https://api.worldflowai.com/api/v1/memory/projects/my-project/metrics/summary \
  -H "Authorization: Bearer $TOKEN"
```

## Framework Integration Examples

### LangChain

```python
from langchain.callbacks import BaseCallbackHandler


class WorldFlowMemoryCallback(BaseCallbackHandler):
    def on_chain_start(self, serialized, inputs, **kwargs):
        context = recall_context()
        # Inject context into the chain's system message

    def on_chain_end(self, outputs, **kwargs):
        store_milestone(
            branch_purpose="...",
            cumulative_progress="...",
            this_contribution=outputs.get("output", ""),
            agent_id="langchain-agent",
        )
```

### AutoGen

```python
# In your AutoGen agent setup
context = recall_context()
system_message = f"""You are working on a project. Here is the current context:
{context['project']['roadmap']}

Recent milestones:
{[m['thisContribution'] for m in context.get('milestones', [])]}
"""
```
