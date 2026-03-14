---
title: "SSO & SCIM Provisioning"
description: Configure Single Sign-On (OIDC/SAML) connections, verify domains, and manage SCIM provisioning tokens in WorldFlow AI.
sidebar_position: 15
---

# SSO & SCIM Provisioning

WorldFlow AI supports enterprise identity management through SSO (OIDC and SAML) and SCIM automated user provisioning. This guide covers the full lifecycle: creating connections, verifying domains, activating SSO, and configuring SCIM tokens for your identity provider.

## Prerequisites

- A valid JWT token with workspace-admin privileges
- Base URL for your WorldFlow AI deployment (examples use `https://api.worldflowai.com`)
- Access to your identity provider's admin console (Okta, Azure AD, Google Workspace, etc.)

---

## SSO Connections

An SSO connection represents a link between your WorldFlow AI workspace and an identity provider. Each connection uses either OIDC or SAML and can have one or more verified domains.

### Create an OIDC Connection

```bash
curl -X POST https://api.worldflowai.com/api/v1/sso/connections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Okta OIDC",
    "protocol": "oidc",
    "oidcConfig": {
      "issuerUrl": "https://your-org.okta.com",
      "clientId": "0oa1abc2def3ghijk",
      "clientSecret": "your-client-secret",
      "scopes": ["openid", "profile", "email"]
    },
    "jitProvisioning": true,
    "defaultRole": "viewer"
  }'
```

The connection is created in `inactive` status. You must test and activate it before users can sign in.

### Create a SAML Connection

```bash
curl -X POST https://api.worldflowai.com/api/v1/sso/connections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Azure AD SAML",
    "protocol": "saml",
    "samlConfig": {
      "entityId": "https://sts.windows.net/{tenant-id}/",
      "ssoUrl": "https://login.microsoftonline.com/{tenant-id}/saml2",
      "certificate": "-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----",
      "signRequests": true,
      "attributeMapping": {
        "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      }
    },
    "jitProvisioning": false,
    "defaultRole": "member"
  }'
```

**Request body fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Connection name (max 128 chars) |
| `protocol` | string | yes | `oidc` or `saml` |
| `oidcConfig` | object | if OIDC | OIDC configuration (see below) |
| `samlConfig` | object | if SAML | SAML configuration (see below) |
| `jitProvisioning` | boolean | no | Auto-create users on first login (default: `false`) |
| `defaultRole` | string | no | Role assigned to JIT-provisioned users (default: `viewer`) |

**OIDC config fields:** `issuerUrl`, `clientId`, `clientSecret` (encrypted at rest), `discoveryUrl`, `scopes`

**SAML config fields:** `entityId`, `ssoUrl`, `certificate` (PEM), `signRequests`, `attributeMapping`

### List SSO Connections

```bash
curl "https://api.worldflowai.com/api/v1/sso/connections?protocol=oidc&status=active" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Description |
|-----------|-------------|
| `protocol` | Filter: `oidc` or `saml` |
| `status` | Filter: `active`, `inactive`, `testing`, `error` |
| `name` | Partial name match |
| `page` / `pageSize` | Pagination (max 100 per page) |

### Get a Connection

```bash
curl https://api.worldflowai.com/api/v1/sso/connections/{id} \
  -H "Authorization: Bearer $TOKEN"
```

Returns the full connection including associated domains.

### Update a Connection

```bash
curl -X PUT https://api.worldflowai.com/api/v1/sso/connections/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oidcConfig": {
      "clientSecret": "new-rotated-secret"
    }
  }'
```

Only provided fields are updated.

### Delete a Connection

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/sso/connections/{id} \
  -H "Authorization: Bearer $TOKEN"
```

Soft-deletes the connection. Users who authenticated via this connection retain their accounts but must use a different login method.

---

## Connection Testing & Activation

Before activating a connection, test it to verify that your IdP configuration is correct.

### Test a Connection

```bash
curl -X POST https://api.worldflowai.com/api/v1/sso/connections/{id}/test \
  -H "Authorization: Bearer $TOKEN"
```

For OIDC, this validates discovery and JWKS endpoints. For SAML, it validates the certificate and metadata. On success the connection status changes to `testing`; on failure it changes to `error`.

**Response:**

```json
{
  "success": true,
  "details": {
    "discoveryValid": true,
    "jwksValid": true,
    "latencyMs": 142
  }
}
```

### Activate a Connection

```bash
curl -X POST https://api.worldflowai.com/api/v1/sso/connections/{id}/activate \
  -H "Authorization: Bearer $TOKEN"
```

Changes the connection status to `active`. Users matching a verified domain can now sign in through this connection.

### Deactivate a Connection

```bash
curl -X POST https://api.worldflowai.com/api/v1/sso/connections/{id}/deactivate \
  -H "Authorization: Bearer $TOKEN"
```

Changes the status back to `inactive`. Existing sessions are not terminated, but new logins are blocked.

---

## Domain Verification

Each SSO connection requires at least one verified domain. Domain verification proves that you control the email domain that will be routed to this connection.

### Add a Domain

```bash
curl -X POST https://api.worldflowai.com/api/v1/sso/connections/{id}/domains \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "verificationMethod": "dns-txt"
  }'
```

| Field | Values | Description |
|-------|--------|-------------|
| `domain` | any domain | The email domain (e.g., `example.com`) |
| `verificationMethod` | `dns-txt`, `https-file` | Verification approach |

