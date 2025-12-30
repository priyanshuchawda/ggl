import { client, v1 } from '@datadog/datadog-api-client';
import { config } from '../src/config.js';

/**
 * Setup Datadog Dashboard and Monitors for LLM Observability
 */

// Configure Datadog API client
const configuration = client.createConfiguration({
  authMethods: {
    apiKeyAuth: config.datadog.apiKey,
    appKeyAuth: config.datadog.appKey,
  },
});

// Set server based on site
if (config.datadog.site !== 'datadoghq.com') {
  client.setServerVariables(configuration, {
    site: config.datadog.site,
  });
}

const dashboardsApi = new v1.DashboardsApi(configuration);
const monitorsApi = new v1.MonitorsApi(configuration);

async function createDashboard() {
  console.log('\n📊 Creating Datadog Dashboard...\n');

  const dashboardParams: v1.DashboardsApiCreateDashboardRequest = {
    body: {
      title: '🤖 LLM Observability - Gemini + Datadog',
      description: 'Real-time monitoring for Gemini LLM application with telemetry, costs, and performance metrics',
      layoutType: 'ordered',
      widgets: [
        // ========== SECTION 1: OVERVIEW ==========
        {
          definition: {
            type: 'group',
            layoutType: 'ordered',
            title: '📈 Overview',
            widgets: [
              // Total Requests Counter
              {
                definition: {
                  type: 'query_value',
                  requests: [
                    {
                      formulas: [{ formula: 'query1' }],
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'query1',
                          query: 'sum:llm.requests.success{*}.as_count()',
                          aggregator: 'sum',
                        },
                      ],
                      responseFormat: 'scalar',
                    },
                  ],
                  title: 'Total Requests (24h)',
                  titleSize: '16',
                  titleAlign: 'left',
                  precision: 0,
                },
              },
              // Success Rate
              {
                definition: {
                  type: 'query_value',
                  requests: [
                    {
                      formulas: [{ formula: '(query1 / (query1 + query2)) * 100' }],
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'query1',
                          query: 'sum:llm.requests.success{*}.as_count()',
                        },
                        {
                          dataSource: 'metrics',
                          name: 'query2',
                          query: 'sum:llm.requests.error{*}.as_count()',
                        },
                      ],
                      responseFormat: 'scalar',
                    },
                  ],
                  title: 'Success Rate (%)',
                  titleSize: '16',
                  titleAlign: 'left',
                  precision: 2,
                },
              },
              // Request Volume Over Time
              {
                definition: {
                  type: 'timeseries',
                  requests: [
                    {
                      formulas: [{ formula: 'query1' }],
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'query1',
                          query: 'sum:llm.requests.success{*}.as_rate()',
                        },
                      ],
                      responseFormat: 'timeseries',
                      style: {
                        palette: 'dog_classic',
                        lineType: 'solid',
                        lineWidth: 'normal',
                      },
                      displayType: 'line',
                    },
                  ],
                  title: 'Request Volume (requests/sec)',
                  showLegend: true,
                  legendLayout: 'auto',
                  legendColumns: ['avg', 'min', 'max', 'value', 'sum'],
                },
              },
            ],
          },
        },

        // ========== SECTION 2: LLM PERFORMANCE ==========
        {
          definition: {
            type: 'group',
            layoutType: 'ordered',
            title: '⚡ LLM Performance',
            widgets: [
              // Latency Percentiles
              {
                definition: {
                  type: 'timeseries',
                  requests: [
                    {
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'p50',
                          query: 'p50:llm.latency{*}',
                        },
                        {
                          dataSource: 'metrics',
                          name: 'p95',
                          query: 'p95:llm.latency{*}',
                        },
                        {
                          dataSource: 'metrics',
                          name: 'p99',
                          query: 'p99:llm.latency{*}',
                        },
                      ],
                      responseFormat: 'timeseries',
                      style: {
                        palette: 'dog_classic',
                      },
                      displayType: 'line',
                    },
                  ],
                  title: 'Response Latency (P50/P95/P99) ms',
                  showLegend: true,
                  yaxis: {
                    label: 'Latency (ms)',
                    scale: 'linear',
                    min: 'auto',
                    max: 'auto',
                  },
                },
              },
              // Token Throughput
              {
                definition: {
                  type: 'timeseries',
                  requests: [
                    {
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'total_tokens',
                          query: 'sum:llm.tokens.total{*}.as_rate()',
                        },
                      ],
                      responseFormat: 'timeseries',
                      displayType: 'line',
                    },
                  ],
                  title: 'Token Throughput (tokens/sec)',
                  showLegend: true,
                },
              },
              // Requests by Feature
              {
                definition: {
                  type: 'toplist',
                  requests: [
                    {
                      formulas: [{ formula: 'query1', limit: { count: 10, order: 'desc' } }],
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'query1',
                          query: 'sum:llm.requests.success{*} by {feature}.as_count()',
                          aggregator: 'sum',
                        },
                      ],
                      responseFormat: 'scalar',
                    },
                  ],
                  title: 'Requests by Feature Type',
                },
              },
            ],
          },
        },

        // ========== SECTION 3: COST ANALYSIS ==========
        {
          definition: {
            type: 'group',
            layoutType: 'ordered',
            title: '💰 Cost Analysis',
            widgets: [
              // Total Cost
              {
                definition: {
                  type: 'query_value',
                  requests: [
                    {
                      formulas: [{ formula: 'query1' }],
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'query1',
                          query: 'sum:llm.cost.total{*}',
                          aggregator: 'sum',
                        },
                      ],
                      responseFormat: 'scalar',
                    },
                  ],
                  title: 'Total Cost (24h) USD',
                  titleSize: '16',
                  titleAlign: 'left',
                  precision: 6,
                },
              },
              // Hourly Cost Trend
              {
                definition: {
                  type: 'timeseries',
                  requests: [
                    {
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'cost',
                          query: 'sum:llm.cost.total{*}.as_rate()*3600',
                        },
                      ],
                      responseFormat: 'timeseries',
                      displayType: 'area',
                      style: {
                        palette: 'warm',
                      },
                    },
                  ],
                  title: 'Estimated Hourly Cost (USD)',
                  yaxis: {
                    label: 'Cost (USD)',
                  },
                },
              },
              // Cost by Feature
              {
                definition: {
                  type: 'sunburst',
                  requests: [
                    {
                      formulas: [{ formula: 'query1' }],
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'query1',
                          query: 'sum:llm.cost.total{*} by {feature}',
                          aggregator: 'sum',
                        },
                      ],
                      responseFormat: 'scalar',
                    },
                  ],
                  title: 'Cost Distribution by Feature',
                  legendTable: {
                    type: 'table',
                  },
                },
              },
            ],
          },
        },

        // ========== SECTION 4: TOKEN USAGE ==========
        {
          definition: {
            type: 'group',
            layoutType: 'ordered',
            title: '🔢 Token Usage',
            widgets: [
              // Token Distribution
              {
                definition: {
                  type: 'timeseries',
                  requests: [
                    {
                      queries: [
                        {
                          dataSource: 'metrics',
                          name: 'prompt',
                          query: 'avg:llm.tokens.prompt{*}',
                        },
                        {
                          dataSource: 'metrics',
                          name: 'completion',
                          query: 'avg:llm.tokens.completion{*}',
                        },
                      ],
                      responseFormat: 'timeseries',
                      displayType: 'bars',
                      style: {
                        palette: 'dog_classic',
                      },
                    },
                  ],
                  title: 'Average Tokens per Request',
                  showLegend: true,
                },
              },
            ],
          },
        },
      ],
      templateVariables: [],
      notifyList: [],
      reflow_type: 'fixed',
    },
  };

  try {
    const dashboard = await dashboardsApi.createDashboard(dashboardParams);
    console.log('✅ Dashboard created successfully!');
    console.log(`   Dashboard ID: ${dashboard.id}`);
    console.log(`   URL: https://app.${config.datadog.site}/dashboard/${dashboard.id}`);
    console.log(`\n   🔗 Open this URL in your browser to view the dashboard!\n`);
    return dashboard;
  } catch (error) {
    console.error('❌ Failed to create dashboard:', error);
    throw error;
  }
}

