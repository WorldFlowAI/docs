---
title: Claude Code Integration
description: Set up WorldFlow AI proxy caching and contextual memory hooks for Claude Code, with session lifecycle events, configuration, branching, and troubleshooting.
sidebar_position: 1
---

# Claude Code Integration

WorldFlow AI integrates with Claude Code to provide two capabilities: **semantic caching** (reduce costs and latency for repeated queries) and **contextual memory** (persistent project knowledge across sessions).

## Installation

The install script configures both proxy caching and memory hooks:

```bash
# External developers (API key, no AWS access needed)
./scripts/install-synapse.sh --api-key sk-syn-abc123

# Internal teams (AWS Secrets Manager auto-detected)
./scripts/install-synapse.sh

# Local development (Docker-based)
./scripts/install-synapse.sh --local

# Proxy caching only (no memory hooks)
./scripts/install-synapse.sh --proxy
```

### What the Install Script Does

1. **Validates connectivity** to the WorldFlow AI gateway
2. **Obtains a JWT token** (via API key exchange, AWS Secrets Manager, or local secret)
3. **Installs memory hooks** in `~/.claude/hooks/` for session lifecycle events
4. **Configures environment** with `SYNAPSE_PROJECT_ID` and `SYNAPSE_BRANCH`
5. **Optionally sets** `ANTHROPIC_BASE_URL` for proxy caching

### Check Status

```bash
./scripts/install-synapse.sh --status
```

Shows: hook installation status, JWT validity, gateway connectivity, and current project configuration.

## How Proxy Caching Works

When `ANTHROPIC_BASE_URL` points to WorldFlow AI, all Claude Code queries route through the semantic cache:

```
Claude Code ──> WorldFlow AI Gateway ──> Cache check ──> HIT: instant response
                                                     ──> MISS: forward to Anthropic, cache response
```

The proxy is fully transparent. Claude Code sees standard Anthropic API responses. The only visible difference is the `X-Cache-Status` response header.

## How Memory Hooks Work

WorldFlow AI installs four Claude Code hooks that fire at session lifecycle and git events:

### session-start

Fires when a new Claude Code session begins. The hook calls the Recall API and injects project context into the session:

```
Session starts ──> GET /api/v1/memory/projects/{id}/recall?view=branch
                ──> Project roadmap, recent milestones, active branches
                ──> Injected as system context
```

### session-end

Fires when a Claude Code session ends. The hook stores a milestone summarizing what was accomplished:

```
Session ends ──> POST /api/v1/memory/projects/{id}/store
              ──> branchPurpose, cumulativeProgress, thisContribution
              ──> Persisted as a new milestone on the current branch
```

### pre-compact

Fires before Claude Code compacts its context window. The hook stores a checkpoint so context is not lost:

```
Context compaction ──> POST /api/v1/memory/projects/{id}/store
                    ──> Saves current state before context is truncated
```

### post-commit (automatic)

Fires after every git commit made through Claude Code. The hook automatically captures each commit as a milestone --- no manual action required:

```
Git commit ──> POST /api/v1/memory/projects/{id}/store
            ──> Commit hash, message, changed files
            ──> Persisted as a milestone on the current branch
```

This means progress is captured continuously during long sessions, not just at session boundaries. Even if a session stays open for hours, every commit creates a checkpoint that future sessions can recall.

:::info
Zero configuration required: the branch is auto-detected from git, the project is auto-detected from `.synapse-project` or the git remote, and merge commits are skipped automatically.
:::

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SYNAPSE_PROJECT_ID` | Project ID for memory operations | auto-detected from git |
| `SYNAPSE_BRANCH` | Branch name for milestones | `"main"` |
| `SYNAPSE_GATEWAY_URL` | Gateway URL | `https://api.worldflowai.com` |
| `ANTHROPIC_BASE_URL` | Routes Claude Code through proxy | unset (direct to Anthropic) |

### Project File

The install script auto-creates `.synapse-project` in your repo root during installation. You can also create it manually:

```
my-project
```

