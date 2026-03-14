---
title: Prompt Templates & Chains
description: Manage prompt templates with version control, variable extraction, and execution. Build multi-model chains for sequential LLM pipelines in WorldFlow AI.
sidebar_position: 11
---

# Prompt Templates & Chains

WorldFlow AI provides a prompt management system with version control, variable extraction, folder organization, and direct execution against LLMs. Chains extend this by wiring multiple models into a sequential pipeline where each step's output feeds the next.

## Prompt Templates

### List Prompts

```
GET /api/v1/prompts
```

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by `DRAFT`, `PUBLISHED`, or `ARCHIVED` |
| `folderId` | string (uuid) | Filter by folder |
| `tag` | string | Filter by tag |
| `search` | string | Free-text search in name and description |
| `page` | integer | Page number (default 1) |
| `pageSize` | integer | Items per page (default 20) |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/prompts?status=PUBLISHED&tag=support&pageSize=10"
```

```json
{
  "prompts": [
    {
      "id": "p-550e8400-...",
      "name": "Customer Support",
      "slug": "customer-support",
      "description": "Standard support reply template",
      "template": "You are a helpful {{role}} assistant. The customer asks about {{topic}}.",
      "variables": [
        { "name": "role", "varType": "string", "defaultValue": "support" },
        { "name": "topic", "varType": "string", "defaultValue": "" }
      ],
      "model": "gpt-4o",
      "temperature": 0.7,
      "maxTokens": 500,
      "tags": ["support", "customer"],
      "folderId": "f-123...",
      "status": "PUBLISHED",
      "currentVersion": 3,
      "createdBy": "user-001",
      "createdAt": "2025-02-01T12:00:00Z",
      "updatedAt": "2025-02-15T09:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

### Get a Prompt

```
GET /api/v1/prompts/{id}
```

Returns the prompt with its current template, extracted variables, and metadata.

### Create a Prompt

```
POST /api/v1/prompts
```

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `template` | string | Yes | Template text with `{{variable}}` placeholders |
| `description` | string | No | Human-readable description |
| `model` | string | No | Default model for execution |
| `temperature` | float | No | Sampling temperature |
| `maxTokens` | integer | No | Maximum completion tokens |
| `tags` | string[] | No | Tags for filtering |
| `folderId` | string (uuid) | No | Parent folder |
| `status` | string | No | `DRAFT`, `PUBLISHED`, or `ARCHIVED` (default `DRAFT`) |

Variables are automatically extracted from `{{placeholder}}` syntax in the template.

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/prompts" \
  -d '{
    "name": "Customer Support",
    "template": "You are a helpful {{role}} assistant.\n\nThe customer asks: {{question}}\n\nRespond professionally about {{topic}}.",
    "model": "gpt-4o",
    "temperature": 0.7,
    "maxTokens": 500,
    "tags": ["support"],
    "status": "DRAFT"
  }'
```

### Update a Prompt

```
PUT /api/v1/prompts/{id}
```

Partial updates are supported. When the `template` field is changed, a new version is created automatically. Include a `message` to annotate the version.

```bash
curl -X PUT -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/prompts/p-550e8400-..." \
  -d '{
    "template": "You are a {{role}} assistant specializing in {{department}}.\n\nQuestion: {{question}}",
    "message": "Added department variable for team routing"
  }'
```

### Delete a Prompt

```
DELETE /api/v1/prompts/{id}
```

### Duplicate a Prompt

```
POST /api/v1/prompts/{id}/duplicate
```

Creates a copy of an existing prompt with an optional new name and folder.

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/prompts/p-550e8400-.../duplicate" \
  -d '{
    "name": "Customer Support (Copy)",
    "folderId": "f-789..."
  }'
```

## Version Control

Every template change creates a new version. You can inspect the history, compare versions, and roll back.

### List Versions

```
GET /api/v1/prompts/{id}/versions
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default 1) |
| `pageSize` | integer | Items per page (default 20) |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/prompts/p-550e8400-.../versions"
```

```json
{
  "versions": [
    {
      "id": "v-aaa...",
      "promptId": "p-550e8400-...",
      "version": 3,
      "template": "You are a {{role}} assistant specializing in {{department}}...",
      "variables": [
        { "name": "role" },
        { "name": "department" },
        { "name": "question" }
      ],
      "model": "gpt-4o",
      "temperature": 0.7,
      "message": "Added department variable for team routing",
      "createdBy": "user-001",
      "createdAt": "2025-02-15T09:30:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

### Get a Specific Version

```
GET /api/v1/prompts/{id}/versions/{version}
```

### Create a Version Directly

```
POST /api/v1/prompts/{id}/versions
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template` | string | Yes | New template text |
| `model` | string | No | Model override |
| `temperature` | float | No | Temperature override |
| `maxTokens` | integer | No | Token limit override |
| `message` | string | No | Version commit message |

### Compare Versions (Diff)

```
GET /api/v1/prompts/{id}/diff?fromVersion=1&toVersion=3
```

Returns a unified diff along with lists of added, removed, and changed variables.

```json
{
  "fromVersion": 1,
  "toVersion": 3,
  "templateDiff": "--- v1\n+++ v3\n@@ -1 +1 @@\n-You are a helpful {{role}} assistant.\n+You are a {{role}} assistant specializing in {{department}}.",
  "variablesAdded": ["department"],
  "variablesRemoved": [],
  "variablesChanged": [],
  "stats": {
    "additions": 2,
    "deletions": 1,
    "totalChanges": 3
  }
}
```

### Rollback

```
POST /api/v1/prompts/{id}/rollback
```

Creates a new version with the content from a previous version.

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/prompts/p-550e8400-.../rollback" \
  -d '{
    "version": 1,
    "message": "Reverting to v1 after regression"
  }'
```

## Execution

### Execute a Prompt

```
POST /api/v1/prompts/{id}/execute
```

Substitutes variables into the template and sends the rendered prompt to the configured model. Responses are cached through the WorldFlow AI semantic cache.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `variables` | object | No | Key-value pairs for template substitution |
| `version` | integer | No | Run a specific version (default: current) |
| `model` | string | No | Override the default model |
| `temperature` | float | No | Override temperature |
| `maxTokens` | integer | No | Override max tokens |
| `dryRun` | boolean | No | If `true`, render the template but do not call the LLM |

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/prompts/p-550e8400-.../execute" \
  -d '{
    "variables": {
      "role": "billing specialist",
      "department": "Finance",
      "question": "Why was I charged twice?"
    }
  }'
