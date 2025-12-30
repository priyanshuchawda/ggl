import tracer from 'dd-trace';
import { v4 as uuidv4 } from 'uuid';
import { LLMTelemetryEvent, FeatureType, UsageMetadata } from '../observability/types.js';
import { calculateCost } from '../observability/cost-calculator.js';
import { config } from '../config.js';

export interface TelemetryCaptureOptions {
  conversationId?: string;
  userId?: string;
  featureType: FeatureType;
  temperature?: number;
  thinkingBudget?: number;
}

export interface GeminiResponse {
  text?: string;
  candidates?: any[];
  usageMetadata?: UsageMetadata;
  groundingMetadata?: any;
}

/**
 * Capture telemetry from an LLM operation
 */
export async function captureTelemetry<T>(
  operation: () => Promise<T>,
  options: TelemetryCaptureOptions,
  model: string
): Promise<{ result: T; telemetry: LLMTelemetryEvent }> {
  const requestId = uuidv4();
  const conversationId = options.conversationId || uuidv4();
  const startTime = Date.now();

  // Create Datadog span
  const span = tracer.startSpan('llm.generate', {
    tags: {
      'llm.request_id': requestId,
      'llm.conversation_id': conversationId,
      'llm.model': model,
      'llm.feature': options.featureType,
      'llm.user_id': options.userId || 'anonymous',
    },
  });

  try {
    // Execute the operation
    const result = await operation();
    const latencyMs = Date.now() - startTime;

    // Extract metadata from response
    const response = result as unknown as GeminiResponse;
    const usage = response.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
    };

    const groundingUsed = !!response.groundingMetadata;
    const toolsUsed: string[] = [];
    if (groundingUsed) {
      toolsUsed.push('googleSearch');
    }

    // Calculate costs
    const costs = calculateCost(usage, model);

    // Build telemetry event
    const telemetry: LLMTelemetryEvent = {
      requestId,
      timestamp: startTime,
      conversationId,
      userId: options.userId,
      featureType: options.featureType,
      model,
      temperature: options.temperature || 1.0,
      thinkingBudget: options.thinkingBudget,
      promptTokenCount: usage.promptTokenCount,
      candidatesTokenCount: usage.candidatesTokenCount,
      thoughtsTokenCount: usage.thoughtsTokenCount || 0,
      toolUsePromptTokenCount: usage.toolUsePromptTokenCount || 0,
      totalTokenCount: usage.totalTokenCount,
      latencyMs,
      streaming: false,
      toolsUsed,
      groundingUsed,
      success: true,
      inputCost: costs.inputCost,
      outputCost: costs.outputCost,
      thinkingCost: costs.thinkingCost,
      toolCost: costs.toolCost,
      totalCost: costs.totalCost,
      tags: {
        env: config.datadog.env,
        version: config.datadog.version,
        host: 'localhost',
      },
    };

    // Tag span with telemetry
    span.setTag('llm.prompt_tokens', telemetry.promptTokenCount);
    span.setTag('llm.completion_tokens', telemetry.candidatesTokenCount);
    span.setTag('llm.total_tokens', telemetry.totalTokenCount);
    span.setTag('llm.total_cost', telemetry.totalCost);
    span.setTag('llm.latency_ms', telemetry.latencyMs);
    span.setTag('llm.success', true);

    // Emit metrics to Datadog
    emitMetrics(telemetry);

    span.finish();

    return { result, telemetry };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Build error telemetry
    const telemetry: LLMTelemetryEvent = {
      requestId,
      timestamp: startTime,
      conversationId,
      userId: options.userId,
      featureType: options.featureType,
      model,
      temperature: options.temperature || 1.0,
      thinkingBudget: options.thinkingBudget,
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      thoughtsTokenCount: 0,
      toolUsePromptTokenCount: 0,
      totalTokenCount: 0,
      latencyMs,
      streaming: false,
      toolsUsed: [],
      groundingUsed: false,
      success: false,
      errorCode: 'API_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      inputCost: 0,
      outputCost: 0,
      thinkingCost: 0,
      toolCost: 0,
      totalCost: 0,
      tags: {
        env: config.datadog.env,
        version: config.datadog.version,
        host: 'localhost',
      },
    };

    // Tag span with error
    span.setTag('error', true);
    span.setTag('error.message', telemetry.errorMessage);
    span.setTag('llm.success', false);

    // Emit error metrics
    emitMetrics(telemetry);

    span.finish();

    throw error;
  }
}

/**
 * Emit metrics to Datadog using dogstatsd
 */
function emitMetrics(telemetry: LLMTelemetryEvent): void {
  const tags = [
    `model:${telemetry.model}`,
    `feature:${telemetry.featureType}`,
    `env:${telemetry.tags.env}`,
  ];

  // Token metrics
  tracer.dogstatsd.histogram('llm.tokens.prompt', telemetry.promptTokenCount, tags);
  tracer.dogstatsd.histogram('llm.tokens.completion', telemetry.candidatesTokenCount, tags);
  tracer.dogstatsd.histogram('llm.tokens.total', telemetry.totalTokenCount, tags);

  // Performance metrics
  tracer.dogstatsd.histogram('llm.latency', telemetry.latencyMs, tags);

  // Cost metrics
  tracer.dogstatsd.histogram('llm.cost.total', telemetry.totalCost, tags);

  // Success/error counters
  if (telemetry.success) {
    tracer.dogstatsd.increment('llm.requests.success', tags);
  } else {
    tracer.dogstatsd.increment('llm.requests.error', tags);
  }

  // Tool usage
  if (telemetry.groundingUsed) {
    tracer.dogstatsd.increment('llm.tools.grounding', tags);
  }
}
