import { Conversation, LLMTelemetryEvent } from './types.js';

export class ConversationTracker {
  private conversations = new Map<string, Conversation>();
  private readonly sessionTimeoutMs = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Start cleanup timer
    setInterval(() => this.cleanupAbandonedSessions(), 60000); // Every minute
    console.log('💬 Conversation tracker initialized');
  }

  /**
   * Record a turn in a conversation
   */
  recordTurn(event: LLMTelemetryEvent): void {
    const { conversationId } = event;

    let conversation = this.conversations.get(conversationId);

    if (!conversation) {
      // Create new conversation
      conversation = {
        conversationId,
        userId: event.userId,
        startedAt: event.timestamp,
        turnCount: 0,
        totalTokens: 0,
        totalCost: 0,
        featureFlags: [],
        averageLatencyMs: 0,
        errorCount: 0,
        status: 'active',
      };
      this.conversations.set(conversationId, conversation);
      console.log(`📝 New conversation started: ${conversationId}`);
    }

    // Update conversation
    conversation.turnCount++;
    conversation.totalTokens += event.totalTokenCount;
    conversation.totalCost += event.totalCost;

    // Track features used
    if (!conversation.featureFlags.includes(event.featureType)) {
      conversation.featureFlags.push(event.featureType);
    }

    // Update average latency
    const totalLatency = conversation.averageLatencyMs * (conversation.turnCount - 1) + event.latencyMs;
    conversation.averageLatencyMs = Math.round(totalLatency / conversation.turnCount);

    // Track errors
    if (!event.success) {
      conversation.errorCount++;
    }

    console.log(`💬 Conversation ${conversationId}: turn ${conversation.turnCount}, ${conversation.totalTokens} tokens, $${conversation.totalCost.toFixed(6)}`);
  }

  /**
   * Mark a conversation as completed
   */
  completeConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'completed';
      conversation.endedAt = Date.now();
      console.log(`✅ Conversation completed: ${conversationId}`);
    }
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get all active conversations
   */
  getActiveConversations(): Conversation[] {
    return Array.from(this.conversations.values()).filter(
      (c) => c.status === 'active'
    );
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    const conversations = Array.from(this.conversations.values());
    const active = conversations.filter((c) => c.status === 'active').length;
    const completed = conversations.filter((c) => c.status === 'completed').length;
    const abandoned = conversations.filter((c) => c.status === 'abandoned').length;

    return {
      total: conversations.length,
      active,
      completed,
      abandoned,
      totalTurns: conversations.reduce((sum, c) => sum + c.turnCount, 0),
      totalCost: conversations.reduce((sum, c) => sum + c.totalCost, 0),
    };
  }

  /**
   * Clean up abandoned sessions
   */
  private cleanupAbandonedSessions(): void {
    const now = Date.now();
    let abandonedCount = 0;

    for (const [id, conversation] of this.conversations.entries()) {
      if (conversation.status === 'active') {
        const lastActivity = conversation.endedAt || conversation.startedAt;
        if (now - lastActivity > this.sessionTimeoutMs) {
          conversation.status = 'abandoned';
          conversation.endedAt = now;
          abandonedCount++;
        }
      }

      // Remove very old completed/abandoned conversations (keep only last 1000)
      if (this.conversations.size > 1000 && conversation.status !== 'active') {
        this.conversations.delete(id);
      }
    }

    if (abandonedCount > 0) {
      console.log(`🧹 Marked ${abandonedCount} conversations as abandoned`);
    }
  }
}

// Singleton instance
let conversationTrackerInstance: ConversationTracker | null = null;

export function getConversationTracker(): ConversationTracker {
  if (!conversationTrackerInstance) {
    conversationTrackerInstance = new ConversationTracker();
  }
  return conversationTrackerInstance;
}
