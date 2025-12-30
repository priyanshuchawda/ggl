# Research Findings: Datadog LLM Observability Platform

**Date**: 2025-12-30  
**Purpose**: Document technology choices and patterns for implementation

---

## 1. Gemini API Best Practices for Telemetry

### Decision
Capture telemetry using response metadata and custom wrapper middleware around the `@google/genai` SDK.

### Rationale
- Gemini responses include `usageMetadata` with token counts (prompt, candidates, thoughts, tool use)
- Response objects provide `candidates[0].groundingMetadata` for grounding citations
- Streaming responses emit chunks that must be aggregated for complete metrics
- No native telemetry export, requiring custom instrumentation

### Implementation Pattern
```typescript
interface LLMTelemetry {
  requestId: string;
  timestamp: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  thinkingTokens: number;
  toolUseTokens: number;
  totalTokens: number;
  latencyMs: number;
  streaming: boolean;
  toolsUsed: string[]; // ['googleSearch', 'urlContext']
  groundingUsed: boolean;
  success: boolean;
  errorCode?: string;
}
```

### Alternatives Considered
- **Proxy pattern**: Intercept all SDK calls - rejected due to complexity and SDK updates breaking proxy
- **Event emitters**: Require SDK modification - not feasible with external package
- **Selected**: Wrapper functions around SDK methods - balance of control and maintainability

### Key Insights from gemini.md
- `response.usageMetadata` provides token breakdown
- `response.candidates[0].groundingMetadata` indicates search grounding usage
- Streaming: accumulate chunks, emit telemetry after final chunk
- Cost calculation: Different rates for input/output tokens (refer to Gemini pricing)

---

## 2. Datadog APM Integration Patterns

### Decision
Use `dd-trace` automatic instrumentation plus custom spans for LLM-specific operations.

### Rationale
- `dd-trace` automatically instruments HTTP, Express, and common libraries
- Custom spans allow tagging LLM-specific metadata (model, tokens, cost)
- Manual metric emission via `dogstatsd` for business metrics (cost per conversation)
- Unified correlation: logs, traces, and metrics linked via trace ID

### Implementation Pattern
```typescript
import tracer from 'dd-trace';

// Initialize at app startup
tracer.init({
  service: 'llm-observability-demo',
  env: process.env.NODE_ENV,
  logInjection: true, // Correlate logs with traces
});

// Custom span for LLM calls
const span = tracer.startSpan('llm.generate', {
  tags: {
    'llm.model': 'gemini-2.5-flash',
    'llm.feature': 'customer-support-chat',
    'llm.streaming': true,
  }
});

try {
  const response = await geminiClient.generate(prompt);
  
  span.setTag('llm.prompt_tokens', response.usageMetadata.promptTokenCount);
  span.setTag('llm.completion_tokens', response.usageMetadata.candidatesTokenCount);
  span.setTag('llm.total_cost', calculateCost(response.usageMetadata));
  
  tracer.dogstatsd.histogram('llm.tokens.total', response.usageMetadata.totalTokenCount);
  tracer.dogstatsd.increment('llm.requests.success');
} catch (error) {
  span.setTag('error', true);
  span.setTag('error.message', error.message);
  tracer.dogstatsd.increment('llm.requests.error');
} finally {
  span.finish();
}
```

### Alternatives Considered
- **Custom APM**: Build from scratch - rejected due to time constraints and lack of Datadog UI
- **OpenTelemetry**: More portable but requires Datadog exporter config - added complexity
- **Selected**: dd-trace native - best Datadog integration, automatic correlation

### Best Practices
- Tag spans with business context (user ID, conversation ID, feature)
- Use histograms for token counts (capture distribution, not just avg)
- Increment counters for success/error tracking
- Enable log injection to correlate logs with traces

---

## 3. Detection Rule Design Patterns

### Decision
Implement multi-threshold detection with sliding time windows and composite conditions.

