/**
 * Telemetry types matching data-model.md
 */

export type FeatureType = 'chat' | 'grounding' | 'url_context' | 'structured_output' | 'streaming';

export type ErrorCode =
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR';

export type SecurityAlertType = 'prompt_injection' | 'pii_detected' | 'rate_limit_violation';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityAlert {
  type: SecurityAlertType;
  severity: Severity;
  details: string;
  pattern?: string;
  match?: string;
}

export interface SchemaValidation {
  passed: boolean;
  schemaName: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface LLMTelemetryEvent {
  // Identifiers
  requestId: string;
  timestamp: number;
  conversationId: string;
  userId?: string;

  // Feature context
  featureType: FeatureType;
  model: string;
  temperature: number;
  thinkingBudget?: number;

  // Token metrics
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  toolUsePromptTokenCount: number;
  totalTokenCount: number;

  // Performance metrics
  latencyMs: number;
  timeToFirstTokenMs?: number;
  streaming: boolean;

  // Tool usage
  toolsUsed: string[];
  groundingUsed: boolean;
  urlsProvided?: string[];

  // Outcome
  success: boolean;
  errorCode?: ErrorCode;
  errorMessage?: string;

  // Cost tracking
  inputCost: number;
  outputCost: number;
  thinkingCost: number;
  toolCost: number;
  totalCost: number;

  // Validation (if structured output)
  schemaValidation?: SchemaValidation;

  // Security signals
  securityAlerts?: SecurityAlert[];

  // Tags for Datadog grouping
  tags: {
    env: string;
    version: string;
    host: string;
  };
}

export interface Conversation {
  conversationId: string;
  userId?: string;
  startedAt: number;
  endedAt?: number;
  turnCount: number;
  totalTokens: number;
  totalCost: number;
  featureFlags: string[];
  averageLatencyMs: number;
  errorCount: number;
  status: 'active' | 'completed' | 'abandoned' | 'error';
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  thinkingCost: number;
  toolCost: number;
  totalCost: number;
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount?: number;
  toolUsePromptTokenCount?: number;
  totalTokenCount: number;
}

// Model pricing (USD per million tokens)
export const MODEL_PRICING = {
  'gemini-2.5-flash': {
    input: 0.075,
    output: 0.3,
    thinking: 0.3,
    tool: 0.0, // Free until Jan 5, 2026
  },
  'gemini-2.5-pro': {
    input: 1.25,
    output: 5.0,
    thinking: 5.0,
    tool: 0.0,
  },
};

export type ModelName = keyof typeof MODEL_PRICING;
