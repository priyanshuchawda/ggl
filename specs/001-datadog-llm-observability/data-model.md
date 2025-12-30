# Data Model: Datadog LLM Observability Platform

**Date**: 2025-12-30  
**Purpose**: Define data structures and relationships for telemetry, conversations, and monitoring

---

## Core Entities

### 1. LLM Telemetry Event

Represents a single captured metric or log entry from an LLM interaction.

**Fields**:
- `requestId` (string, UUID): Unique identifier for this request
- `timestamp` (number, Unix epoch ms): When the event occurred
- `conversationId` (string, UUID): Session identifier for multi-turn conversations
- `userId` (string, optional): Identifier for the user making the request
- `featureType` (enum): Which feature generated this event
  - Values: `chat`, `grounding`, `url_context`, `structured_output`, `streaming`
- `model` (string): Gemini model used (e.g., `gemini-2.5-flash`)
- `temperature` (number, 0.0-2.0): Model temperature setting
- `thinkingBudget` (number, optional): Thinking budget if configured

**Token Metrics**:
- `promptTokenCount` (number): Input tokens consumed
- `candidatesTokenCount` (number): Output tokens generated
- `thoughtsTokenCount` (number): Thinking tokens used (if thinking enabled)
- `toolUsePromptTokenCount` (number): Tokens used for tool calls
- `totalTokenCount` (number): Sum of all token types

**Performance Metrics**:
- `latencyMs` (number): Total request duration in milliseconds
- `timeToFirstTokenMs` (number, optional): Latency until first streaming token (if streaming)
- `streaming` (boolean): Whether response was streamed

**Tool Usage**:
- `toolsUsed` (array of strings): Which tools were invoked
  - Values: `googleSearch`, `urlContext`, `codeExecution`
- `groundingUsed` (boolean): Whether search grounding was employed
- `urlsProvided` (array of strings, optional): URLs passed for context

**Outcome**:
- `success` (boolean): Whether request completed successfully
- `errorCode` (string, optional): Error code if failed (e.g., `RATE_LIMIT`, `TIMEOUT`, `INVALID_REQUEST`)
- `errorMessage` (string, optional): Human-readable error description

**Cost Tracking**:
- `inputCost` (number): Cost for input tokens (USD)
- `outputCost` (number): Cost for output tokens (USD)
- `thinkingCost` (number): Cost for thinking tokens (USD)
- `toolCost` (number): Cost for tool usage (USD)
- `totalCost` (number): Total cost for this request (USD)

**Validation** (if structured output):
- `schemaValidation` (object, optional):
  - `passed` (boolean): Whether output matched schema
  - `schemaName` (string): Name of the schema used
  - `errors` (array of objects): Validation errors if any
    - `field` (string): Field path that failed
    - `message` (string): Error description

**Security Signals**:
- `securityAlerts` (array of objects, optional): Detected security issues
  - `type` (enum): Alert type (`prompt_injection`, `pii_detected`, `rate_limit_violation`)
  - `severity` (enum): `critical`, `high`, `medium`, `low`
  - `details` (string): Additional context

**Tags** (for Datadog grouping):
- `env` (string): Environment (e.g., `prod`, `dev`)
- `version` (string): Application version
- `host` (string): Server hostname

**Relationships**:
- Belongs to one `Conversation` (via `conversationId`)
- May trigger multiple `DetectionRuleEvaluation` records
- May be included in multiple `DashboardQuery` results

---

### 2. Conversation

Represents a multi-turn interaction session with the LLM.

**Fields**:
- `conversationId` (string, UUID): Unique session identifier
- `userId` (string, optional): User who owns this conversation
- `startedAt` (number, Unix epoch ms): When conversation began
- `endedAt` (number, Unix epoch ms, optional): When conversation completed
- `turnCount` (number): Number of turns (user messages + model responses)
- `totalTokens` (number): Cumulative tokens across all turns
- `totalCost` (number): Cumulative cost across all turns (USD)
- `featureFlags` (array of strings): Which features were used
- `averageLatencyMs` (number): Mean latency across turns
- `errorCount` (number): How many turns resulted in errors

