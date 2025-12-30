# Quickstart Guide: Datadog LLM Observability Platform

**Last Updated**: 2025-12-30  
**Estimated Setup Time**: 30-45 minutes

---

## Prerequisites

### Required Accounts
1. **Google Cloud Account** with billing enabled
   - Sign up: https://cloud.google.com/free
   - $300 free credit available for new accounts
   - Request $50 hackathon credits: [form link from hackathon rules]

2. **Datadog Account** (free trial sufficient)
   - Sign up: https://www.datadoghq.com/
   - 14-day free trial includes APM and monitoring features
   - No credit card required for trial

### Required Software
- **Node.js**: Version 20.x LTS ([download](https://nodejs.org/))
- **Docker**: Latest version ([download](https://www.docker.com/get-started))
- **Git**: For cloning the repository
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - REST Client (for API testing)

---

## Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/llm-observability-demo.git
cd llm-observability-demo

# Install dependencies
npm install

# Copy environment template
cp backend/config/env.example backend/.env
```

---

## Step 2: Configure Google Cloud

### Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Get API Key"**
3. Create a new API key or use existing
4. Copy the key (starts with `AIza...`)

### Add to Environment

Edit `backend/.env`:
```bash
# Google Cloud / Gemini API
GEMINI_API_KEY=AIzaSy...YOUR_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
```

### Test Gemini Connection

```bash
npm run test:gemini
```

Expected output:
```
✓ Gemini API connection successful
✓ Token usage captured: 45 input, 120 output
```

---

## Step 3: Configure Datadog

### Get Datadog API Keys

1. Log into [Datadog](https://app.datadoghq.com/)
2. Go to **Organization Settings** → **API Keys**
3. Create a new API key
4. Copy the **API Key** and **Application Key**
5. Note your **Datadog Site** (e.g., `datadoghq.com` or `us5.datadoghq.com`)

### Add to Environment

Edit `backend/.env`:
```bash
# Datadog Configuration
DD_API_KEY=your_datadog_api_key_here
DD_APP_KEY=your_datadog_app_key_here
DD_SITE=datadoghq.com  # or your specific site
DD_SERVICE=llm-observability-demo
DD_ENV=development
```

### Initialize Datadog Resources

This creates the dashboard and detection rules:

```bash
npm run datadog:setup
```

Expected output:
```
✓ Dashboard created: https://app.datadoghq.com/dashboard/abc-123
✓ 8 monitors created
✓ Datadog setup complete
```

**Important**: Save the dashboard URL - you'll need it for the demo!

---

## Step 4: Run Locally

### Start the Application

```bash
# Development mode with hot reload
npm run dev
```

The API will be available at: `http://localhost:3000`

### Test the API

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Send a chat message
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is your return policy?",
    "stream": false
  }'
```

---

## Step 5: Generate Test Data

To populate the dashboard with realistic telemetry:

```bash
# Generate 100 requests over 5 minutes
npm run simulate-load -- --requests 100 --duration 5

# Or use the API
curl -X POST http://localhost:3000/api/v1/admin/simulate-load \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_admin_key" \
  -d '{
    "requestCount": 100,
    "durationMinutes": 5,
    "scenarios": ["simple_chat", "grounding", "structured", "errors"]
  }'
```

This will generate diverse traffic including:
- ✅ Successful requests
- ✅ Streaming responses
- ✅ Grounding with Google Search
- ✅ Structured outputs
- ✅ Intentional errors (to test alerting)

---

## Step 6: View the Dashboard

1. Open the dashboard URL from Step 3
2. You should see:
   - **Request volume** trending upward
   - **Latency metrics** (P50/P95/P99)
   - **Cost breakdown** by feature
   - **Token consumption** graphs
   - **Error events** (if errors simulated)

### Dashboard Sections

#### Overview (Top)
- Total requests counter
- Success rate percentage
- Current error rate
- Request volume timeseries

#### Performance (Middle Left)
- Latency percentiles
- Latency heatmap by model
- Requests by feature type
- Token throughput

#### Cost (Middle Right)
- Hourly cost trend
- Cost by feature pie chart
- Most expensive conversations
- Cost per conversation

#### Security & Quality (Bottom)
- Security alerts stream
- Schema validation failures
- PII detection events
- Error type distribution

---

## Step 7: Test Alerts

### Trigger an Alert

Generate high latency to fire the "LLM Latency Spike" alert:

```bash
npm run trigger-alert latency
```

This sends requests that intentionally take 6+ seconds.

### Check Alert Notifications

1. Go to **Datadog** → **Monitors** → **Triggered Monitors**
2. You should see: **"LLM Latency Spike"** alert
3. Click to view incident details including:
   - Triggering event context
   - Exact prompt that was slow
   - System metrics at trigger time
   - Suggested remediation

---

## Common Issues & Troubleshooting

### Issue: "Gemini API Error: 429 Rate Limit"

**Solution**: You've exceeded the free tier limit.
```bash
# Check current usage
npm run check-quota

# Solution 1: Wait 60 seconds for rate limit reset
# Solution 2: Request hackathon credits
# Solution 3: Reduce simulation load
```

### Issue: "Datadog: No data appearing"

**Checklist**:
- ✅ Check `DD_API_KEY` is correct in `.env`
- ✅ Verify `DD_SITE` matches your account (e.g., `us5.datadoghq.com`)
- ✅ Ensure dd-trace initialized: check logs for "Datadog Tracer loaded"
- ✅ Wait 30-60 seconds for first data to appear

**Debug**:
```bash
# Check telemetry buffer status
curl http://localhost:3000/api/v1/health

# Check application logs
npm run logs

# Verify Datadog connection
npm run test:datadog
```

### Issue: "Dashboard shows no metrics"

**Solution**: Dashboard queries may need time range adjustment.
1. Open dashboard
2. Click time range selector (top right)
3. Change to "Past 15 minutes" or "Past 1 hour"
4. Refresh

### Issue: "Docker build fails"

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Rebuild
docker build -t llm-obs-demo .
```

---

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test telemetry-capture.test.ts

# Watch mode
npm test -- --watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Viewing Logs

```bash
# Application logs
npm run logs

# Datadog APM traces
# Visit: https://app.datadoghq.com/apm/traces

# Telemetry buffer status
curl http://localhost:3000/api/v1/health | jq '.checks.telemetryBuffer'
```

---

## Deployment (Optional for Demo)

### Deploy to Google Cloud Run

```bash
# Build Docker image
docker build -t gcr.io/YOUR_PROJECT/llm-obs-demo .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT/llm-obs-demo

# Deploy
gcloud run deploy llm-obs-demo \
  --image gcr.io/YOUR_PROJECT/llm-obs-demo \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DD_API_KEY=$DD_API_KEY,GEMINI_API_KEY=$GEMINI_API_KEY"
```

### Alternative: Deploy to Render

1. Connect GitHub repo to Render
2. Create new **Web Service**
3. Set environment variables in Render dashboard
4. Deploy automatically on git push

---

## Creating the Demo Video

### Recommended Tools
- **OBS Studio** (free, cross-platform): https://obsproject.com/
- **Loom** (free tier, easy to use): https://www.loom.com/
- **QuickTime** (Mac only): Built-in screen recording

### Demo Script (3 minutes)

**[0:00-0:30] Introduction**
- "This is an LLM observability platform using Gemini and Datadog"
- Show the dashboard overview
- Point out key metrics (requests, latency, cost)

**[0:30-1:15] Feature Demonstration**
- Send a simple chat request via curl or Postman
- Show the request appearing in real-time on dashboard
- Highlight token usage and cost tracking

**[1:15-2:00] Advanced Features**
- Trigger grounding request (search for recent news)
- Show structured output extraction
- Demonstrate streaming response

**[2:00-2:30] Alerting & Incident Management**
- Trigger a latency alert
- Show alert firing in Datadog
- Display incident with full context (prompt, system state, remediation)

**[2:30-3:00] Wrap-up**
- Show cost analysis (top conversations)
- Highlight security monitoring (PII detection)
- Mention extensibility (add more detection rules, custom metrics)

### Video Tips
- **Keep it moving**: Don't wait for slow operations, cut to results
- **Zoom in**: Make text readable (dashboard widgets)
- **Narrate**: Explain what you're doing as you do it
- **Show, don't tell**: Focus on visual dashboard, not code

---

## Next Steps

✅ **You're ready to demo!** Here's what to do next:

1. **Record demo video** (3 min max)
2. **Prepare GitHub repo**:
   - Clear README with setup instructions
   - Add open source license (MIT recommended)
   - Include architecture diagram
   - Document all detection rules
3. **Deploy publicly** (Cloud Run or Render)
4. **Submit to hackathon**:
   - Hosted project URL
   - GitHub repo link
   - Demo video (YouTube/Vimeo)
   - Text description

### Submission Checklist

- [ ] Public GitHub repo with open source license
- [ ] README with setup instructions
- [ ] Demo video uploaded and public
- [ ] Application deployed and accessible
- [ ] Datadog dashboard configured
- [ ] Detection rules documented
- [ ] Description written (features, tech stack, learnings)

---

## Resources

- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **Datadog APM Guide**: https://docs.datadoghq.com/tracing/
- **Hackathon Rules**: [Link from hackathon page]
- **Support**: [Your contact email/Discord]

---

**Estimated Total Time**: 30-45 minutes from zero to working demo

**Good luck with the hackathon!** 🚀