The file contains just the project ID (one line). All hooks read this file to determine which memory project to use, so it works consistently across machines and clones.

:::tip
If `.synapse-project` does not exist, the hooks fall back to: git remote name, git root directory name, or current directory name.
:::

## What Gets Stored

Each milestone contains three GCC fields:

| Field | What It Captures |
|-------|-----------------|
| `branchPurpose` | The goal of the current work (e.g., "Implement user auth") |
| `cumulativeProgress` | Summary of all work done so far on this branch |
| `thisContribution` | What this specific session accomplished |

Milestones are deduplicated by content hash --- storing the same content twice is a no-op.

## Workflow Example

```
Session 1: "Implement login form"
  ├── session-start: Recall returns empty project (first session)
  ├── Work: Create login component, add validation
  ├── git commit "feat: add login form with validation"
  │   └── post-commit: Milestone auto-stored (commit abc1234, 3 files)
  ├── git commit "test: add login form tests"
  │   └── post-commit: Milestone auto-stored (commit def5678, 2 files)
  └── session-end: Store final session summary

Session 2: "Add password reset" (next day)
  ├── session-start: Recall returns Session 1's commit milestones
  │   └── Agent knows: login form exists, tests pass, validation is in place
  ├── Work: Build reset flow (no need to re-read login code)
  ├── git commit "feat: add password reset flow"
  │   └── post-commit: Milestone auto-stored
  └── session-end: Store milestone with cumulative progress

Long Session 3: "Major refactor" (runs for hours)
  ├── session-start: Recall returns commit history from both sessions
  ├── git commit "refactor: extract auth middleware"
  │   └── post-commit: Progress captured mid-session
  ├── pre-compact: Context checkpoint saved before compaction
  ├── git commit "refactor: simplify login route handler"
  │   └── post-commit: Progress captured again
  └── session-end: Final summary (nothing lost, even with compaction)
```

## Branching

For parallel workstreams, create a memory branch:

```bash
# Start a feature branch
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/my-project/branches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchName": "feature-auth",
    "purpose": "Implement authentication system",
    "agentId": "claude-code-local"
  }'
```

Set the branch in your session:

```bash
export SYNAPSE_BRANCH=feature-auth
```

When the feature is complete, merge back:

```bash
curl -X POST https://api.worldflowai.com/api/v1/memory/projects/my-project/merge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceBranch": "feature-auth",
    "targetBranch": "main",
    "mergeSummary": "Auth system complete: JWT, login, password reset, RBAC",
    "agentId": "claude-code-local"
  }'
```

## Troubleshooting

### Hooks Not Firing

1. Check hooks are installed:
   ```bash
   ls ~/.claude/hooks/
   ```
2. Verify hook scripts are executable:
   ```bash
   chmod +x ~/.claude/hooks/synapse-memory/*.sh
   ```
3. Check gateway connectivity:
   ```bash
   curl https://api.worldflowai.com/health
   ```

### Token Expired

:::warning
Hooks will fail with `401` if the JWT has expired. Re-run the install script to obtain a fresh token.
:::

```bash
./scripts/install-synapse.sh --api-key sk-syn-abc123
```

### No Context on Session Start

1. Verify the project exists:
   ```bash
   curl https://api.worldflowai.com/api/v1/memory/projects/$SYNAPSE_PROJECT_ID \
     -H "Authorization: Bearer $TOKEN"
   ```
2. Check you have milestones stored:
   ```bash
   curl "https://api.worldflowai.com/api/v1/memory/projects/$SYNAPSE_PROJECT_ID/recall?view=branch&branch=main" \
     -H "Authorization: Bearer $TOKEN"
   ```
3. Ensure `SYNAPSE_PROJECT_ID` matches the project you stored milestones on.

### Cache Always Misses (Proxy Mode)

If the cache never returns hits, verify the following:

- `ANTHROPIC_BASE_URL` is set and points to the WorldFlow AI gateway.
- The gateway's semantic cache is enabled for your workspace.
- Your queries meet the minimum similarity threshold. Adjust the threshold through the admin API if needed.
