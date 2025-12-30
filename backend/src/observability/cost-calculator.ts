import {
  CostBreakdown,
  UsageMetadata,
  MODEL_PRICING,
  ModelName,
} from './types.js';

/**
 * Calculate costs from token usage based on model pricing
 */
export function calculateCost(
  usage: UsageMetadata,
  model: string
): CostBreakdown {
  // Default to gemini-2.5-flash-lite if model not found
  const modelKey = (model in MODEL_PRICING ? model : 'gemini-2.5-flash-lite') as ModelName;
  const pricing = MODEL_PRICING[modelKey];

  const inputCost = (usage.promptTokenCount / 1_000_000) * pricing.input;
  const outputCost = (usage.candidatesTokenCount / 1_000_000) * pricing.output;
  const thinkingCost = ((usage.thoughtsTokenCount || 0) / 1_000_000) * pricing.thinking;
  const toolCost = ((usage.toolUsePromptTokenCount || 0) / 1_000_000) * pricing.tool;

  return {
    inputCost,
    outputCost,
    thinkingCost,
    toolCost,
    totalCost: inputCost + outputCost + thinkingCost + toolCost,
  };
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

/**
 * Calculate cost per token
 */
export function calculateCostPerToken(totalCost: number, tokenCount: number): number {
  if (tokenCount === 0) return 0;
  return totalCost / tokenCount;
}

/**
 * Estimate cost for a given token count (for pre-calculation)
 */
export function estimateCost(
  tokenCount: number,
  model: string,
  type: 'input' | 'output' | 'thinking' = 'output'
): number {
  const modelKey = (model in MODEL_PRICING ? model : 'gemini-2.5-flash-lite') as ModelName;
  const pricing = MODEL_PRICING[modelKey];

  const rate = type === 'input' ? pricing.input : type === 'thinking' ? pricing.thinking : pricing.output;

  return (tokenCount / 1_000_000) * rate;
}