### Rationale
- Single threshold rules produce false positives (temporary spikes)
- Sliding windows (5min, 15min) smooth out noise
- Composite conditions (high latency AND high error rate) reduce alert fatigue
- Severity levels (critical/high/medium) enable appropriate response actions

### Detection Rules Catalog

| Rule Name | Condition | Time Window | Severity | Action |
|-----------|-----------|-------------|----------|--------|
| LLM Latency Spike | p95 latency > 5s | 5 min | High | Create Case |
| Error Rate Critical | error_rate > 5% | 5 min | Critical | Create Incident |
| Cost Anomaly | hourly_cost > 1.5x baseline | 1 hour | Medium | Send Alert |
| Token Exhaustion | tokens_per_minute > 100k | 5 min | High | Create Case |
| Security: Injection Pattern | prompt matches injection regex | Real-time | Critical | Create Incident |
| Quality: Schema Failures | validation_failures > 10 | 15 min | Medium | Send Alert |
| Rate Limit Abuse | requests_per_user > 100 | 1 min | High | Create Case |
| Grounding Failure | grounding_error_rate > 10% | 10 min | Medium | Send Alert |

### Implementation Pattern (Datadog Monitor API)
```json
{
  "name": "LLM Latency Spike",
  "type": "metric alert",
  "query": "avg(last_5m):p95:llm.latency{env:prod} > 5000",
  "message": "LLM response latency exceeded 5s threshold. @pagerduty-llm-team",
  "tags": ["service:llm", "severity:high"],
  "priority": 2,
  "options": {
    "thresholds": {
      "critical": 5000,
      "warning": 3000
    },
    "notify_no_data": true,
    "no_data_timeframe": 10,
    "renotify_interval": 60
  }
}
```

### Alternatives Considered
- **Anomaly detection**: ML-based thresholds - rejected for MVP due to requiring baseline data
- **Static thresholds**: Simple but brittle - enhanced with time windows for robustness
- **Selected**: Multi-threshold with time windows - balance of accuracy and simplicity

---

## 4. Telemetry Buffer Implementation

### Decision
In-memory circular buffer with 10MB cap and exponential backoff retry.

### Rationale
- Datadog API failures shouldn't cause telemetry data loss
- Circular buffer drops oldest events when full (preserve recent data)
- Exponential backoff prevents overwhelming Datadog during recovery
- In-memory only (no disk persistence) keeps deployment simple

### Implementation Pattern
```typescript
class TelemetryBuffer {
  private buffer: LLMTelemetry[] = [];
  private readonly maxSizeMB = 10;
  private readonly maxRetries = 5;
  private retryCount = 0;
  private retryDelay = 1000; // Start at 1s

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    try {
      await datadogClient.sendMetrics(this.buffer);
      this.buffer = [];
      this.retryCount = 0;
      this.retryDelay = 1000;
    } catch (error) {
      this.retryCount++;
      
      if (this.retryCount >= this.maxRetries) {
        console.error('Max retries exceeded, dropping oldest events');
        this.buffer = this.buffer.slice(-Math.floor(this.buffer.length / 2));
        this.retryCount = 0;
      }
      
      this.retryDelay = Math.min(this.retryDelay * 2, 60000); // Cap at 60s
      setTimeout(() => this.flush(), this.retryDelay);
    }
  }

  add(event: LLMTelemetry): void {
    this.buffer.push(event);
    
    const sizeBytes = JSON.stringify(this.buffer).length;
    const sizeMB = sizeBytes / (1024 * 1024);
    
    if (sizeMB > this.maxSizeMB) {
      const dropCount = Math.ceil(this.buffer.length * 0.2); // Drop 20%
      this.buffer = this.buffer.slice(dropCount);
      console.warn(`Buffer overflow: dropped ${dropCount} oldest events`);
    }
  }
}
```

### Alternatives Considered
- **Redis buffer**: Persistent but requires infrastructure - rejected for simplicity
- **File-based queue**: Disk I/O overhead and complexity - rejected for hackathon scope
- **Selected**: In-memory circular buffer - simple, fast, sufficient for demo scale

