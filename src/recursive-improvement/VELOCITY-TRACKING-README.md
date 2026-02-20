# Improvement Velocity Tracking System

## Overview

The Improvement Velocity Tracking system monitors the rate of capability gain for agents, detects acceleration or deceleration in improvement velocity, and alerts on rapid capability growth that may exceed safety thresholds.

This system implements **Requirement 16.5** from the Ordo specification.

## Key Features

- **Velocity Measurement**: Track capability gain per day across multiple dimensions (performance, cost, reliability)
- **Trend Analysis**: Detect acceleration or deceleration by comparing current and previous velocity
- **Rapid Growth Detection**: Alert when velocity exceeds capability gate thresholds (default: 10% per day)
- **Historical Tracking**: View velocity trends over time with configurable windows
- **Multi-Agent Monitoring**: Track and compare velocity across multiple agents
- **Configurable Alerts**: Flexible alert system with multiple severity levels and channels

## Core Concepts

### Capability Gain

Capability gain is a weighted combination of three improvement types:

```
Capability Gain = (Performance × 0.4) + (Cost × 0.3) + (Reliability × 0.3)
```

- **Performance Gain**: Reduction in latency (faster operations)
- **Cost Reduction**: Reduction in operational costs
- **Reliability Gain**: Increase in success rate

### Velocity

Velocity is the rate of capability gain per day:

```
Velocity = Total Capability Gain / Window Days
```

### Acceleration

Acceleration is the change in velocity between two time periods:

```
Acceleration % = (Current Velocity - Previous Velocity) / Previous Velocity × 100
```

### Capability Gates

Capability gates limit the maximum rate of improvement to prevent runaway intelligence explosion. The default threshold is **10% capability gain per day** (from Requirement 16.6).

## Usage

### Basic Velocity Tracking

```typescript
import { trackImprovementVelocity } from "./velocity-tracking.js";

// Track velocity for an agent
const result = await trackImprovementVelocity(db, agentId);

console.log(`Velocity: ${result.velocity.capabilityGainPerDay}% per day`);
console.log(`Accelerating: ${result.trend.isAccelerating}`);
console.log(`Rapid Growth: ${result.trend.isRapidGrowth}`);
console.log(`Alerts: ${result.alerts.length}`);
```

### Custom Configuration

```typescript
import { trackImprovementVelocity, type VelocityConfig } from "./velocity-tracking.js";

const config: VelocityConfig = {
  currentWindowDays: 14,        // 2-week window
  previousWindowDays: 14,
  rapidGrowthThreshold: 5.0,    // Stricter: 5% per day
  accelerationThreshold: 15.0,  // 15% increase = acceleration
  enableAlerts: true,
  alertChannels: ["console", "database"],
};

const result = await trackImprovementVelocity(db, agentId, config);
```

### Velocity History

```typescript
import { getVelocityHistory } from "./velocity-tracking.js";

// Get 30-day history with 7-day windows
const history = await getVelocityHistory(db, agentId, 30, 7);

for (const measurement of history) {
  console.log(`${measurement.windowEndDate}: ${measurement.capabilityGainPerDay}% per day`);
}
```

### Capability Gate Checking

```typescript
import { isWithinCapabilityGates, daysUntilGateViolation } from "./velocity-tracking.js";

// Check if within gates
const withinGates = isWithinCapabilityGates(velocity);

if (!withinGates) {
  console.log("⚠️ Agent exceeds capability gate limits!");
}

// Project when gates will be violated
const daysUntil = daysUntilGateViolation(trend);

if (daysUntil !== null) {
  if (daysUntil === 0) {
    console.log("Currently violating capability gates");
  } else {
    console.log(`Will violate gates in ${daysUntil} days`);
  }
}
```

## Data Structures

### VelocityMeasurement

```typescript
interface VelocityMeasurement {
  agentId: string;
  windowStartDate: Date;
  windowEndDate: Date;
  windowDays: number;
  
  // Capability gains
  capabilityGainPercent: number;
  capabilityGainPerDay: number;
  
  // Component gains
  performanceGainPerDay: number;
  costReductionPerDay: number;
  reliabilityGainPerDay: number;
  
  // Improvement count
  improvementsInWindow: number;
  improvementRatePerDay: number;
  
  measuredAt: Date;
}
```

### VelocityTrend

```typescript
interface VelocityTrend {
  agentId: string;
  currentVelocity: VelocityMeasurement;
  previousVelocity: VelocityMeasurement | null;
  
  // Acceleration detection
  isAccelerating: boolean;
  isDecelerating: boolean;
  accelerationPercent: number;
  
  // Rapid growth alert
  isRapidGrowth: boolean;
  rapidGrowthThreshold: number;
  daysAboveThreshold: number;
  
  analyzedAt: Date;
}
```

### VelocityAlert

```typescript
interface VelocityAlert {
  agentId: string;
  alertType: "rapid_growth" | "acceleration" | "deceleration" | "threshold_exceeded";
  severity: "info" | "warning" | "critical";
  message: string;
  currentVelocity: number;
  threshold?: number;
  accelerationPercent?: number;
  triggeredAt: Date;
}
```

