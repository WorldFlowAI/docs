---
title: "Teams, Users & RBAC"
description: Manage teams, users, roles, invitations, and permission auditing in WorldFlow AI. Includes budget controls and spend tracking per team.
sidebar_position: 14
---

# Teams, Users & RBAC

WorldFlow AI provides a full team and user management layer on top of its gateway. You can organize users into hierarchical teams, assign roles with fine-grained permissions, send invitations, and audit who can do what -- all through a single set of REST endpoints.

## Prerequisites

- A valid JWT token with `ManageKeys` permission (for role operations) or workspace-admin privileges (for user/team CRUD)
- Base URL for your WorldFlow AI deployment (examples use `https://api.worldflowai.com`)

---

## Teams

Teams group virtual keys under a shared budget. They support parent-child hierarchies and spend tracking.

### Create a Team

```bash
curl -X POST https://api.worldflowai.com/api/v1/teams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ML Platform",
    "description": "Shared budget for the ML team",
    "parentTeamId": null,
    "maxBudgetCents": 500000,
    "budgetPeriod": "monthly"
  }'
```

**Request body fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Team name (max 128 chars) |
| `description` | string | no | Human-readable description |
| `parentTeamId` | uuid | no | Parent team for hierarchy (`null` = top-level) |
| `maxBudgetCents` | integer | no | Maximum budget in USD cents (`null` = no limit) |
| `budgetPeriod` | string | no | Reset cadence: `daily`, `weekly`, or `monthly` |

### List Teams

```bash
curl https://api.worldflowai.com/api/v1/teams?page=1&pageSize=20 \
  -H "Authorization: Bearer $TOKEN"
```

Query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number |
| `pageSize` | 20 | Results per page (max 100) |
| `includeDeleted` | false | Include soft-deleted teams |

### Get a Team

```bash
curl https://api.worldflowai.com/api/v1/teams/{id} \
  -H "Authorization: Bearer $TOKEN"
```

### Update a Team

```bash
curl -X PUT https://api.worldflowai.com/api/v1/teams/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maxBudgetCents": 750000,
    "budgetPeriod": "monthly"
  }'
```

Only provided fields are updated; omitted fields retain their current values.

### Delete a Team

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/teams/{id} \
  -H "Authorization: Bearer $TOKEN"
```

Soft-deletes the team. Virtual keys assigned to the team are unlinked but not revoked.

### List Team Keys

Retrieve all virtual keys assigned to a team:

```bash
curl https://api.worldflowai.com/api/v1/teams/{id}/keys \
  -H "Authorization: Bearer $TOKEN"
```

### Get Team Spend Summary

Aggregated spend across all virtual keys in the team:

```bash
curl https://api.worldflowai.com/api/v1/teams/{id}/spend \
  -H "Authorization: Bearer $TOKEN"
```

**Response fields:**

| Field | Description |
|-------|-------------|
| `totalSpendCents` | Aggregate spend across all keys |
| `teamSpendCents` | Team's own tracked spend in the current period |
| `totalKeys` | Total number of keys |
| `activeKeys` | Number of active keys |
| `maxBudgetCents` | Configured budget limit |

---

## Users

User records are scoped to a workspace and support SSO integration, status filtering, and soft-delete.

### Create a User

```bash
curl -X POST https://api.worldflowai.com/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "name": "Alice Chen",
    "external_id": "okta-12345",
    "identity_provider": "okta"
  }'
```

**Request body fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | yes | Email address |
| `name` | string | no | Display name |
| `external_id` | string | no | External IdP identifier (for SSO) |
| `identity_provider` | string | no | IdP name (e.g., `okta`, `azure-ad`) |
| `metadata` | object | no | Arbitrary key-value metadata |

Returns `409` if a user with the same email already exists in the workspace.

### List Users

```bash
curl "https://api.worldflowai.com/api/v1/users?status=ACTIVE&search=alice" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number (1-indexed) |
| `page_size` | 20 | Results per page (max 100) |
| `status` | -- | Filter: `ACTIVE` or `SUSPENDED` |
| `search` | -- | Case-insensitive partial match on email or name |

### Get a User

```bash
curl https://api.worldflowai.com/api/v1/users/{id} \
  -H "Authorization: Bearer $TOKEN"
```

### Update a User

```bash
curl -X PUT https://api.worldflowai.com/api/v1/users/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUSPENDED"
  }'
```

Only provided fields are updated.

