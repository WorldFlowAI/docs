---
title: "Dashboard Overview"
description: Navigate the WorldFlow AI dashboard -- analytics, model catalog, routing, MCP management, memory, guardrails, logs, export, and user management across 47 pages.
sidebar_position: 17
---

# Dashboard Overview

The WorldFlow AI dashboard is a browser-based control plane for your gateway deployment. It provides real-time visibility into cache performance, cost savings, model routing, MCP server health, audit trails, user management, and GDPR compliance -- all without writing API calls.

This guide describes the major sections, what each page shows, and how to access them.

## Accessing the Dashboard

The dashboard is served at the root URL of your WorldFlow AI deployment (e.g., `https://dashboard.worldflowai.com`). Authentication is handled through the login page, which supports both password-based login and SSO redirect (if configured). After login, a JWT token is stored in `localStorage` and sent automatically with every API call.

---

## Main Analytics

### Dashboard (Home)

The landing page after login. It shows a high-level summary of gateway activity:

- **Total requests** processed in the selected time window
- **Cache hit rate** with a trend sparkline
- **Cost savings** in dollars, calculated from cache hits that avoided upstream LLM calls
- **Latency percentiles** (P50, P95, P99) comparing cached vs. non-cached responses
- **Top models** by request volume and cost

### Cost Optimization

A dedicated analytics page focused on cost reduction. It displays:

- Cost savings over time (daily/weekly/monthly aggregation)
- Savings breakdown by model and provider
- Projected annualized savings based on current hit rates
- Cache efficiency metrics per tenant

### Routing Analytics

Visualizes how the multi-model routing optimizer distributes traffic:

- Request distribution across providers and models
- Cost-per-request comparison between routed and default model selections
- Quality score tracking over time
- Fallback and retry rates

---

## Model & Provider Management

### Model Catalog

A browsable registry of all LLM models available in your workspace. Each model card displays:

- Model name, provider, and family (e.g., GPT-4, Claude 3, Gemini)
- Pricing (input/output cost per 1K tokens)
- Capabilities (chat, tools, vision, streaming, JSON mode)
- Context window size
- Status (available, deprecated, custom)

You can filter by provider type, model type (chat, embedding), family, and status. Custom models can be created, edited, and deleted. The **Sync Models** button fetches the latest model definitions from all integrated providers.

### Integrations

Managed from the Model Catalog page. Each integration stores encrypted API credentials for one provider account. The page lets you:

- Add new integrations (OpenAI, Anthropic, Google, Cohere, custom)
- Verify that an API key is valid
- View masked key values and last-verified timestamps
- Delete unused integrations

### Providers

Provider cards show operational configuration layered on top of integrations:

- Budget limits (monthly cap in cents) and current spend
- Rate limits (requests per minute)
- Priority ranking for routing
- Health status and latency (P50/P99)
- Enable/disable toggle

### Routing Configuration

Configure the multi-model routing strategy:

- Routing mode selection (cost-optimized, quality-optimized, balanced, manual)
- Per-model overrides for quality scores
- Fallback chain ordering
- Budget guardrails

### Quality Profiles

Define quality evaluation profiles that the routing optimizer uses to score model outputs. Profiles include evaluation criteria, scoring weights, and threshold settings.

---

## MCP Management

### MCP Servers

Register and monitor MCP (Model Context Protocol) servers. The page displays:

- Server name, URL, transport type (HTTP, STDIO, SSE), and authentication method
- Health status (PENDING, HEALTHY, DEGRADED, DOWN, DISABLED)
- Latency metrics (P50/P99)
- Last health check timestamp
- Tool count and discovery status

You can add new servers, trigger health checks, run tool discovery, and configure per-tool caching.

### MCP Entities

Browse entity definitions used for cache invalidation. Entities have parent-child hierarchies, and writing to a parent entity invalidates all child caches.

### MCP Analytics

Charts and tables covering:

- Cache hit rate per MCP tool
- Tool invocation volume
- Cache savings from tool result caching
- Invalidation event frequency

---

## Memory & Intelligence

### Memory Explorer

A visual interface for browsing GCC (Global Context Cache) memory entries. Shows stored context segments with their embeddings, similarity scores, and expiration times. Useful for debugging why a cache hit did or did not occur.

### Memory Projects

Manage memory project configurations including branching, milestones, and contributor access.

### Memory Analytics

Charts showing memory usage trends, storage consumption, and retrieval performance.

### Memory Logs

Detailed log of memory operations (reads, writes, evictions) with timing information.

### Intelligence Overview

A summary view of the intelligence subsystem covering content indexing, source management, and search quality metrics.

### Intelligence Sources, Content, Chat, Team, Settings

Pages for managing intelligence data sources, viewing indexed content, interacting through a chat interface, managing team access, and configuring intelligence settings.

---

## Guardrails & Safety

### Guardrails

Configure content filtering and safety controls:

- PII detection rules (email, phone, SSN, credit card, custom patterns)
- Content classification policies
- Blocked topic lists
- Token limit enforcement
- Custom filter rules with regex support

Each guardrail rule can be enabled/disabled individually and tested against sample inputs.

