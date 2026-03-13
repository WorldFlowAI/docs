---
title: cURL Examples
description: Copy-paste cURL examples for every WorldFlow AI endpoint including authentication, projects, store, recall, log, branches, merge, roadmap, search, metrics, promote, contributors, external sources, intelligence, and proxy.
sidebar_position: 3
---

# cURL Examples

Copy-paste cURL examples for every WorldFlow AI endpoint. Set the `TOKEN` variable first:

```bash
export TOKEN="your-jwt-token-here"
export SYNAPSE_URL="https://api.worldflowai.com"
```

## Authentication

### Exchange API Key for JWT

```bash
curl -X POST $SYNAPSE_URL/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "sk-syn-abc123"}'
```

Save the token:

```bash
export TOKEN=$(curl -s -X POST $SYNAPSE_URL/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "sk-syn-abc123"}' | jq -r '.access_token')
```

## Projects

### Create Project

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-project",
    "name": "My Project",
    "roadmap": "Build an awesome product"
  }'
```

### List Projects

```bash
curl $SYNAPSE_URL/api/v1/memory/projects \
  -H "Authorization: Bearer $TOKEN"
```

### Get Project

```bash
curl $SYNAPSE_URL/api/v1/memory/projects/my-project \
  -H "Authorization: Bearer $TOKEN"
```

### Delete Project

```bash
curl -X DELETE $SYNAPSE_URL/api/v1/memory/projects/my-project \
  -H "Authorization: Bearer $TOKEN"
```

## Store (COMMIT)

### Store Milestone

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects/my-project/store \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "main",
    "branchPurpose": "Core feature implementation",
    "cumulativeProgress": "Set up project, added authentication",
    "thisContribution": "Implemented rate limiting",
    "agentId": "my-agent",
    "agentType": "custom"
  }'
```

## Recall (CONTEXT)

### Overview

```bash
curl "$SYNAPSE_URL/api/v1/memory/projects/my-project/recall" \
  -H "Authorization: Bearer $TOKEN"
```

### Branch View

```bash
curl "$SYNAPSE_URL/api/v1/memory/projects/my-project/recall?view=branch&branch=main&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

### Milestone View

```bash
curl "$SYNAPSE_URL/api/v1/memory/projects/my-project/recall?view=milestone&milestoneId=ms-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

### Log View

```bash
curl "$SYNAPSE_URL/api/v1/memory/projects/my-project/recall?view=log&branch=main&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

## Log (OTA)

### Append Log Entry

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects/my-project/log \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "main",
    "agentId": "my-agent",
    "phase": "observation",
    "content": "User requested adding rate limiting to the proxy endpoint"
  }'
```

## Branches

### Create Branch

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects/my-project/branches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "feature-auth",
    "parentBranch": "main",
    "purpose": "Implement JWT authentication",
    "agentId": "my-agent"
  }'
```

### List Branches

```bash
curl $SYNAPSE_URL/api/v1/memory/projects/my-project/branches \
  -H "Authorization: Bearer $TOKEN"
```

### Get Branch

```bash
curl $SYNAPSE_URL/api/v1/memory/projects/my-project/branches/feature-auth \
  -H "Authorization: Bearer $TOKEN"
```

### Abandon Branch

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects/my-project/branches/feature-auth/abandon \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Superseded by OAuth2 implementation"}'
```

## Merge

### Merge Branch

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects/my-project/merge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceBranch": "feature-auth",
    "targetBranch": "main",
    "mergeSummary": "Auth complete: JWT, login, password reset, RBAC",
    "agentId": "my-agent"
  }'
```

## Roadmap

### Update Roadmap

```bash
curl -X PUT $SYNAPSE_URL/api/v1/memory/projects/my-project/roadmap \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roadmap": "Phase 1: Cache (done)\nPhase 2: Memory (done)\nPhase 3: Intelligence (in progress)"}'
```

## Search

### Per-Project Search

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects/my-project/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication", "limit": 10}'
```

