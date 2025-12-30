# 🚀 Datadog LLM Observability Platform

> Real-time monitoring and intelligent alerting for Google Gemini LLM applications using Datadog APM

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue)](https://www.typescriptlang.org/)

## 📋 Overview

This project demonstrates comprehensive observability for LLM applications by streaming telemetry from Google's Gemini API to Datadog. Built for the **Google Cloud Partnerships Hackathon: Datadog Challenge**.

### Key Features

- ✅ **Real-time LLM Monitoring**: Track token usage, latency, costs, and feature adoption
- ✅ **Intelligent Alerting**: Automated detection rules for performance, security, and quality issues
- ✅ **Cost Optimization**: Per-conversation and per-feature cost breakdown with historical analysis
- ✅ **Security Monitoring**: Prompt injection detection, PII redaction, and audit trails
- ✅ **Quality Tracking**: Schema validation monitoring and model behavior analysis

## 🏗️ Tech Stack

- **Runtime**: Node.js 20.x + TypeScript 5.3+
- **LLM**: Google Gemini API (`@google/genai`)
- **Observability**: Datadog APM (`dd-trace`, `@datadog/datadog-api-client`)
- **Web Framework**: Express.js
- **Validation**: Zod (for structured outputs)
- **Deployment**: Docker + Google Cloud Run

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- Google Cloud account with Gemini API access
- Datadog account (free trial available)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/llm-observability-demo.git
cd llm-observability-demo

# Install dependencies
cd backend
npm install

# Configure environment variables
cp config/env.example .env
# Edit .env with your API keys
```

### Configuration

Edit `backend/.env`:

```bash
GEMINI_API_KEY=your_gemini_api_key
DD_API_KEY=your_datadog_api_key
DD_APP_KEY=your_datadog_app_key
DD_SITE=datadoghq.com  # or your specific site
```

### Run Locally

```bash
# Start development server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/v1/health
```

### Setup Datadog Dashboard & Monitors

```bash
# Create dashboard and detection rules
npm run datadog:setup
```

This will output your dashboard URL - save it for monitoring!

### Generate Test Data

```bash
# Generate realistic traffic for demo
npm run simulate-load -- --requests 100 --duration 5
```

## 📊 Dashboard Overview

The Datadog dashboard includes:

- **Overview**: Request volume, success rate, error rate
- **Performance**: Latency percentiles (P50/P95/P99), token throughput
- **Cost Analysis**: Hourly cost trends, cost by feature, top expensive conversations
- **Security & Quality**: Security alerts, validation failures, PII detection events

## 🔔 Detection Rules

Automated monitoring includes:

- **LLM Latency Spike**: Alert when P95 latency > 5 seconds
- **Error Rate Critical**: Incident when error rate > 5% in 5-minute window
- **Cost Anomaly**: Alert when hourly cost > 1.5x baseline
- **Security: Prompt Injection**: Incident on injection pattern detection
- **Quality: Schema Failures**: Alert when validation failures > 10 in 15 minutes

## 📁 Project Structure

```
backend/
├── src/
│   ├── llm/                  # Gemini client & telemetry capture
│   ├── observability/        # Datadog integration & metrics
│   ├── api/                  # REST API endpoints
│   └── index.ts             # Application entry point
├── tests/                   # Unit & integration tests
├── config/                  # Configuration files
└── scripts/                 # Setup & utility scripts

config/datadog/              # Dashboard & monitor definitions
docs/                        # Documentation
specs/                       # Feature specifications
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Test Gemini connection
npm run test:gemini

# Test Datadog connection
npm run test:datadog
```

## 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t llm-obs-demo .

# Run with Docker Compose
docker-compose up
```

## 🌐 Deploy to Google Cloud Run

```bash
# Build and push
docker build -t gcr.io/YOUR_PROJECT/llm-obs-demo .
docker push gcr.io/YOUR_PROJECT/llm-obs-demo

# Deploy
gcloud run deploy llm-obs-demo \
  --image gcr.io/YOUR_PROJECT/llm-obs-demo \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DD_API_KEY=$DD_API_KEY,GEMINI_API_KEY=$GEMINI_API_KEY"
```

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Setup Guide](docs/SETUP.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [API Documentation](specs/001-datadog-llm-observability/contracts/openapi.yaml)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or feedback, please open an issue or contact [your email].

---

**Built with ❤️ for the Google Cloud Partnerships Hackathon**