---

## Logs & Observability

### Request Logs

The primary log viewer for gateway traffic. Each row shows:

- Timestamp, request ID, and model
- Cache status (HIT, MISS, BYPASS, PARTIAL)
- Latency (total, cache lookup, LLM call)
- Token counts (prompt, completion)
- Cost in cents

You can filter by date range, status, tier, model, and free-text search. Clicking a row opens the detail view with the full request/response bodies, similarity scores, and metadata.

The **Similar Logs** feature finds semantically related requests for a given log entry, which helps understand cache behavior.

### Audit Logs

A filterable timeline of all administrative actions:

- Event type, actor, timestamp, outcome
- Classification level
- Resource affected
- Full-text search with highlighting

Supports CSV and PDF export for compliance reporting. The detail view includes hash-chain integrity information.

### Alerts

Configure and view alerting rules based on anomaly detection:

- Spend spikes, request volume spikes, error rate increases
- Threshold-based triggers
- Notification channel configuration

---

## Export & Compliance

### Export

Create and manage data exports:

- On-demand log and metrics exports (CSV, JSON, Parquet)
- Scheduled recurring exports (daily, weekly, monthly)
- S3 destination configuration with connection testing
- Export job history with status tracking (pending, running, completed, failed, cancelled)
- Direct file download for completed exports

### Privacy Settings

Configure workspace privacy controls:

- Data retention period (days)
- PII redaction toggle and rule management
- Encryption status overview (algorithm, key rotation info)

### Data Subject Requests

Manage GDPR data subject requests through a dedicated queue:

- Create new requests (ACCESS, ERASURE, PORTABILITY)
- Track request status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- View processing notes and audit trail
- Filter by status, type, and search term

### Encryption Demo

An interactive page demonstrating how WorldFlow AI encrypts data at rest. Shows sample plaintext alongside its encrypted form with algorithm metadata (IV, auth tag, key ID).

---

## User & Access Management

### Users

List, search, and manage workspace users:

- Status filtering (ACTIVE, SUSPENDED)
- Email and name search
- User detail view with SSO integration fields
- Suspend and delete actions

### Roles

View and manage RBAC roles:

- System roles (read-only) and custom roles
- Permission list per role
- Create, edit, and delete custom roles

### Permission Audit

Inspect the effective permissions for any user:

- Permission tree view showing all roles and their granted permissions
- Single permission check tool (user + resource + action)
- Visual inheritance display

### RBAC Demo

An interactive page for testing RBAC behavior against the live permission system.

### SSO Configuration

Configure and manage SSO connections:

- Create OIDC or SAML connections
- Domain management with verification status
- Test and activate/deactivate connections
- JIT provisioning settings

### SCIM Dashboard

Monitor SCIM provisioning:

- Token management (create, revoke, delete)
- Activity log with operation/resource/status filtering
- Sync statistics (users, groups, error rates)

---

## Configuration

### Gateway Configs

Version-controlled backend configuration management:

- View current active configuration
- Create new config versions
- Validate configuration before applying
- Activate a specific version
- View version history
- Rollback to a previous version

### Thresholds

Cache similarity threshold tuning:

- Global threshold settings (cache hit, partial hit)
- Per-tenant overrides
- Threshold simulator showing projected impact on hit rate and savings

### Virtual Keys

Manage Synapse-issued virtual keys for usage tracking and rate limiting:

- Create, update, rotate, and revoke keys
- Usage statistics with date range and granularity controls
- Per-key analytics with anomaly detection
- Team assignment

### API Keys

Manage encrypted provider API keys:

- Add, rotate, and delete provider keys
- View masked key values
- Key validation status

### Rate Limits

Configure rate limiting tiers:

- Tier definitions (requests per minute/hour, token limits)
- Tenant-to-tier mapping
- Current usage vs. limit visualization

---

## Additional Pages

### Playground

Test cache behavior interactively:

- Send prompts and see whether they hit the cache
- Preview similarity scores against existing cache entries
- Test query variations to understand threshold sensitivity

### Prompts

Manage prompt templates with version control:

- Create and edit templates with variable extraction
- Version history and rollback
- Template execution testing

### Content Bucket & Editor

Manage content collections and edit individual content items. Used with the intelligence and memory subsystems.

### Fine-tune

Configure and monitor model fine-tuning jobs.

### Modules

Enable and disable optional gateway modules (feature flags for subsystems like guardrails, routing optimizer, SCIM, etc.).

---

## Navigation Tips

- The left sidebar organizes pages into logical groups: Analytics, Models, MCP, Memory, Intelligence, Security, Compliance, and Settings
- Most list pages support URL query parameters for deep-linking to filtered views
- The top bar shows the current workspace name and the logged-in user
- Real-time data (audit stream, health checks) refreshes automatically without page reload

---

## Error Handling

Dashboard API errors are displayed as toast notifications with the error type and message. All API calls use the same error format as the REST API:

```json
{
  "error": {
    "type": "forbidden",
    "message": "You do not have permission to access this resource"
  }
}
```

If your session expires, you are redirected to the login page automatically.