---

## 5. Cost Tracking Architecture

### Decision
Calculate costs in real-time using token counts and model-specific pricing, attribute to conversations via session ID.

### Rationale
- Gemini API doesn't provide cost data, must calculate from token counts
- Different token types have different costs (input/output/thinking)
- Conversation-level tracking requires session management
- Feature attribution via tags (e.g., `feature:chat`, `feature:grounding`)

### Pricing Reference (from Gemini API docs)
| Model | Input | Output | Thinking | Grounding Search |
|-------|-------|--------|----------|------------------|
| gemini-2.5-flash | $0.075/1M | $0.30/1M | $0.30/1M | Free until Jan 5, 2026 |

### Implementation Pattern
```typescript
interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  thinkingCost: number;
  toolCost: number;
  totalCost: number;
}

function calculateCost(usage: UsageMetadata, model: string): CostBreakdown {
  const pricing = MODEL_PRICING[model];
  
  return {
    inputCost: (usage.promptTokenCount / 1_000_000) * pricing.input,
    outputCost: (usage.candidatesTokenCount / 1_000_000) * pricing.output,
    thinkingCost: (usage.thoughtsTokenCount / 1_000_000) * pricing.thinking,
    toolCost: (usage.toolUsePromptTokenCount / 1_000_000) * pricing.tool,
    totalCost: /* sum of above */
  };
}

// Track per conversation
class ConversationTracker {
  private sessions = new Map<string, ConversationMetrics>();
  
  recordTurn(sessionId: string, cost: CostBreakdown, tokens: number) {
    const session = this.sessions.get(sessionId) || { 
      turns: 0, 
      totalCost: 0, 
      totalTokens: 0,
      features: new Set()
    };
    
    session.turns++;
    session.totalCost += cost.totalCost;
    session.totalTokens += tokens;
    
    this.sessions.set(sessionId, session);
    
    // Emit to Datadog
    tracer.dogstatsd.histogram('llm.conversation.cost', cost.totalCost, {
      tags: [`session:${sessionId}`]
    });
  }
}
```

### Alternatives Considered
- **Query billing API**: Google Cloud billing APIs have delays - not real-time
- **Estimate only**: Lacks accuracy for optimization - rejected
- **Selected**: Real-time calculation from token counts - accurate and immediate

---

## 6. Structured Output Validation Monitoring

### Decision
Wrap Zod validation with telemetry capture, emit metrics on validation failures.

### Rationale
- Structured outputs use Zod schemas for validation (per gemini.md examples)
- Validation failures indicate LLM quality issues
- Track failure patterns (which fields, which schemas) for debugging
- Performance impact minimal (validation is synchronous and fast)

### Implementation Pattern
```typescript
import { z } from 'zod';

function validateWithTelemetry<T>(
  schema: z.ZodSchema<T>, 
  data: unknown,
  context: { model: string; prompt: string }
): { success: boolean; data?: T; errors?: z.ZodError } {
  
  const startTime = Date.now();
  const result = schema.safeParse(data);
  const latency = Date.now() - startTime;
  
  tracer.dogstatsd.histogram('llm.validation.latency', latency);
  
  if (result.success) {
    tracer.dogstatsd.increment('llm.validation.success');
    return { success: true, data: result.data };
  } else {
    tracer.dogstatsd.increment('llm.validation.failure');
    
    // Emit detailed error info
    result.error.errors.forEach(err => {
      tracer.dogstatsd.increment('llm.validation.failure_by_field', {
        tags: [`field:${err.path.join('.')}`]
      });
    });
    
    // Log for investigation
    console.error('Schema validation failed', {
      model: context.model,
      promptPreview: context.prompt.slice(0, 100),
      errors: result.error.errors,
      rawData: data
    });
    
    return { success: false, errors: result.error };
  }
}
```