**State**:
- `status` (enum): Current conversation state
  - Values: `active`, `completed`, `abandoned`, `error`

**Relationships**:
- Has many `LLMTelemetryEvent` records (via `conversationId`)
- May appear in `CostAnalysis` aggregations

**State Transitions**:
```
[new] → active (first turn received)
active → completed (explicit end signal)
active → abandoned (no activity for 30 minutes)
active → error (unrecoverable failure)
```

---

### 3. Detection Rule

Represents a configured monitoring rule for alerting.

**Fields**:
- `ruleId` (string, UUID): Unique identifier for this rule
- `ruleName` (string): Human-readable name (e.g., "LLM Latency Spike")
- `enabled` (boolean): Whether rule is active
- `severity` (enum): Alert severity level
  - Values: `critical`, `high`, `medium`, `low`

**Condition**:
- `metricName` (string): Which metric to evaluate (e.g., `llm.latency.p95`)
- `operator` (enum): Comparison operator
  - Values: `>`, `<`, `>=`, `<=`, `==`, `!=`
- `threshold` (number): Value to compare against
- `timeWindowMinutes` (number): Evaluation window duration
- `aggregation` (enum): How to aggregate metric
  - Values: `avg`, `sum`, `min`, `max`, `p50`, `p95`, `p99`, `count`

**Composite Conditions** (optional):
- `compositeRules` (array of objects): Multiple conditions to combine
  - `logicOperator` (enum): `AND`, `OR`
  - `conditions` (array): List of condition objects

**Actions**:
- `actionType` (enum): What to do when triggered
  - Values: `create_incident`, `create_case`, `send_alert`
- `notificationChannels` (array of strings): Where to send alerts
  - Values: `email`, `slack`, `pagerduty`, `webhook`
- `includeContext` (boolean): Whether to attach triggering event details
- `escalationPolicy` (string, optional): Reference to escalation config

**Example Configurations**:

#### Critical: Error Rate Threshold
```json
{
  "ruleId": "rule-001",
  "ruleName": "Error Rate Critical",
  "severity": "critical",
  "condition": {
    "metricName": "llm.error_rate",
    "operator": ">",
    "threshold": 5,
    "timeWindowMinutes": 5,
    "aggregation": "avg"
  },
  "actionType": "create_incident",
  "notificationChannels": ["pagerduty", "slack"]
}
```

#### High: Performance Degradation
```json
{
  "ruleId": "rule-002",
  "ruleName": "LLM Latency Spike",
  "severity": "high",
  "compositeRules": {
    "logicOperator": "AND",
    "conditions": [
      {
        "metricName": "llm.latency.p95",
        "operator": ">",
        "threshold": 5000,
        "timeWindowMinutes": 5
      },
      {
        "metricName": "llm.request_volume",
        "operator": ">",
        "threshold": 10,
        "timeWindowMinutes": 5
      }
    ]
  },
  "actionType": "create_case"
}
```

**Relationships**:
- Evaluates `LLMTelemetryEvent` records
- Creates `Incident`, `Case`, or `Alert` when triggered

---

### 4. Incident

Represents a critical issue requiring immediate attention.

**Fields**:
- `incidentId` (string, UUID): Unique identifier
- `title` (string): Brief description (e.g., "Error Rate Exceeded 5%")
- `severity` (enum): `critical`, `high`
- `status` (enum): Current incident state
  - Values: `open`, `investigating`, `resolved`, `false_positive`
- `createdAt` (number, Unix epoch ms): When incident was created
- `resolvedAt` (number, Unix epoch ms, optional): When incident was closed
- `assignedTo` (string, optional): Engineer handling the incident

**Trigger Context**:
- `triggeringRuleId` (string): Which detection rule fired
- `triggeringEventIds` (array of strings): Event IDs that caused the trigger
- `affectedUsers` (array of strings): User IDs impacted
- `systemState` (object): Snapshot of key metrics at trigger time
  - `requestVolume` (number): Requests/minute when triggered
  - `errorRate` (number): Error rate percentage
  - `averageLatency` (number): Average latency in ms

