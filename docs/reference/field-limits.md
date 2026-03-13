---
title: Field Limits
description: All field validation limits for WorldFlow AI API requests, organized by category including projects, milestones, branches, merge, log, search, promote, metrics, contributors, external sources, intelligence, and recall.
sidebar_position: 2
---

# Field Validation Limits

All string fields have maximum length limits. Requests that exceed these limits return `400 validation_error`.

## Project Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `projectId` | 1 | 128 chars | Unique within tenant |
| `name` | 1 | 256 chars | |
| `roadmap` | - | 10,000 chars | Can be empty on update |

## Milestone Fields (Store)

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `branchName` | - | 256 chars | Defaults to `"main"` |
| `branchPurpose` | - | 2,000 chars | |
| `cumulativeProgress` | - | 50,000 chars | |
| `thisContribution` | 1 | 10,000 chars | Required, cannot be empty |
| `agentId` | 1 | - | Required, cannot be empty |
| `agentType` | - | - | Defaults to `"custom"` |

## Branch Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `branchName` | 1 | 256 chars | Unique within project |
| `parentBranch` | - | - | Defaults to `"main"` |
| `purpose` | 1 | 2,000 chars | |
| `agentId` | 1 | - | Required |

## Merge Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `sourceBranch` | 1 | - | Must differ from target |
| `targetBranch` | - | - | Defaults to `"main"` |
| `mergeSummary` | 1 | 50,000 chars | |
| `agentId` | 1 | - | Required |

## Log Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `branchName` | - | - | Defaults to `"main"` |
| `agentId` | 1 | - | Required |
| `phase` | - | - | `"observation"`, `"thought"`, or `"action"` |
| `content` | 1 | 50,000 chars | |

## Search Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `query` | 1 | 500 chars | Cannot be whitespace-only |
| `limit` (per-project) | 1 | 100 | Defaults to 20 |
| `limit` (cross-project) | 1 | 200 | Defaults to 50 |

## Promote Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `cacheKey` | 1 | - | Required |
| `reuseScore` | 0.0 | 1.0 | Float range |
| `summary` | 1 | 10,000 chars | |
| `l2Collection` | 1 | - | Required |
| `summaryEmbedding` | - | - | Optional float array |
| `blobKey` | - | - | Optional |

## Metrics Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `sessionId` | 1 | 128 chars | |
| `agentId` | 1 | - | Required |

## Contributor Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `contributorId` | 1 | 128 chars | |
| `displayName` | 1 | 256 chars | |
| `agentIds` | - | - | String array |
| `role` | - | - | Optional |

## External Source Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `sourceId` | 1 | 128 chars | |
| `projectId` | 1 | - | Required |
| `sourceType` | - | - | `"slack"`, `"jira"`, `"confluence"`, `"github"` |
| `config` | - | - | JSON object |

## Intelligence Fields

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| `question` | 1 | 2,000 chars | Cannot be whitespace-only |
| `timeRange` | - | - | `"1d"`, `"7d"`, `"14d"`, `"30d"`, `"90d"`, `"all"` |
| `contextLimit` | 1 | 200 | Defaults to 50 |

## Recall Query Parameters

| Field | Values | Notes |
|-------|--------|-------|
| `view` | `overview`, `branch`, `milestone`, `log`, `metadata` | Defaults to `overview` |
| `branch` | any string | Defaults to `"main"` |
| `milestoneId` | string | Required for `milestone` view |
| `segment` | string | Required for `metadata` view |
| `limit` | integer | Branch: 10, Log: 20 |
| `offset` | integer | Defaults to 0 |
