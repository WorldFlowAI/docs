---
sidebar_position: 2
title: Authentication API
---

# Authentication API

The Authentication API provides token exchange for accessing all other WorldFlow AI endpoints. Clients exchange an API key for a short-lived JWT bearer token.

## Token Exchange

Exchange an API key for a JWT access token.

### Endpoint

```
POST https://api.worldflowai.com/api/v1/auth/token
```

### Request Headers

| Header         | Value              | Required |
|----------------|--------------------|----------|
| `Content-Type` | `application/json` | Yes      |

### Request Body

| Field     | Type   | Required | Description                                                                                         |
|-----------|--------|----------|-----------------------------------------------------------------------------------------------------|
| `apiKey`  | string | Yes      | Your WorldFlow AI API key (starts with `wf_`)                                                       |
| `role`    | string | No       | Requested role scope. One of `admin`, `editor`, `viewer`. Defaults to the key's maximum role.        |

### Example Request

```bash
curl -X POST https://api.worldflowai.com/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "wf_live_abc123def456",
    "role": "editor"
  }'
```

### Example Response

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-01-15T09:30:00Z",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

### Response Fields

| Field        | Type    | Description                                             |
|--------------|---------|---------------------------------------------------------|
| `token`      | string  | JWT access token to use in `Authorization` header       |
| `expiresAt`  | string  | ISO 8601 timestamp when the token expires               |
| `expiresIn`  | integer | Seconds until expiration                                |
| `tokenType`  | string  | Always `"Bearer"`                                       |

### JWT Contents

The decoded JWT payload contains:

| Claim         | Type   | Description                                              |
|---------------|--------|----------------------------------------------------------|
| `sub`         | string | Account ID                                               |
| `org`         | string | Organization ID                                          |
| `role`        | string | Granted role (`admin`, `editor`, `viewer`)               |
| `iat`         | number | Issued-at timestamp (Unix epoch)                         |
| `exp`         | number | Expiration timestamp (Unix epoch)                        |
| `iss`         | string | Issuer (`https://api.worldflowai.com`)                   |
| `aud`         | string | Audience (`worldflowai-api`)                             |
| `jti`         | string | Unique token identifier                                  |

### Using the Token

Include the token in the `Authorization` header for all subsequent API calls:

```bash
curl https://api.worldflowai.com/api/v1/projects \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Refresh

Tokens are not refreshable. When a token is nearing expiration, request a new one by calling the token exchange endpoint again. We recommend refreshing when less than 5 minutes remain.

```python
import time
import requests

TOKEN_REFRESH_BUFFER = 300  # 5 minutes

class WorldFlowAuth:
    def __init__(self, api_key: str, role: str = "editor"):
        self.api_key = api_key
        self.role = role
        self.token = None
        self.expires_at = 0

    def get_token(self) -> str:
        if self.token and time.time() < self.expires_at - TOKEN_REFRESH_BUFFER:
            return self.token

        response = requests.post(
            "https://api.worldflowai.com/api/v1/auth/token",
            json={"apiKey": self.api_key, "role": self.role},
        )
        response.raise_for_status()
        data = response.json()

        self.token = data["token"]
        self.expires_at = time.time() + data["expiresIn"]
        return self.token
```

### Errors

| Status | Code                  | Description                                          |
|--------|-----------------------|------------------------------------------------------|
| `400`  | `INVALID_REQUEST`     | Missing or malformed `apiKey` field                  |
| `401`  | `INVALID_API_KEY`     | The API key is invalid, expired, or revoked          |
| `403`  | `ROLE_ESCALATION`     | Requested role exceeds the key's maximum permissions |
| `429`  | `RATE_LIMIT_EXCEEDED` | Too many token requests; retry after backoff         |

#### Error Example

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is not valid. Please check your key and try again.",
    "details": {
      "hint": "API keys start with 'wf_live_' (production) or 'wf_test_' (sandbox)."
    }
  }
}
```

### Role Permissions

| Role     | Memory Read | Memory Write | Proxy | Admin Settings |
|----------|-------------|--------------|-------|----------------|
| `viewer` | Yes         | No           | Yes   | No             |
| `editor` | Yes         | Yes          | Yes   | No             |
| `admin`  | Yes         | Yes          | Yes   | Yes            |

For more on authentication concepts, see [Authentication](../authentication).