```

```json
{
  "runId": "run-98765...",
  "renderedPrompt": "You are a billing specialist assistant specializing in Finance.\n\nQuestion: Why was I charged twice?",
  "estimatedTokens": 42,
  "response": "I understand your concern about the duplicate charge...",
  "usage": {
    "promptTokens": 42,
    "completionTokens": 85,
    "totalTokens": 127
  },
  "cacheHit": false,
  "durationMs": 1200,
  "dryRun": false
}
```

### Test a Prompt (Dry Run)

```
POST /api/v1/prompts/{id}/test
```

Accepts the same body as `/execute` but always performs a dry run. The rendered prompt is returned without making an LLM call.

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/prompts/p-550e8400-.../test" \
  -d '{
    "variables": { "role": "sales", "department": "Revenue", "question": "Pricing options?" }
  }'
```

### Execution History

**List runs:**

```
GET /api/v1/prompts/{id}/runs
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by run status |
| `version` | integer | Filter by prompt version |
| `page` | integer | Page number (default 1) |
| `pageSize` | integer | Items per page (default 20) |

**Get a specific run:**

```
GET /api/v1/prompts/{id}/runs/{runId}
```

## Folders

Organize prompts into a hierarchical folder structure.

### List Folders

```
GET /api/v1/folders
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `parentId` | string (uuid) | Filter by parent folder (omit for root folders) |

### Create a Folder

