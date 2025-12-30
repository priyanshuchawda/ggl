import { z } from 'zod';

export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  conversationId: z.string().uuid().optional(),
  userId: z.string().optional(),
  stream: z.boolean().default(false),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string(),
  model: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  cost: z.number(),
  latencyMs: z.number(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;
