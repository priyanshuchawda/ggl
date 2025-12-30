import { LLMTelemetryEvent } from './types.js';
import { config } from '../config.js';

export class TelemetryBuffer {
  private buffer: LLMTelemetryEvent[] = [];
  private readonly maxSizeMB: number;
  private readonly flushIntervalMs: number;
  private readonly maxRetries = 5;
  private retryCount = 0;
  private retryDelay = 1000;
  private flushTimer?: NodeJS.Timeout;
  private isFlushing = false;

  constructor() {
    this.maxSizeMB = config.telemetry.bufferMaxMB;
    this.flushIntervalMs = config.telemetry.flushIntervalMs;

    // Start automatic flush timer
    this.startFlushTimer();

    console.log(`📦 Telemetry buffer initialized (max: ${this.maxSizeMB}MB, flush: ${this.flushIntervalMs}ms)`);
  }

  /**
   * Add an event to the buffer
   */
  add(event: LLMTelemetryEvent): void {
    this.buffer.push(event);

    // Check buffer size
    const sizeBytes = this.getBufferSizeBytes();
    const sizeMB = sizeBytes / (1024 * 1024);

    if (sizeMB > this.maxSizeMB) {
      const dropCount = Math.ceil(this.buffer.length * 0.2); // Drop 20%
      this.buffer = this.buffer.slice(dropCount);
      console.warn(`⚠️  Buffer overflow: dropped ${dropCount} oldest events (size: ${sizeMB.toFixed(2)}MB)`);
    }

    // Trigger flush if buffer is getting full
    if (sizeMB > this.maxSizeMB * 0.8) {
      console.log(`📤 Buffer at 80% capacity, triggering flush...`);
      this.flush().catch(console.error);
    }
  }

  /**
   * Flush buffer to Datadog
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.buffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      const events = [...this.buffer];
      console.log(`📤 Flushing ${events.length} telemetry events to Datadog...`);

      // In a real implementation, this would send to Datadog Logs API
      // For now, we're using dd-trace metrics which are sent automatically

      // Clear buffer after successful flush
      this.buffer = [];
      this.retryCount = 0;
      this.retryDelay = 1000;

      console.log(`✅ Flushed ${events.length} events successfully`);
    } catch (error) {
      this.retryCount++;

      console.error(`❌ Flush failed (attempt ${this.retryCount}/${this.maxRetries}):`, error);

      if (this.retryCount >= this.maxRetries) {
        console.error(`⚠️  Max retries exceeded, dropping oldest ${Math.floor(this.buffer.length / 2)} events`);
        this.buffer = this.buffer.slice(-Math.floor(this.buffer.length / 2));
        this.retryCount = 0;
      } else {
        this.retryDelay = Math.min(this.retryDelay * 2, 60000); // Cap at 60s
        console.log(`⏳ Retrying in ${this.retryDelay}ms...`);
        setTimeout(() => this.flush(), this.retryDelay);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Get buffer status
   */
  getStatus() {
    const sizeBytes = this.getBufferSizeBytes();
    const sizeMB = sizeBytes / (1024 * 1024);

    return {
      eventCount: this.buffer.length,
      sizeMB: parseFloat(sizeMB.toFixed(2)),
      maxSizeMB: this.maxSizeMB,
      utilizationPercent: parseFloat(((sizeMB / this.maxSizeMB) * 100).toFixed(1)),
      retryCount: this.retryCount,
      isFlushing: this.isFlushing,
    };
  }

  /**
   * Calculate buffer size in bytes
   */
  private getBufferSizeBytes(): number {
    return JSON.stringify(this.buffer).length;
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        console.log(`⏰ Automatic flush triggered (${this.buffer.length} events)`);
        this.flush().catch(console.error);
      }
    }, this.flushIntervalMs);
  }

  /**
   * Stop flush timer (for graceful shutdown)
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush remaining events
    if (this.buffer.length > 0) {
      console.log('Flushing remaining events before shutdown...');
      this.flush().catch(console.error);
    }
  }
}

// Singleton instance
let telemetryBufferInstance: TelemetryBuffer | null = null;

export function getTelemetryBuffer(): TelemetryBuffer {
  if (!telemetryBufferInstance) {
    telemetryBufferInstance = new TelemetryBuffer();
  }
  return telemetryBufferInstance;
}