async function createMonitors() {
  console.log('\n🔔 Creating Detection Rules (Monitors)...\n');

  const monitors = [
    // Monitor 1: High Latency
    {
      name: '⚠️ LLM Latency Spike',
      type: 'metric alert' as v1.MonitorType,
      query: 'avg(last_5m):p95:llm.latency{*} > 5000',
      message: `LLM response latency exceeded 5 seconds (P95).
      
**Impact**: Users experiencing slow responses
**Action Required**: 
1. Check Gemini API status
2. Review recent model deployments
3. Investigate rate limiting

@notification-llm-team`,
      tags: ['service:llm-observability', 'severity:high', 'component:gemini'],
      priority: 2,
      options: {
        thresholds: {
          critical: 5000,
          warning: 3000,
        },
        notifyNoData: false,
        requireFullWindow: false,
        notifyAudit: false,
        includeTags: true,
      },
    },

    // Monitor 2: Error Rate
    {
      name: '🚨 LLM Error Rate Critical',
      type: 'metric alert' as v1.MonitorType,
      query: 'sum(last_5m):sum:llm.requests.error{*}.as_rate() / (sum:llm.requests.success{*}.as_rate() + sum:llm.requests.error{*}.as_rate()) > 0.05',
      message: `LLM error rate exceeded 5% threshold.
      
**Impact**: Critical - Multiple requests failing
**Action Required**:
1. Check Datadog APM for error details
2. Verify Gemini API key validity
3. Review error patterns in logs

**Context**: This creates an INCIDENT (critical priority)

@pagerduty-llm-oncall`,
      tags: ['service:llm-observability', 'severity:critical', 'component:gemini'],
      priority: 1,
      options: {
        thresholds: {
          critical: 0.05,
          warning: 0.02,
        },
        notifyNoData: false,
        requireFullWindow: true,
        notifyAudit: false,
        includeTags: true,
      },
    },

    // Monitor 3: Cost Anomaly
    {
      name: '💸 LLM Cost Anomaly Detected',
      type: 'metric alert' as v1.MonitorType,
      query: 'avg(last_1h):sum:llm.cost.total{*}.as_rate()*3600 > 0.1',
      message: `Hourly LLM cost exceeded baseline threshold.
      
**Impact**: Unexpected cost increase detected
**Action Required**:
1. Review cost by feature breakdown
2. Check for traffic spikes
3. Investigate expensive conversations

**Baseline**: Normal hourly cost is ~$0.05

@notification-finops`,
      tags: ['service:llm-observability', 'severity:medium', 'component:cost'],
      priority: 3,
      options: {
        thresholds: {
          critical: 0.1,
          warning: 0.07,
        },
        notifyNoData: false,
        requireFullWindow: false,
        notifyAudit: false,
        includeTags: true,
      },
    },
  ];

  const createdMonitors: v1.Monitor[] = [];

  for (const monitorConfig of monitors) {
    try {
      const monitor = await monitorsApi.createMonitor({
        body: monitorConfig,
      });
      console.log(`✅ Created monitor: ${monitorConfig.name}`);
      console.log(`   Monitor ID: ${monitor.id}`);
      createdMonitors.push(monitor);
    } catch (error) {
      console.error(`❌ Failed to create monitor "${monitorConfig.name}":`, error);
    }
  }

  console.log(`\n✅ Created ${createdMonitors.length}/${monitors.length} monitors successfully\n`);
  return createdMonitors;
}

async function main() {
  console.log('🚀 Datadog Setup Script for LLM Observability\n');
  console.log(`   Site: ${config.datadog.site}`);
  console.log(`   Service: ${config.datadog.service}`);
  console.log(`   Environment: ${config.datadog.env}\n`);

  try {
    // Create dashboard
    const dashboard = await createDashboard();

    // Create monitors
    const monitors = await createMonitors();

    console.log('\n✅ Datadog setup complete!\n');
    console.log('📊 Dashboard URL:');
    console.log(`   https://app.${config.datadog.site}/dashboard/${dashboard.id}\n`);
    console.log('🔔 Monitors created:');
    monitors.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.name} (ID: ${m.id})`);
    });
    console.log('\n🎉 Ready to monitor your LLM application!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
main();
