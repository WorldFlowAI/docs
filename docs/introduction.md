---
title: "Introduction"
description: "WorldFlow AI is an enterprise memory layer for LLM applications, providing semantic caching, contextual memory, and KV-cache inference acceleration."
sidebar_position: 1
---

# WorldFlow AI Developer Documentation

WorldFlow AI is an enterprise memory layer for LLM applications. It sits between your agents and LLM providers, delivering four capabilities: **semantic caching** that reduces costs and latency for repeated queries, a **contextual memory** system that gives agents persistent knowledge across sessions, an **intelligence layer** that turns accumulated project knowledge into queryable team context, and **KV-cache inference acceleration** that reuses GPU key-value caches across semantically similar prompts for dramatic prefill speedups.

## Why WorldFlow AI?

- **Cost reduction** --- Cache semantically similar queries and serve responses in under 50ms instead of calling the LLM provider. 40-70% reduction in inference costs through semantic caching.
- **Inference acceleration** --- KV-cache reuse (SemBlend) eliminates redundant GPU prefill computation for long-context prompts, delivering 2-12x TTFT speedup with near-lossless quality.
- **Context continuity** --- Agents lose context between sessions. WorldFlow AI's memory layer persists milestones, branches, and reasoning traces so every new session starts with full project awareness.
- **Team intelligence** --- Search across all projects, contributors, and external sources (Slack, JIRA, Confluence) with natural language queries.

## Get Started

### [Quickstart](./quickstart)

Make your first cached query and store your first memory milestone in under 5 minutes.

### [API Reference](./api-reference/overview)

Complete reference for all endpoints: authentication, memory, and OpenAI/Anthropic-compatible proxy.

### [Core Concepts](./concepts)

Understand the semantic cache, the three-tier cache architecture, the GCC memory model, branches, milestones, and the intelligence layer.

## API Surface

| Area | Endpoints | Description |
|------|-----------|-------------|
| [Authentication](./api-reference/authentication-api) | 1 | API key exchange for JWT |
| [Memory](./api-reference/memory-api) | 32 | Projects, milestones, branches, search, intelligence |
| [Proxy (OpenAI)](./api-reference/proxy-openai) | 2 | Drop-in `/v1/chat/completions` replacement |
| [Proxy (Anthropic)](./api-reference/proxy-anthropic) | 1 | Drop-in `/v1/messages` replacement |
| [Proxy (Gemini)](./api-reference/proxy-gemini) | 6 | Drop-in Gemini API replacement |
| [Proxy (Cohere)](./api-reference/proxy-cohere) | 3 | Drop-in Cohere API replacement |
| [MCP / Agentic](./api-reference/mcp-api) | 20+ | Model Context Protocol server management |

## SDK Examples

- [Python](./sdks/python) --- OpenAI SDK and `requests` examples
- [TypeScript](./sdks/typescript) --- Node.js with `openai` and `fetch`
- [cURL](./sdks/curl) --- Copy-paste examples for every endpoint