**Investigation Data**:
- `promptSample` (string): Example prompt that triggered issue (first 200 chars)
- `errorDetails` (object): Structured error information
- `suggestedRemediation` (string): Auto-generated suggestions
  - Example: "Check Gemini API status. Review recent model deployments."

**Relationships**:
- Triggered by one `DetectionRule`
- References multiple `LLMTelemetryEvent` records
- May have associated `CaseNote` records (investigation updates)

---

### 5. Case

Represents a high-priority issue requiring investigation (less urgent than incident).

**Fields**:
- `caseId` (string, UUID): Unique identifier
- `title` (string): Brief description
- `priority` (enum): `high`, `medium`
- `status` (enum): `open`, `in_progress`, `resolved`, `wont_fix`
- `createdAt` (number, Unix epoch ms)
- `closedAt` (number, Unix epoch ms, optional)

**Context** (similar structure to Incident but less urgent):
- `triggeringRuleId` (string)
- `diagnosticInfo` (object): Relevant metrics and logs

**Example Use Cases**:
- Cost anomaly detected (medium priority)
- Latency degradation (high priority but not critical)
- Quality issues (validation failures increasing)

**Relationships**:
- Similar to `Incident` but lower severity

---

### 6. Alert

Represents a medium/low priority notification.

**Fields**:
- `alertId` (string, UUID): Unique identifier
- `message` (string): Alert content
- `priority` (enum): `medium`, `low`
- `sentAt` (number, Unix epoch ms)
- `channel` (enum): Where sent (`email`, `slack`)
- `acknowledged` (boolean): Whether someone acknowledged it

**Example Use Cases**:
- Informational notifications (quality trend changes)
- Non-critical threshold breaches
- Periodic health summaries

---

### 7. Dashboard Widget

Represents a visualization component in the Datadog dashboard.

**Fields**:
- `widgetId` (string): Unique identifier
- `widgetType` (enum): Type of visualization
  - Values: `timeseries`, `counter`, `bar_chart`, `pie_chart`, `heatmap`, `top_list`, `event_stream`
- `title` (string): Widget display name
- `position` (object): Layout positioning
  - `x` (number), `y` (number), `width` (number), `height` (number)

**Query Configuration**:
- `metricQuery` (string): Datadog query syntax
  - Example: `avg:llm.latency{env:prod} by {model}`
- `timeRange` (string): Time window (e.g., `last_4h`, `last_24h`, `last_7d`)
- `groupBy` (array of strings): Dimensions to group by (e.g., `['model', 'feature']`)

**Display Options**:
- `displayType` (enum): Visualization style
  - Values: `line`, `area`, `bars`, `stacked`
- `colorPalette` (string): Color scheme (e.g., `dog_classic`, `cool`, `warm`)
- `showLegend` (boolean): Whether to display legend

**Example Configurations**:

#### Latency Timeseries
```json
{
  "widgetId": "widget-latency-ts",
  "widgetType": "timeseries",
  "title": "Response Latency (P95)",
  "metricQuery": "avg:llm.latency.p95{env:prod} by {model}",
  "timeRange": "last_4h",
  "displayType": "line",
  "showLegend": true
}
```

#### Cost Breakdown Pie Chart
```json
{
  "widgetId": "widget-cost-pie",
  "widgetType": "pie_chart",
  "title": "Cost by Feature",
  "metricQuery": "sum:llm.cost.total{env:prod} by {feature}",
  "timeRange": "last_24h"
}
```

**Relationships**:
- Queries `LLMTelemetryEvent` aggregations via Datadog
- Grouped into sections within the Dashboard

---

## Data Validation Rules

### LLM Telemetry Event
- `requestId` must be unique
- `timestamp` must be within last 24 hours (reject stale data)
- `totalTokenCount` must equal sum of individual token counts
- `totalCost` must equal sum of individual cost components
- `latencyMs` must be positive
- `errorCode` required if `success = false`
- `schemaValidation` only present if `featureType = structured_output`

