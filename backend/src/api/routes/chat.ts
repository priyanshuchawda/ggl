import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { chatRequestSchema } from '../schemas/chat.js';
import { getGeminiClient } from '../../llm/client.js';
import { captureTelemetry } from '../../llm/telemetry-capture.js';
import { getTelemetryBuffer } from '../../observability/telemetry-buffer.js';
import { getConversationTracker } from '../../observability/conversation-tracker.js';
import { createError } from '../middleware/error-handler.js';

const router = Router();

/**
 * POST /api/v1/chat
 * Send a message to the LLM and get a response
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request
    const validation = chatRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw createError(`Invalid request: ${validation.error.message}`, 400);
    }

    const {
      message,
      conversationId: providedConversationId,
      userId,
      stream,
      model: requestedModel,
      temperature,
    } = validation.data;

    // Generate conversation ID if not provided
    const conversationId = providedConversationId || uuidv4();

    // Get Gemini client
    const geminiClient = getGeminiClient();
    const model = requestedModel || geminiClient.getDefaultModel();

    console.log(`\n💬 Chat request received:`);
    console.log(`   Conversation: ${conversationId}`);
    console.log(`   Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    console.log(`   Model: ${model}`);

    if (stream) {
      // TODO: Implement streaming in future task
      throw createError('Streaming not yet implemented', 501);
    }

    // Generate response with telemetry capture
    const { result, telemetry } = await captureTelemetry(
      () => geminiClient.generateContent(message, model),
      {
        conversationId,
        userId,
        featureType: 'chat',
        temperature,
      },
      model
    );

    // Add telemetry to buffer
    getTelemetryBuffer().add(telemetry);

    // Track conversation
    getConversationTracker().recordTurn(telemetry);

    // Build response
    const response = {
      conversationId: telemetry.conversationId,
      message: result.text || 'No response generated',
      model: telemetry.model,
      usage: {
        promptTokens: telemetry.promptTokenCount,
        completionTokens: telemetry.candidatesTokenCount,
        totalTokens: telemetry.totalTokenCount,
      },
      cost: telemetry.totalCost,
      latencyMs: telemetry.latencyMs,
    };

    console.log(`✅ Response generated:`);
    console.log(`   Tokens: ${response.usage.totalTokens}`);
    console.log(`   Cost: $${response.cost.toFixed(6)}`);
    console.log(`   Latency: ${response.latencyMs}ms`);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
