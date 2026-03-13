---
title: TypeScript SDK
description: Use WorldFlow AI with the TypeScript OpenAI SDK. Covers authentication, proxy usage, streaming, the Memory API, error handling, and a complete session hook.
sidebar_position: 2
---

# TypeScript / Node.js SDK Examples

WorldFlow AI works with existing Node.js SDKs. No WorldFlow AI-specific SDK is needed.

## Setup

```bash
npm install openai
```

## Authentication

```typescript
const SYNAPSE_URL = "https://api.worldflowai.com";

async function getToken(apiKey: string): Promise<string> {
  const resp = await fetch(`${SYNAPSE_URL}/api/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!resp.ok) throw new Error(`Auth failed: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

const TOKEN = await getToken("sk-syn-abc123");
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};
```

## Proxy: OpenAI SDK

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: `${SYNAPSE_URL}/v1`,
  apiKey: TOKEN,
});

// First call: cache MISS
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What is a semantic cache?" }],
});
console.log(response.choices[0].message.content);

// Second call: cache HIT (<50ms)
const cached = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What is a semantic cache?" }],
});
console.log(cached.choices[0].message.content);
```

### Streaming

```typescript
const stream = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Explain caching" }],
  stream: true,
});
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) process.stdout.write(content);
}
```

## Memory API

### Create a Project

```typescript
const resp = await fetch(`${SYNAPSE_URL}/api/v1/memory/projects`, {
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify({
    projectId: "my-project",
    name: "My Project",
    roadmap: "Build an awesome product",
  }),
});
console.log(await resp.json());
```

### Store a Milestone

```typescript
const resp = await fetch(
  `${SYNAPSE_URL}/api/v1/memory/projects/my-project/store`,
  {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      branchName: "main",
      branchPurpose: "Core feature implementation",
      cumulativeProgress: "Set up project structure, added auth",
      thisContribution: "Implemented rate limiting middleware",
      agentId: "node-agent-1",
      agentType: "custom",
    }),
  }
);
console.log(await resp.json());
```

### Recall Context

```typescript
const params = new URLSearchParams({
  view: "branch",
  branch: "main",
  limit: "5",
});
const resp = await fetch(
  `${SYNAPSE_URL}/api/v1/memory/projects/my-project/recall?${params}`,
  { headers: HEADERS }
);
const context = await resp.json();
console.log(`Project: ${context.project.name}`);
for (const m of context.milestones ?? []) {
  console.log(`  [${m.sequenceNumber}] ${m.thisContribution}`);
}
```

### Search Across Projects

```typescript
const resp = await fetch(`${SYNAPSE_URL}/api/v1/memory/search`, {
  method: "POST",
  headers: HEADERS,
  body: JSON.stringify({
    query: "authentication implementation",
    limit: 10,
  }),
});
const results = await resp.json();
for (const m of results.milestones) {
  console.log(`  [${m.projectId}] ${m.thisContribution.slice(0, 80)}`);
}
```

### Intelligence Query

```typescript
const resp = await fetch(
  `${SYNAPSE_URL}/api/v1/memory/intelligence/query`,
  {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      question: "What did the team work on this week?",
      timeRange: "7d",
    }),
  }
);
const answer = await resp.json();
console.log(answer.answer);
for (const source of answer.sources) {
  console.log(`  Source: ${source.projectId} - ${source.excerpt}`);
}
```

## Error Handling

```typescript
async function callWithRetry(
  fn: () => Promise<Response>,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fn();

    if (resp.status === 429) {
      const body = await resp.json();
      const retryAfter = body.error?.retry_after_secs ?? 60;
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if ([502, 503, 504].includes(resp.status) && attempt < maxRetries) {
      const wait = Math.min(2 ** attempt * 1000, 30000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    return resp;
  }
  throw new Error("Max retries exceeded");
}
```

## Complete Session Hook

```typescript
const SYNAPSE_URL = process.env.SYNAPSE_GATEWAY_URL ?? "https://api.worldflowai.com";
const TOKEN = process.env.SYNAPSE_TOKEN!;
const PROJECT_ID = process.env.SYNAPSE_PROJECT_ID!;
const BRANCH = process.env.SYNAPSE_BRANCH ?? "main";
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function onSessionStart(): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({
    view: "branch",
    branch: BRANCH,
    limit: "10",
  });
  const resp = await fetch(
    `${SYNAPSE_URL}/api/v1/memory/projects/${PROJECT_ID}/recall?${params}`,
    { headers: HEADERS }
  );
  if (!resp.ok) throw new Error(`Recall failed: ${resp.status}`);
  return resp.json();
}

async function onSessionEnd(
  purpose: string,
  progress: string,
  contribution: string,
  agentId: string
): Promise<Record<string, unknown>> {
  const resp = await fetch(
    `${SYNAPSE_URL}/api/v1/memory/projects/${PROJECT_ID}/store`,
    {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        branchName: BRANCH,
        branchPurpose: purpose,
        cumulativeProgress: progress,
        thisContribution: contribution,
        agentId,
        agentType: "custom",
      }),
    }
  );
  if (!resp.ok) throw new Error(`Store failed: ${resp.status}`);
  return resp.json();
}
```