### Delete a User

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/users/{id} \
  -H "Authorization: Bearer $TOKEN"
```

Soft-deletes the user. The record is retained with a `deleted_at` timestamp but excluded from list queries. Role assignments are not automatically removed.

---

## Roles & RBAC

The RBAC system provides custom roles, role assignment with optional scope and expiration, and real-time permission checking.

### List Roles

```bash
curl "https://api.worldflowai.com/api/v1/roles?is_system=true" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Description |
|-----------|-------------|
| `name` | Filter by role name |
| `is_system` | Show only built-in roles (`true`) or custom roles (`false`) |
| `permission` | Filter roles that include this permission |
| `page` / `page_size` | Pagination (max 1000) |

### Create a Custom Role

```bash
curl -X POST https://api.worldflowai.com/api/v1/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "billing-viewer",
    "description": "Read-only access to billing and spend data",
    "permissions": ["ViewMetrics", "ViewLogs"]
  }'
```

### Update a Role

```bash
curl -X PATCH https://api.worldflowai.com/api/v1/roles/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["ViewMetrics", "ViewLogs", "ViewKeys"]
  }'
```

### Delete a Role

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/roles/{id} \
  -H "Authorization: Bearer $TOKEN"
```

### Assign a Role to a User

```bash
curl -X POST https://api.worldflowai.com/api/v1/users/{user_id}/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": "role-uuid-here",
    "scope": "workspace",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

The `scope` and `expiresAt` fields are optional. When `expiresAt` is set, the assignment is automatically revoked after that time.

### List Role Assignments for a User

```bash
curl https://api.worldflowai.com/api/v1/users/{user_id}/roles \
  -H "Authorization: Bearer $TOKEN"
```

### Revoke a Role

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/users/{user_id}/roles/{role_id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Invitations

Send email invitations to new users. Invitations can include a pre-assigned role.

### Create Invitations

```bash
curl -X POST https://api.worldflowai.com/api/v1/invitations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["bob@example.com", "carol@example.com"],
    "roleId": "viewer-role-id",
    "message": "Welcome to the team!"
  }'
```

**Response** includes counts of `sent` and `failed` invitations.

### List Invitations

```bash
curl "https://api.worldflowai.com/api/v1/invitations?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Description |
|-----------|-------------|
| `email` | Filter by recipient email |
| `status` | Filter: `pending`, `accepted`, `expired`, `revoked` |
| `page` / `page_size` | Pagination |

### Resend an Invitation

```bash
curl -X POST https://api.worldflowai.com/api/v1/invitations/{id}/resend \
  -H "Authorization: Bearer $TOKEN"
```

### Revoke an Invitation

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/invitations/{id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Permission Auditing

Two endpoints let you inspect what a user can do without making a trial request.

### Get Permission Tree

Returns the full permission tree for a user, showing which roles grant which permissions:

```bash
curl "https://api.worldflowai.com/api/v1/permissions/tree?user_id={user_id}" \
  -H "Authorization: Bearer $TOKEN"
```

Optionally filter to a specific `resource` type.

### Check a Single Permission

```bash
curl "https://api.worldflowai.com/api/v1/permissions/check?user_id={user_id}&resource_type=logs&action=read" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `user_id` | yes | User to check |
| `resource_type` | yes | Resource type (e.g., `logs`, `keys`, `configs`) |
| `action` | yes | Action (e.g., `read`, `write`, `delete`) |
| `resource_id` | no | Specific resource instance |

Returns an `allowed` boolean along with the roles that grant or deny the permission.

---

## Virtual Key Analytics

Each virtual key can be analyzed for usage anomalies. This is useful for detecting abuse patterns or runaway costs.

### Get Key Analytics

```bash
curl "https://api.worldflowai.com/api/v1/virtual-keys/{id}/analytics?period=24h" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Default | Values |
|-----------|---------|--------|
| `period` | `24h` | `1h`, `6h`, `24h`, `7d`, `30d` |

**Response includes:**

| Field | Description |
|-------|-------------|
| `totalRequests` | Request count in the period |
| `totalTokens` | Token count in the period |
| `totalSpendCents` | Spend in USD cents |
| `hourlyBreakdown` | Array of per-hour buckets with `requests`, `tokens`, `spendCents` |
| `anomalies` | Detected anomalies: `spend_spike` (>3x baseline), `request_spike` (>5x baseline), `new_model` |

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "type": "validation_error",
    "message": "Team name is required"
  }
}
```

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, name, etc.) |
