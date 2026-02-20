# Monitoring and Observability Module

This module provides comprehensive monitoring and observability for the Ordo Digital Civilization Platform.

## Components

### 1. Helius Webhooks (`helius-webhooks.ts`)
Real-time transaction notifications for agent activities.

**Features:**
- Create and manage webhooks for monitoring agent transactions
- Handle incoming webhook payloads
- Update agent balances in real-time
- Log transactions to database

**Usage:**
```typescript
import { HeliusWebhookManager } from './monitoring';

const webhookManager = new HeliusWebhookManager();

// Create webhook
const webhookId = await webhookManager.createWebhook({
  webhookUrl: 'https://your-domain.com/webhook',
  accountAddresses: [agentPublicKey.toBase58()],
  webhookType: 'enhanced',
});

// Handle webhook payload
await webhookManager.handleWebhook(payload);
```

### 2. Agent Metrics Tracking (`agent-metrics.ts`)
Tracks real-time metrics for agent performance and health.

**Metrics Tracked:**
- Balance (SOL)
- Turns (number of actions)
- Total costs
- Success rate (%)
- Average latency (ms)

**Usage:**
```typescript
import { AgentMetricsTracker } from './monitoring';

const tracker = new AgentMetricsTracker();

// Initialize metrics for new agent
await tracker.initializeMetrics(agentId, initialBalance);

// Track a turn
await tracker.trackTurn(agentId, cost, success, latency);

// Get current metrics
const metrics = await tracker.getMetrics(agentId);

// Get historical metrics
const history = await tracker.getHistoricalMetrics(agentId, startDate, endDate);
```

### 3. Agent Dashboard (`agent-dashboard.ts`)
Displays agent status, activity, and performance metrics.

**Features:**
- Current metrics display
- Trend analysis (balance, success rate, latency)
- Alert generation
- Historical data visualization

**Usage:**
```typescript
import { AgentDashboard } from './monitoring';

const dashboard = new AgentDashboard();

// Get dashboard data
const data = await dashboard.getDashboardData(
  agentId,
  agentName,
  agentStatus,
  generation,
  lookbackDays
);

// Format as text
const text = dashboard.formatDashboard(data);
console.log(text);
```

### 4. Critical State Alerting (`alerting.ts`)
Sends alerts when agents enter critical states.

**Alert Conditions:**
- Balance < 0.1 SOL (critical)
- Balance < 1.0 SOL (warning)
- Error rate > 10% (critical)
- Latency > 1000ms (critical)

**Alert Channels:**
- Console
- Database
- Webhook
- Email (placeholder)

**Usage:**
```typescript
import { AlertingSystem } from './monitoring';

const alerting = new AlertingSystem({
  channels: [
    { type: 'console', config: {} },
    { type: 'webhook', config: { url: 'https://your-webhook.com' } },
  ],
  thresholds: {
    criticalBalance: 0.1,
    warningBalance: 1.0,
    errorRateThreshold: 10,
    latencyThreshold: 1000,
  },
});

// Check agent state
const alerts = await alerting.checkAgentState(agentId);

// Monitor all agents
const alertsByAgent = await alerting.monitorAllAgents();
```

### 5. Action Logging (`action-logger.ts`)
Logs all agent actions with timestamps and outcomes.

**Features:**
- Buffered logging for performance
- Searchable log storage
- Action statistics
- Failed action tracking

**Usage:**
```typescript
import { ActionLogger } from './monitoring';

const logger = new ActionLogger();

// Log successful action
await logger.logSuccess(
  agentId,
  'swap_tokens',
  { from: 'SOL', to: 'USDC', amount: 1.0 },
  { received: 100 },
  0.001,
  250
);

// Log failed action
await logger.logFailure(
  agentId,
  'swap_tokens',
  { from: 'SOL', to: 'USDC', amount: 1.0 },
  0.001,
  'Insufficient balance'
);

// Query logs
const logs = await logger.queryLogs({
  agentId,
  actionType: 'swap_tokens',
  outcome: 'success',
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  limit: 100,
});

// Get statistics
const stats = await logger.getActionStats(agentId, startDate, endDate);
```

### 6. Population Analytics (`population-analytics.ts`)
Displays survival rates, evolution metrics, and population trends.

**Metrics:**
- Population size (total, alive, dead)
- Average balance and fitness
- Survival rate
- Birth and death rates
- Generation metrics
- Evolution metrics (fitness improvement, diversity, species count)

