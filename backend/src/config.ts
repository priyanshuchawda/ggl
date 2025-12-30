import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

export interface Config {
  // Application
  nodeEnv: string;
  port: number;
  logLevel: string;

  // Gemini API
  gemini: {
    apiKey: string;
    model: string;
  };

  // Datadog
  datadog: {
    apiKey: string;
    appKey: string;
    site: string;
    service: string;
    env: string;
    version: string;
  };

  // Telemetry Buffer
  telemetry: {
    bufferMaxMB: number;
    flushIntervalMs: number;
  };

  // Admin
  adminApiKey: string;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export const config: Config = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  logLevel: getEnv('LOG_LEVEL', 'info'),

  gemini: {
    apiKey: getEnv('GEMINI_API_KEY'),
    model: getEnv('GEMINI_MODEL', 'gemini-2.5-flash'),
  },

  datadog: {
    apiKey: getEnv('DD_API_KEY'),
    appKey: getEnv('DD_APP_KEY'),
    site: getEnv('DD_SITE', 'datadoghq.com'),
    service: getEnv('DD_SERVICE', 'llm-observability-demo'),
    env: getEnv('DD_ENV', 'development'),
    version: getEnv('DD_VERSION', '1.0.0'),
  },

  telemetry: {
    bufferMaxMB: getEnvNumber('TELEMETRY_BUFFER_MAX_MB', 10),
    flushIntervalMs: getEnvNumber('TELEMETRY_FLUSH_INTERVAL_MS', 5000),
  },

  adminApiKey: getEnv('ADMIN_API_KEY'),
};

// Validate configuration
export function validateConfig(): void {
  console.log('Validating configuration...');

  // Validate Gemini API key format
  if (!config.gemini.apiKey.startsWith('AIza')) {
    console.warn('Warning: Gemini API key format may be incorrect');
  }

  // Validate Datadog keys
  if (config.datadog.apiKey.length < 30) {
    console.warn('Warning: Datadog API key seems too short');
  }

  console.log('Configuration validated successfully');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Datadog Site: ${config.datadog.site}`);
  console.log(`Gemini Model: ${config.gemini.model}`);
}
