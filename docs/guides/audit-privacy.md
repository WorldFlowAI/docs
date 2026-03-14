---
title: "Audit Logging & Privacy"
description: Query audit events, stream real-time audit data, export compliance reports, and manage GDPR data subject requests in WorldFlow AI.
sidebar_position: 16
---

# Audit Logging & Privacy

WorldFlow AI provides tamper-evident audit logging and a full GDPR privacy toolkit. The audit system records every significant action in the workspace with hash-chain integrity. The privacy system handles consent management, data subject access requests, erasure with cryptographic Merkle proofs, and data portability exports.

## Prerequisites

- A valid JWT token with appropriate permissions (`ViewLogs` for reading, `WriteLogs` for ingestion, `ManageConfig` for privacy operations)
- Base URL for your WorldFlow AI deployment (examples use `https://api.worldflowai.com`)

---

## Audit Logs

### List Audit Logs

Browse paginated audit logs with comprehensive filtering:

```bash
curl "https://api.worldflowai.com/api/v1/audit/logs?eventType=AUTHENTICATION&outcome=FAILURE&page=1&pageSize=50" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | datetime | Start of time range (ISO 8601) |
| `endDate` | datetime | End of time range |
| `eventType` | string | Event type filter (e.g., `AUTHENTICATION`, `CONFIG_CHANGE`) |
| `actorId` | string | Filter by actor/user ID |
| `classification` | string | Data classification level |
| `outcome` | string | Filter: `SUCCESS`, `FAILURE` |
| `resource` | string | Resource type filter |
| `search` | string | Full-text search across log entries |
| `highlight` | boolean | Highlight matching search terms in results |
| `page` / `pageSize` | integer | Pagination (max 1000 per page) |

### Get Audit Log Detail

Retrieve a single audit log entry with full metadata and hash-chain information:

```bash
curl https://api.worldflowai.com/api/v1/audit/logs/{id} \
  -H "Authorization: Bearer $TOKEN"
```

The detail view includes the complete event metadata, actor information, and chain integrity data for tamper detection.

### Export Audit Logs

Export filtered audit logs as a file download:

```bash
curl "https://api.worldflowai.com/api/v1/audit/export?format=csv&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN" \
  -o audit-export.csv
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `format` | yes | `csv` or `pdf` |
| `startDate` / `endDate` | no | Time range filter |
| `eventType` | no | Event type filter |
| `classification` | no | Classification filter |
| `outcome` | no | Outcome filter |

### Ingest External Audit Events

Send external audit events into the WorldFlow AI audit log. This is useful for integrating events from other systems into a single compliance view.

```bash
curl -X POST https://api.worldflowai.com/api/v1/audit/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "EXTERNAL_ACCESS",
    "actorId": "service-account-123",
    "resource": "billing-api",
    "action": "read",
    "outcome": "SUCCESS",
    "metadata": {
      "source": "billing-service",
      "requestId": "req-abc-123"
    }
  }'
```

Requires `WriteLogs` permission.

### Real-Time Audit Stream

Connect to a WebSocket for live audit events:

```
wss://api.worldflowai.com/api/v1/audit/stream?token=YOUR_JWT
```

- Maximum 100 concurrent connections per workspace
- Authenticate via the `token` query parameter
- Supports subscription filtering after connection is established

---

## Privacy & GDPR Compliance

The privacy API implements the core GDPR data subject rights: consent management (Article 7), access (Article 15), erasure with proof (Article 17), and data portability (Article 20).

### Consent Management

#### List Consents

```bash
curl "https://api.worldflowai.com/api/v1/privacy/consent?subjectId=user-123&consentType=DATA_PROCESSING" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Description |
|-----------|-------------|
| `subjectId` | Filter by data subject ID |
| `workspaceId` | Filter by workspace |
| `consentType` | `DATA_PROCESSING`, `MARKETING`, `ANALYTICS`, `THIRD_PARTY_SHARING` |
| `includeRevoked` | Include revoked consents (default: `false`) |

#### Record Consent

```bash
curl -X POST https://api.worldflowai.com/api/v1/privacy/consent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "ws-123",
    "subjectId": "user-456",
    "consentType": "DATA_PROCESSING",
    "consentVersion": "v2.1",
    "granted": true,
    "metadata": {
      "source": "signup-form",
      "ipAddress": "203.0.113.42"
    }
  }'