### Alternatives Considered
- **Skip validation monitoring**: Lose visibility into quality - rejected
- **Batch analysis**: Delayed insights - rejected for real-time needs
- **Selected**: Inline validation with telemetry - immediate feedback, low overhead

---

## 7. Security Pattern Detection

### Decision
Regex-based prompt injection detection + PII redaction library for real-time analysis.

### Rationale
- Real-time detection required for immediate alerting (per FR-026, FR-028)
- Regex patterns catch common injection attempts (e.g., `ignore previous instructions`)
- PII detection via regex for structured data (SSN, phone, email)
- Lightweight enough for synchronous execution in request path

### Prompt Injection Patterns
```typescript
const INJECTION_PATTERNS = [
  /ignore (previous|all) (instructions|prompts)/i,
  /system:?\s*(you are|new instructions)/i,
  /\[INST\].*\[\/INST\]/i, // Llama-style injection
  /disregard (above|previous|any)/i,
  /<\|im_start\|>system/i, // ChatML injection
  /forget (everything|all|previous)/i,
];

const PII_PATTERNS = {
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
};

function detectSecurityIssues(text: string): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];
  
  // Check injection patterns
  INJECTION_PATTERNS.forEach((pattern, idx) => {
    if (pattern.test(text)) {
      alerts.push({
        type: 'prompt_injection',
        severity: 'critical',
        pattern: pattern.source,
        match: text.match(pattern)?.[0]
      });
    }
  });
  
  // Check PII patterns
  Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
    if (pattern.test(text)) {
      alerts.push({
        type: 'pii_detected',
        severity: 'high',
        piiType: type,
        redactedText: text.replace(pattern, '[REDACTED]')
      });
    }
  });
  
  return alerts;
}
```

### Alternatives Considered
- **ML-based detection**: Higher accuracy but requires model deployment - deferred for post-MVP
- **Third-party API**: Latency and cost overhead - rejected for demo
- **Selected**: Regex patterns - fast, deterministic, good enough for common cases

### PII Redaction Strategy
- Detect PII in prompts and responses before logging
- Replace with `[REDACTED:{type}]` placeholders
- Preserve enough context for debugging (e.g., "User asked about [REDACTED:EMAIL]")
- Original data not stored in Datadog logs (FR-026 compliance)

---

## 8. Dashboard Layout Best Practices

### Decision
Create a single comprehensive dashboard with 4 sections: Overview, LLM Performance, Cost Analysis, Security & Quality.

### Rationale
- Single dashboard provides holistic view (meets FR-006, FR-007, FR-008)
- Logical grouping reduces cognitive load
- 10-15 widgets target aligns with best practices (not overwhelming)
- Datadog API allows programmatic dashboard creation (infrastructure-as-code)

### Dashboard Widget Layout

#### Section 1: Overview (Top Row)
| Widget Type | Metric | Purpose |
|-------------|--------|---------|
| Counter | Total Requests (24h) | Traffic volume at a glance |
| Counter | Success Rate (24h) | Overall health indicator |
| Counter | Current Error Rate | Real-time health check |
| Timeseries | Request Volume | Traffic patterns over time |

#### Section 2: LLM Performance (Middle Left)
| Widget Type | Metric | Purpose |
|-------------|--------|---------|
| Timeseries | P50/P95/P99 Latency | Performance distribution |
| Heatmap | Latency by Model | Identify slow models |
| Bar Chart | Requests by Feature | Feature usage breakdown |
| Timeseries | Token Throughput | Tokens/minute trend |

#### Section 3: Cost Analysis (Middle Right)
| Widget Type | Metric | Purpose |
|-------------|--------|---------|
| Timeseries | Hourly Cost | Spend trend |
| Pie Chart | Cost by Feature | Where money goes |
| Top List | Most Expensive Conversations | Optimization targets |
| Timeseries | Cost per Conversation | Efficiency metric |

