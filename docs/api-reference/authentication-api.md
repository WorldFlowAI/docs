---
sidebar_position: 2
title: Authentication API
---

# Authentication API

## Exchange API Key for JWT

```
POST /api/v1/auth/token
```

Exchanges an API key for a short-lived JWT bearer token. No authentication header is required for this endpoint.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key` | string | yes | Your WorldFlow AI API key |
| `role` | string | no | Requested role (`admin`, `user`, `readonly`). Defaults to key's assigned role. |

### Example

```bash
curl -X POST https://api.worldflowai.com/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-syn-abc123"
  }'
```

### Response (200 OK)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "role": "admin"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT token to use in `Authorization: Bearer` header |
| `token_type` | string | Always `"Bearer"` |
| `expires_in` | integer | Token validity in seconds (default: 86400 = 24 hours) |
| `role` | string | Role encoded in the token |

### JWT Token Contents

The returned JWT contains these claims when decoded:

```json
{
  "sub": "user-123",
  "iat": 1700000000,
  "exp": 1700086400,
  "role": "admin",
  "tenant_id": "workspace-456"
}
```

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | Subject identifier (user or service account ID) |
| `iat` | number | Issued-at timestamp (Unix epoch) |
| `exp` | number | Expiration timestamp (Unix epoch) |
| `role` | string | Role: `admin`, `user`, or `readonly` |
| `tenant_id` | string | Workspace/tenant identifier for data isolation |

### Using the Token

Include the token in the `Authorization` header for all subsequent API requests:

```bash
curl https://api.worldflowai.com/api/v1/memory/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Token Refresh

Tokens are not refreshable. When a token is nearing expiration, exchange your API key again. We recommend refreshing when less than 5 minutes remain:

```python
import time
import requests

TOKEN_REFRESH_BUFFER = 300  # 5 minutes

class WorldFlowAuth:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.token = None
        self.expires_at = 0

    def get_token(self) -> str:
        if self.token and time.time() < self.expires_at - TOKEN_REFRESH_BUFFER:
            return self.token

        response = requests.post(
            "https://api.worldflowai.com/api/v1/auth/token",
            json={"api_key": self.api_key},
        )
        response.raise_for_status()
        data = response.json()

        self.token = data["access_token"]
        self.expires_at = time.time() + data["expires_in"]
        return self.token
```

### Errors

| Status | Type | Cause |
|--------|------|-------|
| 400 | `validation_error` | Missing or empty `api_key` |
| 401 | `authentication_error` | Invalid API key |

```json
{
  "error": {
    "message": "authentication failed: invalid API key",
    "type": "authentication_error"
  }
}
```

### Role Permissions

| Role | Memory Read | Memory Write | Proxy | Admin Settings |
|------|-------------|--------------|-------|----------------|
| `readonly` | Yes | No | Yes | No |
| `user` | Yes | Yes | Yes | No |
| `admin` | Yes | Yes | Yes | Yes |

For more on authentication concepts, see [Authentication](../authentication).
