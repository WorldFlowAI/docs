---
title: Content Guardrails
description: Protect LLM inputs and outputs with WorldFlow AI guardrails. Configure PII detection, content filtering, keyword blocking, and custom ML-based rules.
sidebar_position: 10
---

# Content Guardrails

WorldFlow AI guardrails intercept LLM requests and responses to detect PII, moderate content, block prohibited topics, and validate output formats. Each guardrail consists of one or more rules that are evaluated against the input, the output, or both.

## Concepts

| Concept | Description |
|---------|-------------|
| **Guard type** | Where the guardrail runs: `INPUT` (before the LLM call), `OUTPUT` (after), or `BOTH`. |
| **Category** | Organizational label: `PII`, `CONTENT_MODERATION`, `SAFETY`, or `CUSTOM`. |
| **Action** | What happens when a rule matches: `BLOCK` (reject the request), `REDACT` (mask the matched text), `WARN` (add a warning header), or `LOG` (record silently). |
| **Rule type** | Matching strategy: `REGEX`, `KEYWORD`, `ML_MODEL`, or `CUSTOM`. |
| **Priority** | Integer that controls evaluation order. Lower values run first. |

## List Guardrails

Retrieve a paginated list of guardrails with optional filters.

```
GET /api/v1/guardrails
```

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `guardType` | string | Filter by `INPUT`, `OUTPUT`, or `BOTH` |
| `category` | string | Filter by `PII`, `CONTENT_MODERATION`, `SAFETY`, or `CUSTOM` |
| `enabled` | boolean | Filter by enabled status |
| `search` | string | Free-text search in name and description |
| `page` | integer | Page number (1-indexed) |
| `pageSize` | integer | Items per page (default 20) |

**Example**

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/guardrails?category=PII&enabled=true&pageSize=10"
```

```json
{
  "guardrails": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "SSN Detector",
      "description": "Detects US Social Security Numbers",
      "guardType": "BOTH",
      "category": "PII",
      "enabled": true,
      "action": "REDACT",
      "priority": 1,
      "rules": [
        {
          "id": "r1a2b3c4-...",
          "guardrailId": "a1b2c3d4-...",
          "ruleType": "REGEX",
          "config": {
            "pattern": "\\b\\d{3}-\\d{2}-\\d{4}\\b",
            "description": "SSN pattern"
          },
          "createdAt": "2025-01-15T10:00:00Z"
        }
      ],
      "createdBy": "user-001",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

## Get a Guardrail

```
GET /api/v1/guardrails/{id}
```

Returns the full guardrail including all attached rules.

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/guardrails/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**Error responses**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Guardrail does not exist |

## Create a Guardrail

```
POST /api/v1/guardrails
```

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `description` | string | No | Human-readable description |
| `guardType` | string | No | `INPUT`, `OUTPUT`, or `BOTH` |
| `category` | string | No | `PII`, `CONTENT_MODERATION`, `SAFETY`, or `CUSTOM` |
| `enabled` | boolean | No | Whether the guardrail is active (default `true`) |
| `action` | string | No | `BLOCK`, `REDACT`, `WARN`, or `LOG` |
| `priority` | integer | No | Evaluation order (lower runs first) |
| `rules` | array | No | Initial rules to attach |

Each rule in the `rules` array requires:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ruleType` | string | Yes | `REGEX`, `KEYWORD`, `ML_MODEL`, or `CUSTOM` |
| `config` | object | Yes | Rule-specific configuration |

### Example: PII Detector (Regex)

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/guardrails" \
  -d '{
    "name": "PII Detector",
    "description": "Detects personally identifiable information",
    "guardType": "BOTH",
    "category": "PII",
    "action": "REDACT",
    "rules": [
      {
        "ruleType": "REGEX",
        "config": {
          "pattern": "\\b\\d{3}-\\d{2}-\\d{4}\\b",
          "description": "SSN pattern"
        }
      },
      {
        "ruleType": "REGEX",
        "config": {
          "pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
          "description": "Email address"
        }
      }
    ]
  }'
```

### Example: Content Filter (Keywords)

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/guardrails" \
  -d '{
    "name": "Profanity Filter",
    "category": "CONTENT_MODERATION",
    "guardType": "BOTH",
    "action": "BLOCK",
    "rules": [
      {
        "ruleType": "KEYWORD",
        "config": {
          "keywords": ["prohibited_term_1", "prohibited_term_2"],
          "caseSensitive": false
        }
      }
    ]
  }'
