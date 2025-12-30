import tracer from 'dd-trace';
import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config.js';
import { initializeGeminiClient } from './llm/client.js';
import { requestLogger } from './api/middleware/logger.js';
import { errorHandler, notFoundHandler } from './api/middleware/error-handler.js';
import healthRouter from './api/routes/health.js';

// Initialize Datadog tracer FIRST (before any other imports)
tracer.init({
  service: config.datadog.service,
  env: config.datadog.env,
  version: config.datadog.version,
  logInjection: true,
  runtimeMetrics: true,
  profiling: true,
});

console.log('🔍 Datadog Tracer initialized');

// Validate configuration
validateConfig();

// Initialize Gemini client
initializeGeminiClient({
  apiKey: config.gemini.apiKey,
  defaultModel: config.gemini.model,
});

console.log('✨ Gemini Client initialized');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Routes
app.use('/api/v1/health', healthRouter);

// Import chat router
import chatRouter from './api/routes/chat.js';
app.use('/api/v1/chat', chatRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`📍 Datadog Site: ${config.datadog.site}`);
  console.log(`🤖 Gemini Model: ${config.gemini.model}`);
  console.log('\n✅ Ready to accept requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