### Conversation
- `conversationId` must be unique
- `turnCount` must be >= 1
- `totalTokens` must equal sum of all related `LLMTelemetryEvent.totalTokenCount`
- `endedAt` must be >= `startedAt` (if present)
- Cannot transition from `completed` or `error` back to `active`

### Detection Rule
- `threshold` must be positive for count/latency metrics
- `threshold` must be 0-100 for percentage metrics (error rates)
- `timeWindowMinutes` must be between 1 and 1440 (24 hours)
- `compositeRules.conditions` must have at least 2 conditions if used
- `actionType = create_incident` only allowed for `severity = critical` or `high`

### Incident / Case
- `resolvedAt` must be >= `createdAt` (if present)
- `severity = critical` only allowed for Incident (not Case)
- `assignedTo` must reference valid user (if present)
- `promptSample` must be truncated to 200 characters max (privacy)

---

## Aggregation Views (for Queries)

### Cost Analysis View
Pre-aggregated for dashboard queries:
```typescript
interface CostAnalysisView {
  timeRange: string; // e.g., "2025-12-30T06:00:00Z to 2025-12-30T07:00:00Z"
  totalCost: number;
  costByFeature: { [feature: string]: number };
  costByModel: { [model: string]: number };
  topConversations: Array<{
    conversationId: string;
    cost: number;
    turnCount: number;
  }>;
  averageCostPerRequest: number;
}
```

### Performance Summary View
```typescript
interface PerformanceSummaryView {
  timeRange: string;
  requestCount: number;
  successRate: number; // percentage
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  latencyByModel: { [model: string]: { p50: number; p95: number; p99: number } };
  tokenThroughput: number; // tokens per minute
}
```

### Security Summary View
```typescript
interface SecuritySummaryView {
  timeRange: string;
  promptInjectionCount: number;
  piiDetectionCount: number;
  rateLimitViolationCount: number;
  recentAlerts: Array<{
    timestamp: number;
    type: string;
    severity: string;
    summary: string;
  }>;
}
```

---

## Storage Considerations

### Datadog Storage
- All telemetry events stored in Datadog APM (traces + metrics)
- Raw telemetry: 7-day retention
- Aggregated metrics: 90-day retention (per FR-021, FR-022)
- Logs: Separate log pipeline with JSON formatting

### Application Memory
- `TelemetryBuffer`: In-memory queue (max 10MB)
- `ConversationTracker`: Active sessions map (expire after 30 min idle)
- No persistent database required (Datadog is the database)

### Datadog Query Patterns
```typescript
// Example: Get P95 latency over last hour
const query = 'avg(last_1h):p95:llm.latency{env:prod} by {model}';

// Example: Count errors by type
const query = 'sum(last_5m):llm.errors{*} by {error_code}.as_count()';

// Example: Cost breakdown by feature
const query = 'sum(last_24h):llm.cost.total{*} by {feature}';
```

---

## Schema Evolution Strategy

### Versioning
- Include `schemaVersion` field in all events
- Current version: `1.0.0`
- Increment on breaking changes

### Backward Compatibility
- Additive changes only (new optional fields)
- Deprecated fields kept for 90 days (one retention cycle)
- Migration scripts for Datadog dashboards when queries change

### Example Migration
```typescript
// Version 1.0.0 → 1.1.0: Add thinkingBudget field
interface LLMTelemetryEvent_v1_1 extends LLMTelemetryEvent_v1_0 {
  schemaVersion: '1.1.0';
  thinkingBudget?: number; // New optional field
}

// Queries remain compatible (optional fields ignored in aggregations)
```

---

## Data Model Summary

**Total Entities**: 7 core entities + 3 aggregation views

**Relationships**:
- 1 Conversation → many LLMTelemetryEvents
- 1 DetectionRule → many evaluations → may create Incident/Case/Alert
- LLMTelemetryEvents → aggregated into Views → rendered in DashboardWidgets

**Storage**: Primarily Datadog cloud storage, minimal application state

**Validation**: Strong typing via TypeScript, Zod schemas for runtime checks

**Evolution**: Versioned schemas with backward compatibility guarantees

---

**Next Steps**: Create API contracts (OpenAPI spec) and quickstart guide.