**Response** includes a `dnsRecord` object with the TXT record you must add:

```json
{
  "domain": {
    "id": "dom-uuid",
    "domain": "example.com",
    "status": "pending",
    "verificationToken": "worldflow-verify=abc123..."
  },
  "dnsRecord": {
    "recordType": "TXT",
    "name": "_worldflow-verify.example.com",
    "value": "worldflow-verify=abc123..."
  }
}
```

### Verify a Domain

After adding the DNS record, trigger verification:

```bash
curl -X PUT https://api.worldflowai.com/api/v1/sso/connections/{id}/domains/{domain_id}/verify \
  -H "Authorization: Bearer $TOKEN"
```

Returns `success: true` and updates the domain status to `verified`. If the TXT record is not found, the domain status becomes `failed`.

### Set Primary Domain

```bash
curl -X POST https://api.worldflowai.com/api/v1/sso/connections/{id}/domains/{domain_id}/set-primary \
  -H "Authorization: Bearer $TOKEN"
```

The primary domain is used as the default for JIT-provisioned users.

### Remove a Domain

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/sso/connections/{id}/domains/{domain_id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## SAML Service Provider Metadata

When configuring your IdP for SAML, you need the WorldFlow AI SP metadata:

```bash
curl https://api.worldflowai.com/api/v1/sso/sp-metadata \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
{
  "entityId": "https://api.worldflowai.com/saml/metadata",
  "acsUrl": "https://api.worldflowai.com/saml/acs",
  "metadataXml": "<?xml version=\"1.0\"?>..."
}
```

Copy the `entityId` and `acsUrl` into your IdP's SAML application configuration, or import the `metadataXml` directly.

---

## SCIM Provisioning

SCIM (System for Cross-domain Identity Management) automates user and group synchronization from your identity provider. WorldFlow AI acts as a SCIM service provider.

### Create a SCIM Token

Your IdP needs a bearer token to authenticate SCIM requests. The plain token value is returned exactly once at creation.

```bash
curl -X POST https://api.worldflowai.com/api/v1/scim/tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Okta SCIM Token",
    "scopes": ["users:read", "users:write", "groups:read", "groups:write"],
    "expiresInDays": 365
  }'
```

**Request body fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Token name (max 128 chars) |
| `scopes` | string[] | no | Permitted scopes (default: `users:read`, `users:write`) |
| `expiresInDays` | integer | no | Expiration in days (`null` = never) |

Available scopes: `users:read`, `users:write`, `groups:read`, `groups:write`

**Response (save the `plainValue` immediately):**

```json
{
  "token": {
    "id": "tok-uuid",
    "name": "Okta SCIM Token",
    "maskedValue": "scim_abc1...****",
    "status": "active",
    "scopes": ["users:read", "users:write", "groups:read", "groups:write"],
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "plainValue": "scim_abc1def2ghi3jkl4mno5pqr6stu7vwx8"
}
```

### List SCIM Tokens

```bash
curl "https://api.worldflowai.com/api/v1/scim/tokens?status=active" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Description |
|-----------|-------------|
| `status` | Filter: `active`, `revoked`, `expired` |
| `name` | Search by name |
| `page` / `pageSize` | Pagination (max 100) |

### Get a Token

```bash
curl https://api.worldflowai.com/api/v1/scim/tokens/{id} \
  -H "Authorization: Bearer $TOKEN"
```

The plain value is never returned after creation. Only the `maskedValue` prefix is visible.

### Revoke a Token

```bash
curl -X POST https://api.worldflowai.com/api/v1/scim/tokens/{id}/revoke \
  -H "Authorization: Bearer $TOKEN"
```

Immediately prevents further SCIM operations with this token.

### Delete a Token

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/scim/tokens/{id} \
  -H "Authorization: Bearer $TOKEN"
```

Permanently removes the token and its associated activity logs.

---

## SCIM Activity Logs

Monitor what your IdP is doing through SCIM:

```bash
curl "https://api.worldflowai.com/api/v1/scim/activities?operation=create&resourceType=user&status=success" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Description |
|-----------|-------------|
| `operation` | Filter: `create`, `update`, `delete` |
| `resourceType` | Filter: `user`, `group` |
| `status` | Filter: `success`, `error` |
| `startDate` / `endDate` | ISO 8601 date range |
| `page` / `pageSize` | Pagination (max 100) |

Each activity entry includes the operation type, resource type, resource ID, status, error message (if any), details object, and timestamp.

---

## SCIM Statistics

Get a summary of SCIM sync health:

```bash
curl https://api.worldflowai.com/api/v1/scim/statistics \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
{
  "totalUsers": 847,
  "totalGroups": 23,
  "usersAdded24h": 12,
  "usersRemoved24h": 1,
  "groupsAdded24h": 0,
  "groupsRemoved24h": 0,
  "lastSyncAt": "2025-01-15T14:30:00Z",
  "errorCount24h": 0,
  "activeTokens": 2
}
```

---

## Typical Setup Flow

1. **Create an SSO connection** (OIDC or SAML) with your IdP details
2. **Add and verify a domain** so the system knows which users to route
3. **Test the connection** to validate IdP configuration
4. **Activate the connection** to allow sign-ins
5. **Create a SCIM token** and configure it in your IdP for automated provisioning
6. **Monitor SCIM activity** to confirm users and groups sync correctly

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "type": "validation_error",
    "message": "Connection name is required"
  }
}
```

| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate name) |
