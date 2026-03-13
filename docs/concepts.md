---
title: "Core Concepts"
description: "Understand the three-tier cache architecture, KV-cache inference acceleration, semantic cache, GCC memory model, and intelligence layer in WorldFlow AI."
sidebar_position: 4
---

# Core Concepts

## Three-Tier Cache Architecture

WorldFlow AI uses a three-tier cache hierarchy to serve queries at the lowest possible latency:

```
Query ──embed──> Vector ──search L0/L1/L2──> Match found? ──yes──> Return cached response
                                              ──no──> Forward to LLM, cache response
```

| Tier | Backend | Latency | Description |
|------|---------|---------|-------------|
| **L0 (GPU --- CAGRA)** | NVIDIA CAGRA on-device index | Sub-1ms | GPU-resident graph-based nearest neighbor search. Checked first for KV-cache acceleration workloads. |
| **L1 (Redis)** | In-memory HNSW index | Sub-5ms | CPU-side in-memory vector index. First tier checked for semantic cache lookups. |
| **L2 (Milvus)** | Persistent vector database | 10-50ms | Durable vector store. Checked on L1 miss. Handles cold-start and long-tail queries. |

:::info
L0 is used exclusively by the KV-cache inference acceleration path (SemBlend). The semantic response cache uses L1 and L2. All three tiers share the same embedding model for consistency.
:::

## KV-Cache Inference Acceleration (SemBlend)

SemBlend is WorldFlow AI's KV-cache reuse engine. When a new prompt is semantically similar to a previously processed prompt, SemBlend injects the donor's precomputed key-value cache into the GPU, skipping redundant prefill computation entirely.

```
New prompt ──embed──> L0 search ──donor found──> Inject KV cache + RoPE correction ──> Skip prefill
                                 ──no donor──> Normal prefill (cold path)
```

**Key properties:**

- **TTFT speedup**: Up to 12x at 32K tokens, 8x at 16K, 4x at 8K context length
- **Quality preservation**: Perplexity ratio within 1.0-1.07 of cold baseline across datasets
- **RoPE correction**: Positional encodings are corrected when donor and recipient token boundaries differ, ensuring mathematical equivalence
- **Transparent**: Works with any vLLM-served model. No model fine-tuning required.

:::tip
SemBlend is most effective for workloads with repeated long-context patterns: RAG pipelines, multi-turn conversations, document summarization, and customer support. For short prompts (<2K tokens), the semantic response cache (L1/L2) is more efficient.
:::

## Semantic Cache

WorldFlow AI embeds every LLM query into a vector and searches for semantically similar past queries. If a match exceeds the similarity threshold (default 0.85), the cached response is returned instantly instead of calling the LLM provider.

The proxy is a drop-in replacement for OpenAI and Anthropic APIs. Point your SDK at WorldFlow AI's base URL, and caching happens transparently.

## Memory Layer (GCC Model)

The memory system is based on the **GCC (Git-Context-Controller)** architecture. It uses git-like primitives to give agents persistent knowledge:

| GCC Operation | HTTP Endpoint | Analogy |
|--------------|---------------|---------|
| **COMMIT** (Store) | `POST /projects/{id}/store` | `git commit` --- save a milestone |
| **CONTEXT** (Recall) | `GET /projects/{id}/recall` | `git log` --- retrieve history |
| **BRANCH** | `POST /projects/{id}/branches` | `git branch` --- parallel workstreams |
| **MERGE** | `POST /projects/{id}/merge` | `git merge` --- combine branches |

### Projects

A project is the top-level container. It has a name, a living roadmap document, and contains branches with milestones.

```
Project
  ├── roadmap (living document)
  ├── main (default branch)
  │   ├── milestone-1
  │   ├── milestone-2
  │   └── milestone-3
  └── feature-x (parallel branch)
      ├── milestone-1
      └── milestone-2
```

### Milestones

A milestone is a snapshot of progress on a branch. Every milestone has three fields from the GCC paper:

| Field | Description | Example |
|-------|-------------|---------|
| `branchPurpose` | Why this branch exists | "Implement user authentication" |
| `cumulativeProgress` | What's been done so far | "Created login form, added JWT validation, wrote tests" |
| `thisContribution` | What this specific milestone adds | "Added password reset flow with email verification" |

Milestones are immutable and append-only. Each has a monotonic sequence number and a content hash for deduplication.

### Branches

Branches represent parallel workstreams within a project. They start as forks of a parent branch (usually `main`) and can be merged back or abandoned.

**Branch states:**
- `active` --- work in progress
- `merged` --- milestones synthesized into target branch
- `abandoned` --- dead end, preserved for history

### Recall Views

The recall endpoint supports five granularity levels:

| View | Returns | Use Case |
|------|---------|----------|
| `overview` | Project summary + branch list | Session start, agent orientation |
| `branch` | Milestones on a branch (paginated) | Deep dive into a workstream |
| `milestone` | Single milestone detail | Inspect a specific checkpoint |
| `log` | OTA reasoning trace entries | Debug agent behavior |
| `metadata` | Metadata segment | Custom metadata retrieval |

### OTA Log

The log endpoint captures continuous reasoning traces (Observe-Think-Act). Unlike milestones which are curated snapshots, log entries are high-frequency and capture the agent's real-time thought process.

**Log phases:**
- `observation` --- what the agent noticed
- `thought` --- reasoning about the observation
- `action` --- what the agent decided to do

## Contributors

Contributors map human identities to agent IDs. A single developer might use Claude Code, Cursor, and a custom agent --- the contributor model links all their agent IDs to one persona.

```
Contributor: "Alice"
  ├── agent_id: "claude-code-alice-macbook"
  ├── agent_id: "cursor-alice-work"
  └── agent_id: "custom-agent-alice"
```

This enables per-person activity views across all projects and agent types.

## External Sources

External sources ingest context from tools your team already uses:

| Source Type | What It Ingests |
|-------------|-----------------|
| `slack` | Channel messages, thread discussions |
| `jira` | Ticket descriptions, comments, status changes |
| `confluence` | Page content, updates |
| `github` | PR descriptions, review comments |

Ingested content becomes searchable alongside agent milestones, providing a unified view of project knowledge.

## Intelligence Layer

The intelligence layer sits on top of the memory graph. It answers natural language questions by searching across projects, milestones, contributors, and external sources.

```bash
POST /api/v1/memory/intelligence/query
{
  "question": "What did Alice work on last week?",
  "timeRange": "7d"
}
```

Response includes a synthesized answer with source citations pointing back to specific milestones.

The action endpoint can execute follow-up actions based on intelligence results (e.g., create a JIRA ticket, post to Slack).

## Promote (Cache to Memory)

When a cached LLM response proves valuable (high reuse score), it can be promoted from the ephemeral cache to long-term memory. This bridges the semantic cache and the memory layer.

```
Cache entry (high reuse) ──promote──> Long-term knowledge entry
```