```
POST /api/v1/folders
```

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/folders" \
  -d '{
    "name": "Marketing",
    "parentId": null
  }'
```

### Get, Update, Delete

```
GET    /api/v1/folders/{id}
PUT    /api/v1/folders/{id}
DELETE /api/v1/folders/{id}
```

Deleting a folder fails with a 400 error if the folder still contains prompts or subfolders. Move or delete its contents first.

---

## Chains

Chains are sequential multi-model pipelines. Each chain defines an ordered list of steps. When executed, the output of each step becomes the input for the next. This allows you to use one model for drafting, another for summarization, and a third for formatting, all in a single API call.

### List Chains

```
GET /api/v1/chains
```

```json
{
  "chains": [
    {
      "id": "c-123...",
      "name": "Draft-Review-Polish",
      "steps": [
        { "modelId": "gpt-4o", "systemPrompt": "Draft a response.", "transform": "passThrough", "temperature": 0.9 },
        { "modelId": "claude-sonnet-4-20250514", "systemPrompt": "Review for accuracy.", "transform": "passThrough", "temperature": 0.3 },
        { "modelId": "gpt-4o-mini", "systemPrompt": "Polish the language.", "transform": "passThrough", "temperature": 0.5 }
      ],
      "description": "Three-stage draft, review, and polish pipeline",
      "workspaceId": "ws-001",
      "createdAt": "2025-03-01T08:00:00Z",
      "updatedAt": "2025-03-01T08:00:00Z"
    }
  ],
  "total": 1
}
```

### Create a Chain

```
POST /api/v1/chains
```

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `steps` | array | Yes | Ordered list of chain steps |
| `description` | string | No | Human-readable description |

**Chain step fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `modelId` | string | Yes | Model to use for this step |
| `systemPrompt` | string | No | System prompt for the step |
| `transform` | string | No | How to pass output to the next step: `passThrough`, `extractField`, or `template` (default `passThrough`) |
| `maxTokens` | integer | No | Token limit for this step |
| `temperature` | float | No | Sampling temperature |

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/chains" \
  -d '{
    "name": "Summarize-then-Translate",
    "description": "Summarize English text, then translate to Spanish",
    "steps": [
      {
        "modelId": "gpt-4o",
        "systemPrompt": "Summarize the following text in 2-3 sentences.",
        "transform": "passThrough",
        "maxTokens": 200
      },
      {
        "modelId": "gpt-4o-mini",
        "systemPrompt": "Translate the following English text to Spanish.",
        "transform": "passThrough",
        "maxTokens": 300
      }
    ]
  }'
```

### Get, Update, Delete

```
GET    /api/v1/chains/{id}
PUT    /api/v1/chains/{id}
DELETE /api/v1/chains/{id}
```

The `PUT` body accepts the same fields as `POST`. The full `steps` array is replaced on update.

### Execute a Chain

```
POST /api/v1/chains/{id}/execute
```

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | array | Yes | Chat messages to start the chain (OpenAI message format) |

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/chains/c-123.../execute" \
  -d '{
    "messages": [
      { "role": "user", "content": "WorldFlow AI is a semantic caching gateway that reduces LLM costs by matching similar queries..." }
    ]
  }'
```

```json
{
  "output": "WorldFlow AI es un gateway de almacenamiento sem\u00e1ntico...",
  "steps": [
    {
      "index": 0,
      "model": "gpt-4o",
      "output": "WorldFlow AI is a semantic caching gateway that reduces LLM costs by matching similar queries to cached responses.",
      "promptTokens": 85,
      "completionTokens": 42
    },
    {
      "index": 1,
      "model": "gpt-4o-mini",
      "output": "WorldFlow AI es un gateway de almacenamiento sem\u00e1ntico...",
      "promptTokens": 55,
      "completionTokens": 48
    }
  ],
  "totalPromptTokens": 140,
  "totalCompletionTokens": 90
}
```

Each step in the response includes its model, output text, and token counts. The top-level `output` is the final step's output.
