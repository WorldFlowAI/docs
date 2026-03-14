---
title: Virtual Keys & Usage Tracking
description: Create WorldFlow AI virtual keys for per-team and per-project usage tracking, rate limiting, IP allowlisting, anomaly detection, and key rotation.
sidebar_position: 12
---

# Virtual Keys & Usage Tracking

Virtual keys are Synapse-issued credentials (`sk-syn-...`) that sit in front of your provider API keys. They provide per-key usage tracking, rate limiting, model allowlisting, IP restrictions, and anomaly detection without exposing your underlying provider secrets.

## List Virtual Keys

```
GET /api/v1/virtual-keys
```

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by `ACTIVE`, `REVOKED`, or `EXPIRED` |
| `includeInactive` | boolean | Include revoked and expired keys (default `false`) |
| `page` | integer | Page number (default 1) |
| `pageSize` | integer | Items per page (default 20) |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/virtual-keys?status=ACTIVE&pageSize=10"
```

```json
{
  "keys": [
    {
      "id": "vk-550e8400-...",
      "name": "Team API Key",
      "description": "Shared key for the engineering team",
      "keyPrefix": "sk-syn-xxxx",
      "apiKeyIds": ["key-001", "key-002"],
      "rateLimitRpm": 100,
      "rateLimitTpm": 50000,
      "rateLimitRpd": 10000,
      "allowedModels": ["gpt-4o", "gpt-4o-mini"],
      "allowedIps": ["10.0.0.0/8"],
      "status": "ACTIVE",
      "expiresAt": "2026-01-01T00:00:00Z",
      "lastUsedAt": "2025-06-15T14:30:00Z",
      "totalRequests": 42500,
      "totalTokens": 12500000,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-06-15T14:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

## Get a Virtual Key

```
GET /api/v1/virtual-keys/{id}
```

Returns full key metadata (but never the secret).

## Create a Virtual Key

```
POST /api/v1/virtual-keys
```

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `description` | string | No | Human-readable description |
| `apiKeyIds` | string[] | No | Provider API key IDs this virtual key can use |
| `rateLimitRpm` | integer | No | Requests per minute |
| `rateLimitTpm` | integer | No | Tokens per minute |
| `rateLimitRpd` | integer | No | Requests per day |
| `allowedModels` | string[] | No | Restrict to specific models |
| `allowedIps` | string[] | No | CIDR IP allowlist |
| `expiresAt` | string (datetime) | No | Automatic expiration timestamp |

:::warning
The `secret` field is returned **only once** at creation time. Store it securely. It cannot be retrieved again.
:::

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/virtual-keys" \
  -d '{
    "name": "Mobile App - Production",
    "description": "Rate-limited key for the iOS and Android apps",
    "apiKeyIds": ["key-001"],
    "rateLimitRpm": 60,
    "rateLimitRpd": 5000,
    "allowedModels": ["gpt-4o-mini"],
    "allowedIps": ["203.0.113.0/24"],
    "expiresAt": "2026-06-01T00:00:00Z"
  }'
```

```json
{
  "key": {
    "id": "vk-new-123...",
    "name": "Mobile App - Production",
    "keyPrefix": "sk-syn-abcd",
    "status": "ACTIVE",
    "rateLimitRpm": 60,
    "rateLimitRpd": 5000,
    "allowedModels": ["gpt-4o-mini"],
    "allowedIps": ["203.0.113.0/24"],
    "totalRequests": 0,
    "totalTokens": 0,
    "createdAt": "2025-06-15T15:00:00Z",
    "updatedAt": "2025-06-15T15:00:00Z"
  },
  "secret": "sk-syn-abcdef1234567890abcdef1234567890",
  "message": "Store this secret securely. It will not be shown again."
}
```

## Update a Virtual Key

```
PUT /api/v1/virtual-keys/{id}
```

Partial updates are supported. Only provided fields are changed.

```bash
curl -X PUT -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "https://gateway.example.com/api/v1/virtual-keys/vk-550e8400-..." \
  -d '{
    "rateLimitRpm": 200,
    "allowedModels": ["gpt-4o", "gpt-4o-mini", "claude-sonnet-4-20250514"]
  }'
```

## Rotate a Virtual Key

```
POST /api/v1/virtual-keys/{id}/rotate
```

Generates a new secret and immediately invalidates the old one. The new secret is returned once.

:::warning
After rotation the old secret stops working immediately. Update all clients before rotating.
:::

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/virtual-keys/vk-550e8400-.../rotate"
```

```json
{
  "key": {
    "id": "vk-550e8400-...",
    "name": "Team API Key",
    "keyPrefix": "sk-syn-efgh",
    "status": "ACTIVE"
  },
  "secret": "sk-syn-efgh5678newrotatednewrotated90",
  "message": "Key rotated. Store the new secret securely."
}
```

## Revoke a Virtual Key

```
DELETE /api/v1/virtual-keys/{id}
```

Soft-deletes the key. It can no longer be used for requests, but its usage history remains accessible.

```bash
curl -X DELETE -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/virtual-keys/vk-550e8400-..."
```

```json
{
  "id": "vk-550e8400-...",
  "message": "Virtual key revoked",
  "revokedAt": "2025-06-15T16:00:00Z"
}
```

## Usage Statistics

```
GET /api/v1/virtual-keys/{id}/usage
```

Returns time-series usage data for a virtual key.

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | string (datetime) | Start of the time range |
| `endDate` | string (datetime) | End of the time range |
| `granularity` | string | Bucket size: `hour`, `day`, `week`, or `month` (default `day`) |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/virtual-keys/vk-550e8400-.../usage?granularity=day&startDate=2025-06-01"
```

```json
{
  "data": [
    {
      "timestamp": "2025-06-01T00:00:00Z",
      "requestCount": 1250,
      "promptTokens": 320000,
      "completionTokens": 180000,
      "totalTokens": 500000,
      "cacheHits": 875,
      "cacheMisses": 375,
      "estimatedCostCents": 4200,
      "errorCount": 3
    }
  ],
  "summary": {
    "totalRequests": 42500,
    "totalTokens": 12500000,
    "totalCacheHits": 29750,
    "totalCacheMisses": 12750,
    "cacheHitRate": 0.70,
    "totalCostCents": 150000,
    "totalErrors": 45
  }
}
```

## Anomaly Detection

```
GET /api/v1/virtual-keys/{id}/analytics
```

Returns usage analytics with automatic anomaly detection. The system flags three types of anomalies:

| Anomaly Type | Trigger | Description |
|-------------|---------|-------------|
| `spend_spike` | >3x baseline | Spending significantly above the rolling average |
| `request_spike` | >5x baseline | Request volume significantly above the rolling average |
| `new_model` | New model used | A model was accessed that has not been used by this key before |

**Query parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | Time window: `1h`, `6h`, `24h`, `7d`, or `30d` (default `24h`) |

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "https://gateway.example.com/api/v1/virtual-keys/vk-550e8400-.../analytics?period=24h"
```

```json
{
  "keyId": "vk-550e8400-...",
  "period": "24h",
  "totalRequests": 5200,
  "totalTokens": 1800000,
  "totalSpendCents": 12500,
  "hourlyBreakdown": [
    {
      "hour": "2025-06-15T14:00:00Z",
      "requests": 350,
      "tokens": 120000,
      "spendCents": 850
    }
  ],
  "anomalies": [
    {
      "type": "spend_spike",
      "detectedAt": "2025-06-15T14:30:00Z",
      "description": "Spending 3.2x above 7-day rolling average",
      "currentRate": 850.0,
      "baselineRate": 265.0
    }
  ]
}
```

## Best Practices

1. **One key per team or service.** Assign separate virtual keys to each team, environment, or microservice so you can track usage and enforce limits independently.
2. **Set rate limits.** Always configure at least `rateLimitRpm` to prevent a single consumer from exhausting your provider quota.
3. **Use model allowlists.** Restrict keys to the models they actually need. This prevents accidental use of expensive models.
4. **Rotate on a schedule.** Rotate secrets quarterly or after any team member departs.
5. **Monitor anomalies.** Poll the `/analytics` endpoint or integrate its alerts into your observability pipeline to catch abuse early.
6. **Set expiration dates.** For short-lived projects or contractor access, set `expiresAt` so keys auto-expire.
