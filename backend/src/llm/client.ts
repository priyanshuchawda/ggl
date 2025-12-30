import { GoogleGenAI } from '@google/genai';

export interface GeminiClientConfig {
  apiKey: string;
  defaultModel?: string;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private defaultModel: string;

  constructor(config: GeminiClientConfig) {
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.defaultModel = config.defaultModel || 'gemini-2.5-flash';
  }

  /**
   * Get the GoogleGenAI instance for advanced usage
   */
  getAI(): GoogleGenAI {
    return this.ai;
  }

  /**
   * Get default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Generate content from a simple text prompt
   */
  async generateContent(prompt: string, model?: string): Promise<any> {
    const response = await this.ai.models.generateContent({
      model: model || this.defaultModel,
      contents: prompt,
    });
    return response;
  }

  /**
   * Generate streaming content
   */
  async generateContentStream(prompt: string, model?: string): Promise<any> {
    const response = await this.ai.models.generateContentStream({
      model: model || this.defaultModel,
      contents: prompt,
    });
    return response;
  }

  /**
   * Generate structured output with schema
   */
  async generateStructuredContent(
    prompt: string,
    schema: any,
    model?: string
  ): Promise<any> {
    const response = await this.ai.models.generateContent({
      model: model || this.defaultModel,
      contents: prompt,
      config: {
        responseSchema: schema,
        responseMimeType: 'application/json',
      },
    });
    return response;
  }

  /**
   * Generate content with Google Search grounding
   */
  async generateWithGrounding(prompt: string, model?: string): Promise<any> {
    const response = await this.ai.models.generateContent({
      model: model || this.defaultModel,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return response;
  }
}

// Singleton instance
let geminiClientInstance: GeminiClient | null = null;

export function initializeGeminiClient(config: GeminiClientConfig): GeminiClient {
  geminiClientInstance = new GeminiClient(config);
  return geminiClientInstance;
}

export function getGeminiClient(): GeminiClient {
  if (!geminiClientInstance) {
    throw new Error('Gemini client not initialized. Call initializeGeminiClient first.');
  }
  return geminiClientInstance;
}