```

**Error responses**

| Status | Type | Description |
|--------|------|-------------|
| 400 | `validation_error` | Invalid request body (missing required fields, bad enum values) |

## Update a Guardrail

```
PUT /api/v1/guardrails/{id}
```

Partial updates are supported. Only provided fields are changed. When `rules` is included, the full rules array is replaced.

```bash
curl -X PUT -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/guardrails/a1b2c3d4-..." \
  -d '{
    "action": "BLOCK",
    "priority": 5
  }'
```

### Toggle Enabled Status

```bash
curl -X PUT -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/guardrails/a1b2c3d4-..." \
  -d '{"enabled": false}'
```

**Error responses**

| Status | Type | Description |
|--------|------|-------------|
| 400 | `validation_error` | Invalid update payload |
| 404 | `not_found` | Guardrail does not exist |

## Delete a Guardrail

```
DELETE /api/v1/guardrails/{id}
```

Permanently removes the guardrail and all associated rules.

```bash
curl -X DELETE -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/guardrails/a1b2c3d4-..."
```

**Error responses**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Guardrail does not exist |

## Test a Guardrail

Run a guardrail against sample text without affecting live traffic. The response tells you whether the guardrail would trigger, which action would apply, and where in the input each match was found.

```
POST /api/v1/guardrails/{id}/test
```

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `input` | string | Yes | Text to test against |
| `direction` | string | No | `INPUT` or `OUTPUT` (defaults to `INPUT`) |

**Example**

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/guardrails/a1b2c3d4-.../test" \
  -d '{
    "input": "My SSN is 123-45-6789 and my email is test@example.com",
    "direction": "INPUT"
  }'
```

```json
{
  "triggered": true,
  "action": "REDACT",
  "matches": [
    {
      "ruleId": "r1a2b3c4-...",
      "ruleType": "REGEX",
      "matchedText": "123-45-6789",
      "startIndex": 10,
      "endIndex": 21,
      "confidence": 1.0
    },
    {
      "ruleId": "r2b3c4d5-...",
      "ruleType": "REGEX",
      "matchedText": "test@example.com",
      "startIndex": 39,
      "endIndex": 55,
      "confidence": 1.0
    }
  ],
  "processingTimeMs": 2
}
```

**Error responses**

| Status | Type | Description |
|--------|------|-------------|
| 404 | `not_found` | Guardrail does not exist |

## Configuration and Tuning

### Rule Types

**REGEX** -- Match text against a regular expression. Use `config.pattern` for the regex and an optional `config.description` label.

**KEYWORD** -- Match against a list of terms. Set `config.keywords` (array of strings) and `config.caseSensitive` (boolean, default `false`).

**ML_MODEL** -- Delegate to a machine-learning classifier. Set `config.modelId` to identify the model and `config.threshold` for the confidence cutoff.

**CUSTOM** -- Provide arbitrary JSON configuration consumed by a custom handler registered in your deployment.

### Action Selection

| Action | Behavior |
|--------|----------|
| `BLOCK` | Reject the entire request with a 400 response. Use for hard safety requirements. |
| `REDACT` | Replace matched text with a placeholder (e.g., `[REDACTED]`) and continue processing. Use for PII. |
| `WARN` | Allow the request but add a `X-Guardrail-Warning` response header. Use for soft policy enforcement. |
| `LOG` | Allow the request silently. The match is recorded in guardrail statistics for auditing. |

### Priority Ordering

Guardrails execute in ascending `priority` order. If a `BLOCK` guardrail triggers, no subsequent guardrails run and the request is immediately rejected. Assign the strictest guardrails the lowest priority values.

### Best Practices

1. **Layer defenses.** Combine a `REGEX` rule for structured PII patterns (SSN, credit card) with an `ML_MODEL` rule for unstructured sensitive content.
2. **Test before enabling.** Use the `/test` endpoint to validate rules against representative inputs before setting `enabled: true`.
3. **Start with `LOG`.** Deploy new guardrails with `action: "LOG"` first to measure false-positive rates, then escalate to `WARN` or `BLOCK`.
4. **Keep rules focused.** Create separate guardrails per concern (PII, profanity, topic blocking) rather than one guardrail with many mixed rules. This makes statistics more actionable.
