---
title: "Authentication"
description: "How to authenticate with the WorldFlow AI API using API keys, JWT tokens, and multi-environment configuration."
sidebar_position: 3
---

# Authentication

All WorldFlow AI API requests require a JWT bearer token. This page covers how to obtain tokens, their lifecycle, and configuration for different environments.

## Token Exchange Flow

WorldFlow AI uses API key authentication with JWT token exchange:

```
API Key ──POST /api/v1/auth/token──> JWT Token ──Bearer header──> API Requests
```

1. You receive an API key from your WorldFlow AI administrator (or generate one from the dashboard).
2. Exchange the key for a short-lived JWT by calling the token endpoint.
3. Include the JWT in the `Authorization` header of all subsequent requests.

### Request

```bash
curl -X POST https://api.worldflowai.com/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "sk-syn-abc123"}'
```

### Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "role": "admin"
}
```

### Using the Token

Include the JWT in every request:

```bash
curl https://api.worldflowai.com/api/v1/memory/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## JWT Claims

WorldFlow AI JWTs contain these claims:

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | Subject identifier (user or service account ID) |
| `iat` | number | Issued-at timestamp (Unix epoch) |
| `exp` | number | Expiration timestamp (Unix epoch) |
| `role` | string | Role: `admin`, `user`, or `readonly` |
| `tenant_id` | string | Workspace/tenant identifier for data isolation |

All memory API results are scoped to the `tenant_id` in your token. You cannot access another tenant's projects or milestones.

## Token Lifecycle

- **Default expiry**: 24 hours (86400 seconds)
- **No refresh tokens**: Exchange your API key again when the token expires
- **Stateless validation**: Tokens are validated using HMAC-SHA256 signatures, not database lookups. There is no token revocation --- if a token is compromised, rotate the signing secret.

## Install Script Authentication

The `install-synapse.sh` script handles JWT generation automatically for Claude Code integration. It supports multiple authentication methods:

### API Key (recommended for external developers)

```bash
./scripts/install-synapse.sh --api-key sk-syn-abc123
```

The script exchanges your API key for a JWT via the `/api/v1/auth/token` endpoint. No AWS access required.

### Local JWT Secret

```bash
./scripts/install-synapse.sh --local
```

For local Docker development. Generates a JWT using the local `SYNAPSE_JWT_SECRET` environment variable.

### AWS Secrets Manager (internal teams)

```bash
./scripts/install-synapse.sh
```

Without flags, the script auto-detects AWS credentials and retrieves the JWT secret from Secrets Manager.

## Multiple Environments

Use separate API keys and `tenant_id` values for each environment:

| Environment | Base URL | Tenant |
|-------------|----------|--------|
| Production | `https://api.worldflowai.com` | Your production tenant ID |
| Staging | Your staging URL | Separate staging tenant ID |
| Local | `http://localhost:8080` | Any tenant ID |

## Edge Cases

### Token Expiry Mid-Session

If your token expires during an active agent session:
- Memory hooks (session-start, session-end) will receive `401 Unauthorized`
- The agent session continues, but milestones are not stored
- The next `session-start` hook re-authenticates automatically

:::warning
WorldFlow AI does not issue refresh tokens. If your workload runs longer than 24 hours, implement token renewal logic that exchanges your API key for a fresh JWT before expiry.
:::

### Key Rotation

To rotate your API key:
1. Generate a new API key from the dashboard
2. Update your environment or install script configuration
3. Exchange the new key for a fresh JWT

There is no explicit key revocation API. The old key stops working when replaced.

### Compromise Recovery

If a JWT signing secret is compromised:
1. Rotate the `JWT_SECRET` in AWS Secrets Manager (or your local config)
2. Restart the gateway to pick up the new secret
3. All previously issued tokens become invalid immediately
4. Re-authenticate all agents with fresh tokens

### Team Management

- **Shared keys**: A single API key per team, shared `tenant_id`. All agents see the same projects.
- **Individual keys**: One key per developer. Each maps to the same `tenant_id` but provides audit trails.
- **RBAC**: The `role` claim controls permissions. `admin` has full access, `user` can read/write, `readonly` can only read.

## Error Responses

| Status | Error Type | Cause |
|--------|------------|-------|
| 401 | `authentication_error` | Missing, malformed, or expired token |
| 403 | `authorization_error` | Valid token but insufficient permissions |

```json
{
  "error": {
    "message": "authentication failed: token expired",
    "type": "authentication_error"
  }
}
```
