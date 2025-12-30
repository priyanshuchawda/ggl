import { config } from '../src/config.js';

interface LoadTestConfig {
  requests: number;
  durationMinutes: number;
  scenarios: string[];
  port: number;
  datadogSite: string;
}

const DEFAULT_CONFIG: LoadTestConfig = {
  requests: 100,
  durationMinutes: 5,
  scenarios: ['simple_chat', 'grounding', 'errors'],
  port: 3000,
  datadogSite: 'us5.datadoghq.com',
};

// Test scenarios
const SCENARIOS = {
  simple_chat: [
    'What is 2+2?',
    'Explain AI in one sentence.',
    'What color is the sky?',
    'Count to 5.',
    'Say hello in Spanish.',
  ],
  math_problems: [
    'What is 15 * 23?',
    'Calculate the square root of 144.',
    'What is 50% of 200?',
    'Convert 100 Fahrenheit to Celsius.',
  ],
  grounding: [
    'What are the latest news about AI?',
    'Find information about Google Cloud.',
    'Search for Datadog observability features.',
  ],
  complex: [
    'Explain the theory of relativity in simple terms.',
    'What are the benefits of cloud computing?',
    'How does machine learning work?',
  ],
  errors: [
    '', // Empty message (should fail validation)
    'x'.repeat(15000), // Too long (should fail validation)
  ],
};

async function sendChatRequest(message: string, port: number): Promise<any> {
  const url = `http://localhost:${port}/api/v1/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Request failed: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

function getRandomScenarioMessage(scenarios: string[]): string {
  const validScenarios = scenarios.filter((s) => SCENARIOS[s as keyof typeof SCENARIOS]);

  if (validScenarios.length === 0) {
    validScenarios.push('simple_chat');
  }

  const scenarioName = validScenarios[Math.floor(Math.random() * validScenarios.length)];
  const messages = SCENARIOS[scenarioName as keyof typeof SCENARIOS];
  return messages[Math.floor(Math.random() * messages.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateLoad(config: LoadTestConfig): Promise<void> {
  console.log('🚀 Load Test Configuration:');
  console.log(`   Total Requests: ${config.requests}`);
  console.log(`   Duration: ${config.durationMinutes} minutes`);
  console.log(`   Scenarios: ${config.scenarios.join(', ')}`);
  console.log(`   Target: http://localhost:${config.port}/api/v1/chat\n`);

  const delayMs = (config.durationMinutes * 60 * 1000) / config.requests;
  console.log(`⏱️  Delay between requests: ${Math.round(delayMs)}ms\n`);

  let successCount = 0;
  let errorCount = 0;
  let totalLatency = 0;
  let totalCost = 0;

  console.log('📊 Generating traffic...\n');

  for (let i = 1; i <= config.requests; i++) {
    const message = getRandomScenarioMessage(config.scenarios);

    try {
      const start = Date.now();
      const response = await sendChatRequest(message, config.port);
      const latency = Date.now() - start;

      successCount++;
      totalLatency += latency;
      totalCost += response.cost;

      const progress = Math.round((i / config.requests) * 100);
      const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

      console.log(`[${progressBar}] ${progress}% | Request ${i}/${config.requests}`);
      console.log(`   ✅ Success | ${latency}ms | ${response.usage.totalTokens} tokens | $${response.cost.toFixed(6)}`);
      console.log(`   Message: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"\n`);
    } catch (error) {
      errorCount++;
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    // Sleep between requests (except for last one)
    if (i < config.requests) {
      await sleep(delayMs);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Load Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Requests: ${config.requests}`);
  console.log(`✅ Successful: ${successCount} (${((successCount / config.requests) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${errorCount} (${((errorCount / config.requests) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Average Latency: ${Math.round(totalLatency / successCount)}ms`);
  console.log(`💰 Total Cost: $${totalCost.toFixed(6)}`);
  console.log(`💵 Average Cost per Request: $${(totalCost / successCount).toFixed(6)}`);
  console.log('='.repeat(60));
  console.log('\n✅ Load test complete!');
  console.log(`\n🔗 View metrics: https://app.${config.datadogSite}/dashboard/vza-u2j-7nm\n`);
}

// Parse command line arguments
function parseArgs(): LoadTestConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--requests':
        config.requests = parseInt(args[++i], 10);
        break;
      case '--duration':
        config.durationMinutes = parseInt(args[++i], 10);
        break;
      case '--scenarios':
        config.scenarios = args[++i].split(',');
        break;
    }
  }

  return config;
}

// Main
async function main() {
  console.log('\n🧪 LLM Observability Load Test Generator\n');

  const testConfig = parseArgs();

  try {
    await generateLoad(testConfig);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Load test failed:', error);
    process.exit(1);
  }
}

main();
