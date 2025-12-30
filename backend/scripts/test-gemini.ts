import { config } from '../src/config.js';
import { GeminiClient } from '../src/llm/client.js';

async function testGeminiConnection() {
  console.log('🧪 Testing Gemini API Connection...\n');

  try {
    // Initialize client
    const client = new GeminiClient({
      apiKey: config.gemini.apiKey,
      defaultModel: config.gemini.model,
    });

    console.log(`✓ Client initialized with model: ${client.getDefaultModel()}\n`);

    // Test simple generation
    console.log('Testing simple text generation...');
    const response = await client.generateContent('Say "Hello from Gemini!" in exactly 5 words.');

    console.log('\n✓ Response received:');
    console.log(`  Text: ${response.text}`);
    console.log(`  Tokens: ${JSON.stringify(response.usageMetadata, null, 2)}`);

    // Verify token usage
    if (response.usageMetadata) {
      const { promptTokenCount, candidatesTokenCount, totalTokenCount } = response.usageMetadata;
      console.log(`\n✓ Token usage captured:`);
      console.log(`  Prompt tokens: ${promptTokenCount}`);
      console.log(`  Completion tokens: ${candidatesTokenCount}`);
      console.log(`  Total tokens: ${totalTokenCount}`);
    }

    console.log('\n✅ Gemini API connection successful!');
    return true;
  } catch (error) {
    console.error('\n❌ Gemini API connection failed:');
    console.error(error instanceof Error ? error.message : error);
    return false;
  }
}

// Run test
testGeminiConnection().then((success) => {
  process.exit(success ? 0 : 1);
});