```

**Consent types:** `DATA_PROCESSING`, `DATA_SHARING`, `MARKETING`, `ANALYTICS`, `AI_TRAINING`

#### Revoke Consent

```bash
curl -X DELETE https://api.worldflowai.com/api/v1/privacy/consent/{id} \
  -H "Authorization: Bearer $TOKEN"
```

Records the revocation timestamp. The consent record itself is retained for audit purposes.

---

### Data Subject Lookup (Article 15)

Retrieve all data held for a specific subject:

```bash
curl "https://api.worldflowai.com/api/v1/privacy/subjects/{subject_id}/data?includeAuditLogs=true&includeCacheEntries=true" \
  -H "Authorization: Bearer $TOKEN"
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `workspaceId` | -- | Scope to a specific workspace |
| `includeAuditLogs` | `true` | Include audit log entries |
| `includeCacheEntries` | `true` | Include cache entries |
| `auditLogLimit` | 100 | Maximum audit logs to return |
| `cacheEntryLimit` | 100 | Maximum cache entries to return |

**Response:**

```json
{
  "subjectId": "user-456",
  "dataFound": true,
  "summary": {
    "auditLogCount": 234,
    "cacheEntryCount": 89,
    "firstSeen": "2024-06-15T08:30:00Z",
    "lastSeen": "2025-01-15T14:22:00Z"
  },
  "auditLogs": [...],
  "cacheEntries": [...]
}
```

---

### Data Export (Article 20)

Export all data for a subject in a portable format:

```bash
curl -X POST https://api.worldflowai.com/api/v1/privacy/subjects/{subject_id}/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "ws-123",
    "format": "json",
    "asyncExport": false
  }'
```

| Field | Default | Description |
|-------|---------|-------------|
| `workspaceId` | -- | Scope the export to one workspace |
| `format` | `json` | Export format (currently `json`) |
| `asyncExport` | `false` | If `true`, runs asynchronously and returns a job ID |

**Response:**

```json
{
  "subjectId": "user-456",
  "exportedAt": "2025-01-15T15:00:00Z",
  "format": "json",
  "auditLogs": [...],
  "cacheEntries": [...],
  "consentRecords": [...],
  "totalSizeBytes": 145832
}
```

---

### Data Erasure with Merkle Proof (Article 17)

Erase all data for a subject. The system generates a Merkle tree over the erased records and returns a cryptographic proof that the erasure was performed completely.

#### Dry Run

Preview what would be erased without deleting anything:

```bash
curl -X POST https://api.worldflowai.com/api/v1/privacy/subjects/{subject_id}/erase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "ws-123",
    "dryRun": true,
    "reason": "GDPR erasure request #2025-0042"
  }'
```

#### Execute Erasure

```bash
curl -X POST https://api.worldflowai.com/api/v1/privacy/subjects/{subject_id}/erase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false,
    "reason": "GDPR erasure request #2025-0042"
  }'
```

**Response:**

```json
{
  "erasureId": "era-uuid-123",
  "subjectId": "user-456",
  "dryRun": false,
  "auditLogsErased": 234,
  "cacheEntriesErased": 89,
  "consentRecordsErased": 3,
  "merkleRoot": "a1b2c3d4e5f6...",
  "signature": "MEUCIQDx...",
  "erasedAt": "2025-01-15T15:05:00Z"
}
```

The `merkleRoot` and `signature` together constitute a cryptographic certificate of erasure. Store the `erasureId` for future verification.

---

### Verify Erasure

After an erasure, verify that it was complete:

```bash
curl https://api.worldflowai.com/api/v1/privacy/erasure/{erasure_id}/verify \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
{
  "erasureId": "era-uuid-123",
  "subjectId": "user-456",
  "verified": true,
  "status": "COMPLETE",
  "merkleRoot": "a1b2c3d4e5f6...",
  "signature": "MEUCIQDx...",
  "remainingRecords": {
    "auditLogs": 0,
    "cacheEntries": 0,
    "consentRecords": 0
  },
  "erasedAt": "2025-01-15T15:05:00Z",
  "certificate": { ... }
}
```

**Verification statuses:**

| Status | Meaning |
|--------|---------|
| `COMPLETE` | All records erased, Merkle proof valid |
| `IN_PROGRESS` | Erasure is still running (async mode) |
| `INCOMPLETE` | Some records remain -- investigate `remainingRecords` |
| `NOT_FOUND` | No erasure record with this ID |

---

## Data Export (Logs & Metrics)

Beyond GDPR subject exports, WorldFlow AI supports bulk export of request logs and system metrics for compliance archival and analytics.

### Export Request Logs

```bash
curl -X POST https://api.worldflowai.com/api/v1/export/logs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "parquet",
    "compression": "gzip",
    "filters": {
      "startDate": "2025-01-01",
      "endDate": "2025-01-31",
      "cacheStatus": "HIT"
    },
    "destination": {
      "type": "s3",
      "s3Config": {
        "bucket": "compliance-exports",
        "prefix": "synapse/logs/",
        "region": "us-east-1"
      }
    }
  }'
```

Formats: `csv`, `json`, `parquet`. Returns synchronously for small exports or `202 Accepted` with a job ID for large datasets.

### Export System Metrics

```bash
curl -X POST https://api.worldflowai.com/api/v1/export/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "filters": {
      "startDate": "2025-01-01",
      "endDate": "2025-01-31",
      "aggregationInterval": "1d"
    }
  }'
```

### Export Job Management

Check the status of an export job:

```bash
curl https://api.worldflowai.com/api/v1/export/jobs/{id} \
  -H "Authorization: Bearer $TOKEN"
```

List all export jobs with filters:

```bash
curl "https://api.worldflowai.com/api/v1/export/jobs?status=completed&jobType=logs" \
  -H "Authorization: Bearer $TOKEN"
```

Cancel a running export:

```bash
curl -X POST https://api.worldflowai.com/api/v1/export/jobs/{id}/cancel \
  -H "Authorization: Bearer $TOKEN"
```

### Scheduled Exports

Create recurring exports for compliance archival:

```bash
curl -X POST https://api.worldflowai.com/api/v1/export/schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Audit Archive",
    "dataType": "logs",
    "format": "parquet",
    "compression": "gzip",
    "frequency": "daily",
    "enabled": true,
    "destination": {
      "type": "s3",
      "s3Config": {
        "bucket": "compliance-exports",
        "prefix": "synapse/daily/",
        "region": "us-east-1"
      }
    }
  }'
```

Manage schedules:

```bash
# List schedules
curl https://api.worldflowai.com/api/v1/export/schedules \
  -H "Authorization: Bearer $TOKEN"

# Update a schedule
curl -X PUT https://api.worldflowai.com/api/v1/export/schedules/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false }'

# Trigger a schedule immediately
curl -X POST https://api.worldflowai.com/api/v1/export/schedules/{id}/run \
  -H "Authorization: Bearer $TOKEN"

# Delete a schedule
curl -X DELETE https://api.worldflowai.com/api/v1/export/schedules/{id} \
  -H "Authorization: Bearer $TOKEN"
```

### Test Export Destination

Validate that an S3 bucket or other destination is reachable before creating a schedule:

```bash
curl -X POST https://api.worldflowai.com/api/v1/export/test-connection \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "s3",
    "s3Config": {
      "bucket": "compliance-exports",
      "region": "us-east-1"
    }
  }'
```

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "type": "not_found",
    "message": "Audit log entry not found"
  }
}
```

| Code | Meaning |
|------|---------|
| 400 | Validation error or invalid format |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Resource not found |