#### Section 4: Security & Quality (Bottom Row)
| Widget Type | Metric | Purpose |
|-------------|--------|---------|
| Event Stream | Security Alerts | Real-time threat feed |
| Counter | Schema Validation Failures | Quality indicator |
| Timeseries | PII Detection Events | Compliance monitoring |
| Bar Chart | Error Types | Error distribution |

### Dashboard Creation Pattern (Datadog API)
```typescript
import { DashboardsApi } from '@datadog/datadog-api-client';

const dashboardConfig = {
  title: 'LLM Observability - Gemini + Datadog',
  layout_type: 'ordered',
  widgets: [
    {
      definition: {
        type: 'timeseries',
        requests: [{
          q: 'avg:llm.latency{*} by {model}',
          display_type: 'line',
          style: { palette: 'dog_classic' }
        }],
        title: 'Latency by Model (P95)',
        show_legend: true
      }
    },
    // ... more widgets
  ]
};

await dashboardsApi.createDashboard({ body: dashboardConfig });
```

### Alternatives Considered
- **Multiple dashboards**: Separate for each concern - rejected for demo simplicity
- **Pre-built Datadog templates**: Generic, not LLM-specific - customization needed
- **Selected**: Single comprehensive dashboard - complete story in one view

### Query Optimization
- Use `avg:` and `sum:` aggregators for efficiency
- Limit time ranges to reduce query cost (default to last 4 hours)
- Use `by {tag}` for grouping instead of multiple queries
- Cache dashboard JSON for version control

---

## Technology Stack Summary

### Core Technologies (Final Selections)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Runtime | Node.js | 20.x LTS | Stable, excellent async support for LLM I/O |
| Language | TypeScript | 5.3+ | Type safety for schema definitions, better DX |
| LLM SDK | @google/genai | Latest | Official Gemini SDK, supports all features |
| APM | dd-trace | Latest | Native Datadog APM for Node.js |
| Validation | Zod | Latest | Schema validation for structured outputs |
| Web Framework | Express | 4.x | Simple, well-integrated with dd-trace |
| Testing | Jest + Supertest | Latest | Industry standard for Node.js |
| Deployment | Docker | Latest | Portable, easy Cloud Run deployment |

### Configuration Management
- Environment variables for secrets (API keys)
- JSON files for Datadog resources (dashboards, monitors)
- TypeScript config for type safety
- Docker Compose for local development

### Development Workflow
1. Local development: `npm run dev` (with hot reload)
2. Testing: `npm test` (Jest with coverage)
3. Deployment: `docker build` → push to registry → deploy to Cloud Run
4. Demo: Use provided test script to generate realistic traffic

---

## Open Questions (for Implementation Phase)

1. **Demo Scenario Design**: What specific customer support queries best showcase telemetry variety?
   - Suggested: Mix of simple queries, complex multi-turn conversations, grounding queries, and edge cases
   
2. **Datadog Account Setup**: Free trial sufficient or need sponsorship?
   - Decision: Start with free trial, request credits if needed

3. **Video Production**: Screen recording tool and script?
   - Suggested: OBS Studio or Loom, script in DEMO_SCRIPT.md

4. **Public Hosting**: Which platform for demo deployment?
   - Suggested: Google Cloud Run (aligns with Gemini), Render, or Railway as alternatives

5. **GitHub Repo Structure**: Monorepo or separate docs repo?
   - Decision: Single repo with clear README and docs/ folder

---

## Next Steps (Phase 1: Design & Contracts)

1. **data-model.md**: Define telemetry event schemas, conversation models, cost structures
2. **contracts/**: Create OpenAPI spec for REST API, JSON schemas for telemetry events
3. **quickstart.md**: Document setup steps, environment variables, deployment process
4. **Agent context update**: Run update script to add technologies to .copilot-instructions.md

**Estimated Phase 1 Duration**: 2-3 hours

---

**Research Complete**: All NEEDS CLARIFICATION items resolved with concrete technology choices and implementation patterns.