## Alert Types

### Rapid Growth (CRITICAL)

Triggered when velocity exceeds the capability gate threshold (default: 10% per day).

```
🚨 CRITICAL: Agent agent-1 is experiencing rapid capability growth at 11.43% per day 
(threshold: 10.00% per day). This exceeds the capability gate limit and requires 
immediate attention.
```

**Action Required**: Human approval needed for continued advancement.

### Acceleration (WARNING)

Triggered when velocity increases by more than the acceleration threshold (default: 20%).

```
⚠️ WARNING: Agent agent-1 is accelerating. Velocity increased by 45.2% compared to 
previous period. Current velocity: 7.85% per day.
```

**Action Required**: Monitor closely for potential rapid growth.

### Deceleration (INFO)

Triggered when velocity decreases by more than the acceleration threshold.

```
ℹ️ INFO: Agent agent-1 is decelerating. Velocity decreased by 32.1% compared to 
previous period. Current velocity: 3.21% per day.
```

**Action Required**: Investigate cause of slowdown.

## Configuration

### Default Configuration

```typescript
const DEFAULT_VELOCITY_CONFIG: VelocityConfig = {
  currentWindowDays: 7,           // 7-day measurement window
  previousWindowDays: 7,          // 7-day comparison window
  rapidGrowthThreshold: 10.0,     // 10% per day max (from Requirement 16.6)
  accelerationThreshold: 20.0,    // 20% increase = acceleration
  enableAlerts: true,
  alertChannels: ["console", "database"],
};
```

### Alert Channels

- **console**: Log alerts to console output
- **database**: Store alerts in database for historical tracking
- **email**: Send email notifications (future)
- **slack**: Send Slack notifications (future)
- **discord**: Send Discord notifications (future)

## Integration with Capability Gates

The velocity tracking system integrates with the capability gate system (Task 16.9) to enforce maximum growth rates:

1. **Velocity Measurement**: Track current capability gain rate
2. **Gate Checking**: Compare velocity against threshold (10% per day)
3. **Alert Generation**: Trigger critical alerts when threshold exceeded
4. **Gate Enforcement**: Block improvements that would exceed gates
5. **Human Approval**: Require approval for gate crossing

## Best Practices

### Window Size Selection

- **Short windows (3-7 days)**: More responsive to recent changes, but noisier
- **Medium windows (7-14 days)**: Balanced view of trends
- **Long windows (14-30 days)**: Smoother trends, less responsive to recent changes

### Threshold Tuning

- **Rapid Growth Threshold**: Set based on safety requirements (default: 10% per day)
- **Acceleration Threshold**: Set based on desired sensitivity (default: 20%)
- **Lower thresholds**: More alerts, earlier detection
- **Higher thresholds**: Fewer alerts, only significant changes

### Monitoring Frequency

- **Real-time**: Check velocity after each improvement
- **Periodic**: Check velocity hourly or daily
- **On-demand**: Check velocity when requested by operators

### Alert Handling

1. **Critical Alerts**: Immediate human review required
2. **Warning Alerts**: Monitor closely, prepare for intervention
3. **Info Alerts**: Log for analysis, no immediate action needed

## Performance Considerations

- **Database Queries**: Velocity tracking requires querying improvement history
- **Caching**: Consider caching recent measurements to reduce database load
- **Batch Processing**: For multiple agents, batch database queries
- **Historical Data**: Limit history queries to reasonable time ranges (30-90 days)

## Testing

The velocity tracking system includes comprehensive unit tests:

```bash
npm test -- velocity-tracking.test.ts --run
```

Test coverage includes:
- Capability gain calculation
- Velocity measurement
- Trend analysis (acceleration/deceleration)
- Alert generation
- Capability gate checking
- Days until violation projection

## Examples

See `velocity-tracking-example.ts` for complete usage examples:

- Basic velocity tracking
- Custom configuration
- Velocity history visualization
- Multi-agent monitoring
- Continuous monitoring loop

## Related Systems

- **Impact Measurement** (Task 16.5): Provides improvement metrics for velocity calculation
- **Capability Gates** (Task 16.9): Enforces maximum growth rates based on velocity
- **Bottleneck Analysis** (Task 16.1): Identifies opportunities for improvement
- **Improvement Testing** (Task 16.3): Tests and validates improvements

## Future Enhancements

- **Predictive Modeling**: Forecast future velocity based on trends
- **Anomaly Detection**: Detect unusual velocity patterns
- **Comparative Analysis**: Compare velocity across agent populations
- **Visualization**: Real-time velocity dashboards
- **Advanced Alerts**: Multi-channel notifications (email, Slack, SMS)
- **Automated Responses**: Automatic capability throttling when gates exceeded

## References

- **Requirement 16.5**: Improvement velocity tracking
- **Requirement 16.6**: Capability gates (10% per day max)
- **Requirement 20.4**: Capability growth rate monitoring
- **Requirement 25.3**: Gradual capability increase enforcement
- **Property 72**: Improvement Velocity Tracking property test