### Cross-Project Search

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "rate limiting",
    "limit": 20,
    "projectIds": ["my-project", "other-project"]
  }'
```

## Metrics

### Store Session Metrics

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects/my-project/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess-abc123",
    "agentId": "my-agent",
    "agentType": "custom",
    "milestonesRecalled": 5,
    "compactionCount": 2,
    "toolCallsTotal": 47,
    "sessionDurationSecs": 1800,
    "startedAt": "2026-02-10T14:00:00Z",
    "endedAt": "2026-02-10T14:30:00Z"
  }'
```

### Get Metrics Summary

```bash
curl $SYNAPSE_URL/api/v1/memory/projects/my-project/metrics/summary \
  -H "Authorization: Bearer $TOKEN"
```

## Promote

### Promote Cache Entry

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/projects/my-project/promote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cacheKey": "cache-key-xyz",
    "reuseScore": 0.92,
    "summary": "Frequently reused explanation of async/await",
    "l2Collection": "default"
  }'
```

## Contributors

### Upsert Contributor

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/contributors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contributorId": "alice",
    "displayName": "Alice Chen",
    "agentIds": ["claude-code-alice", "cursor-alice"],
    "role": "Senior Engineer"
  }'
```

### List Contributors

```bash
curl $SYNAPSE_URL/api/v1/memory/contributors \
  -H "Authorization: Bearer $TOKEN"
```

### Get Contributor

```bash
curl $SYNAPSE_URL/api/v1/memory/contributors/alice \
  -H "Authorization: Bearer $TOKEN"
```

### Delete Contributor

```bash
curl -X DELETE $SYNAPSE_URL/api/v1/memory/contributors/alice \
  -H "Authorization: Bearer $TOKEN"
```

### Contributor Activity

```bash
curl "$SYNAPSE_URL/api/v1/memory/contributors/alice/activity?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## External Sources

### Create Source

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/sources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "slack-eng",
    "projectId": "my-project",
    "sourceType": "slack",
    "config": {"channelId": "C0123456789"}
  }'
```

### List Sources

```bash
curl $SYNAPSE_URL/api/v1/memory/sources \
  -H "Authorization: Bearer $TOKEN"
```

### Update Source

```bash
curl -X PUT $SYNAPSE_URL/api/v1/memory/sources/slack-eng \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Delete Source

```bash
curl -X DELETE $SYNAPSE_URL/api/v1/memory/sources/slack-eng \
  -H "Authorization: Bearer $TOKEN"
```

### Trigger Sync

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/sources/slack-eng/sync \
  -H "Authorization: Bearer $TOKEN"
```

### Sync Status

```bash
curl $SYNAPSE_URL/api/v1/memory/sources/slack-eng/status \
  -H "Authorization: Bearer $TOKEN"
```

## Intelligence

### Query

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/intelligence/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What did the team work on this week?",
    "timeRange": "7d"
  }'
```

### Execute Action

```bash
curl -X POST $SYNAPSE_URL/api/v1/memory/intelligence/action \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_jira_ticket",
    "params": {
      "project": "SYN",
      "summary": "Follow up on auth implementation"
    }
  }'
```

## Proxy (OpenAI Compatible)

### Chat Completions

```bash
curl -X POST $SYNAPSE_URL/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "What is a REST API?"}]
  }'
```

### Chat Completions (Streaming)

```bash
curl -X POST $SYNAPSE_URL/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "What is a REST API?"}],
    "stream": true
  }'
```

### List Models

```bash
curl $SYNAPSE_URL/v1/models \
  -H "Authorization: Bearer $TOKEN"
```

## Proxy (Anthropic Compatible)

### Messages

```bash
curl -X POST $SYNAPSE_URL/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 200,
    "messages": [{"role": "user", "content": "What is a REST API?"}]
  }'
```

### Messages (Streaming)

```bash
curl -X POST $SYNAPSE_URL/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 200,
    "messages": [{"role": "user", "content": "What is a REST API?"}],
    "stream": true
  }'
```