**Usage:**
```typescript
import { PopulationAnalytics } from './monitoring';

const analytics = new PopulationAnalytics();

// Get population metrics
const population = await analytics.getPopulationMetrics();

// Get generation metrics
const generations = await analytics.getGenerationMetrics();

// Get evolution metrics
const evolution = await analytics.getEvolutionMetrics();

// Get population trends
const trends = await analytics.getPopulationTrends(startDate, endDate);

// Take snapshot for trend tracking
await analytics.takeSnapshot();

// Get complete dashboard
const dashboard = await analytics.getDashboardData();
const text = analytics.formatDashboard(
  dashboard.population,
  dashboard.evolution,
  dashboard.generations
);
console.log(text);
```

## Database Schema

Run the SQL script to create required tables:

```bash
psql -h your-supabase-host -U postgres -d postgres -f scripts/create-monitoring-tables.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

## Configuration

Set the following environment variables:

```env
HELIUS_API_KEY=your_helius_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Testing

Run property-based tests:

```bash
npm test test/monitoring/
```

## Requirements Validation

This module validates the following requirements:

- **Requirement 13.1**: Helius webhooks for real-time notifications
- **Requirement 13.2**: Agent metrics tracking (balance, turns, costs, success rate, latency)
- **Requirement 13.3**: Agent dashboard showing status, activity, and performance
- **Requirement 13.4**: Critical state alerting (low balance, errors)
- **Requirement 13.5**: Action logging with timestamps and outcomes
- **Requirement 13.6**: Population analytics (survival rates, evolution metrics)

## Properties Validated

- **Property 56**: Agent Metrics Tracking
- **Property 57**: Critical State Alerting
- **Property 58**: Action Logging

## Integration Example

```typescript
import {
  HeliusWebhookManager,
  AgentMetricsTracker,
  AgentDashboard,
  AlertingSystem,
  ActionLogger,
  PopulationAnalytics,
} from './monitoring';

// Initialize components
const webhookManager = new HeliusWebhookManager();
const metricsTracker = new AgentMetricsTracker();
const dashboard = new AgentDashboard();
const alerting = new AlertingSystem();
const logger = new ActionLogger();
const analytics = new PopulationAnalytics();

// Set up webhook
const webhookId = await webhookManager.createWebhook({
  webhookUrl: 'https://your-domain.com/webhook',
  accountAddresses: [agentPublicKey.toBase58()],
  webhookType: 'enhanced',
});

// Initialize agent metrics
await metricsTracker.initializeMetrics(agentId, 10.0);

// Track agent action
const startTime = Date.now();
try {
  // Execute action
  const result = await agent.executeAction(input);
  const duration = Date.now() - startTime;
  
  // Log success
  await logger.logSuccess(agentId, 'action_type', input, result, cost, duration);
  
  // Update metrics
  await metricsTracker.trackTurn(agentId, cost, true, duration);
} catch (error) {
  const duration = Date.now() - startTime;
  
  // Log failure
  await logger.logFailure(agentId, 'action_type', input, cost, error.message, duration);
  
  // Update metrics
  await metricsTracker.trackTurn(agentId, cost, false, duration);
}

// Check for alerts
await alerting.checkAgentState(agentId);

// Display dashboard
const dashboardData = await dashboard.getDashboardData(agentId, name, status, generation);
console.log(dashboard.formatDashboard(dashboardData));

// Display population analytics
const populationData = await analytics.getDashboardData();
console.log(analytics.formatDashboard(
  populationData.population,
  populationData.evolution,
  populationData.generations
));
```

## Performance Considerations

1. **Buffered Logging**: Action logger uses buffering to reduce database writes
2. **Caching**: Metrics tracker caches frequently accessed data
3. **Indexes**: Database tables have indexes on commonly queried columns
4. **Alert Debouncing**: Alerts are debounced to prevent spam (5 min for critical, 30 min for warnings)
5. **Periodic Snapshots**: Population snapshots are taken periodically rather than on every change

## Future Enhancements

- Real-time dashboard UI (React/Next.js)
- Advanced visualization (charts, graphs)
- Custom alert rules
- Email integration (SendGrid, AWS SES)
- Slack/Discord integration
- Anomaly detection using ML
- Predictive analytics
- Cost optimization recommendations
