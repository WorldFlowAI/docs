---
title: Rate Limits
description: Per-tenant rate limiting in WorldFlow AI, including default limits, response format, retry handling, exponential backoff, tier presets, and the rate limit management API.
sidebar_position: 3
---

# Rate Limits

WorldFlow AI uses per-tenant rate limiting to ensure fair resource allocation. Rate limits are enforced at the gateway using a token-bucket algorithm (governor-based).

## Limits

Rate limits are applied per `tenant_id` (extracted from the JWT token):

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Memory API (read) | 100 requests | per second |
| Memory API (write) | 50 requests | per second |
| Proxy API | 60 requests | per second |
| Auth (token exchange) | 10 requests | per minute |

These are default limits. Enterprise customers can request higher limits.

## Rate Limit Response

When you exceed the limit, you receive a `429 Too Many Requests` response:

```json
{
  "error": {
    "message": "rate limit exceeded: try again in 60 seconds",
    "type": "rate_limit_error",
    "retry_after_secs": 60
  }
}
```

## Handling Rate Limits

### Read `retry_after_secs`

Always read the `retry_after_secs` field from the error response rather than using a fixed delay:

```python
import time
import requests

resp = requests.post(url, headers=headers, json=body)
if resp.status_code == 429:
    retry_after = resp.json()["error"]["retry_after_secs"]
    time.sleep(retry_after)
    resp = requests.post(url, headers=headers, json=body)
```

### Exponential Backoff

For production integrations, use exponential backoff with jitter:

```python
import random
import time

def request_with_backoff(fn, max_retries=5):
    for attempt in range(max_retries):
        resp = fn()
        if resp.status_code != 429:
            return resp
        base_delay = resp.json().get("error", {}).get("retry_after_secs", 2 ** attempt)
        jitter = random.uniform(0, base_delay * 0.1)
        time.sleep(base_delay + jitter)
    return resp
```

### Batch Requests

If you are storing many milestones or metrics, batch them rather than sending one request per item. The Store endpoint accepts one milestone per call, but you can space calls to stay within limits.

## Promote Endpoint Rate Limiting

The promote endpoint (`POST /projects/{id}/promote`) has additional rate limiting to prevent cache churn:

- Maximum 10 promotions per project per minute
- Duplicate content hashes are silently deduplicated (not counted against limit)

## Tips

- **Cache JWT tokens**: Do not call `/auth/token` on every request. Tokens are valid for 24 hours.
- **Use recall efficiently**: A single recall request with `view=branch&limit=10` returns all the context you need for session start. Avoid making multiple recall calls.
- **Batch session-end operations**: If your agent produces multiple milestones, store them sequentially with small delays rather than in a burst.

## Rate Limit Management API

Administrators can manage per-tenant rate limit tiers through the REST API. This allows upgrading tenants to higher limits without redeployment.

### Tier Presets

| Tier | Requests/sec | Requests/min | Tokens/min | Requests/day |
|------|-------------|-------------|------------|-------------|
| `starter` | 10 | 600 | 100,000 | 10,000 |
| `pro` | 100 | 6,000 | 1,000,000 | 100,000 |
| `enterprise` | 500 | 30,000 | 10,000,000 | 1,000,000 |

New tenants default to the `starter` tier.

### Endpoints

| Method | Path | Description | Permission |
|--------|------|-------------|------------|
| `GET` | `/api/v1/rate-limits` | List all tenant tier assignments | `ViewMetrics` |
| `GET` | `/api/v1/rate-limits/tiers` | List available tier presets and their limits | `ViewMetrics` |
| `GET` | `/api/v1/rate-limits/{tenant_id}` | Get a specific tenant's current tier | `ViewMetrics` |
| `PUT` | `/api/v1/rate-limits/{tenant_id}` | Assign a tier to a tenant | `ManageConfig` |
| `DELETE` | `/api/v1/rate-limits/{tenant_id}` | Reset a tenant to the default tier | `ManageConfig` |

### Examples

**List available tiers:**

```bash
curl https://api.worldflowai.com/api/v1/rate-limits/tiers \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "tiers": [
    {
      "name": "starter",
      "requestsPerSecond": 10,
      "requestsPerMinute": 600,
      "tokensPerMinute": 100000,
      "requestsPerDay": 10000
    },
    {
      "name": "pro",
      "requestsPerSecond": 100,
      "requestsPerMinute": 6000,
      "tokensPerMinute": 1000000,
      "requestsPerDay": 100000
    },
    {
      "name": "enterprise",
      "requestsPerSecond": 500,
      "requestsPerMinute": 30000,
      "tokensPerMinute": 10000000,
      "requestsPerDay": 1000000
    }
  ]
}
```

**Assign a tenant to the Pro tier:**

```bash
curl -X PUT https://api.worldflowai.com/api/v1/rate-limits/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "pro"
  }'
```

**Reset a tenant to the default tier:**

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/rate-limits/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

### Permissions

- **Read operations** (`GET`): Require the `ViewMetrics` permission in the JWT token.
- **Write operations** (`PUT`, `DELETE`): Require the `ManageConfig` permission in the JWT token.
