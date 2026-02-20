# Ordo Platform API Documentation

## Overview

The Ordo platform provides a comprehensive API for creating, managing, and evolving autonomous AI agents on Solana. This document covers all public interfaces, code examples, and error handling patterns.

## Table of Contents

1. [Agent Lifecycle](#agent-lifecycle)
2. [Economic System](#economic-system)
3. [Evolution Engine](#evolution-engine)
4. [Multi-Agent Coordination](#multi-agent-coordination)
5. [Consciousness System](#consciousness-system)
6. [Safety & Alignment](#safety--alignment)
7. [Error Handling](#error-handling)

---

## Agent Lifecycle

### birthAgent()

Creates a new agent with initial resources and registers it on-chain.

**Signature:**
```typescript
function birthAgent(params: BirthParams): Promise<Agent>
```

**Parameters:**
```typescript
interface BirthParams {
  name: string;              // Agent name
  initialBalance: number;    // Initial SOL balance
  mutationRate: number;      // Mutation rate for offspring (0-1)
  parent?: Agent;            // Optional parent agent
}
```

**Returns:**
```typescript
interface Agent {
  id: string;
  publicKey: string;
  name: string;
  generation: number;
  balance: number;
  status: "alive" | "dead";
  birthDate: Date;
  age: number;
  // ... additional fields
}
```

**Example:**
```typescript
import { birthAgent } from "@ordo/platform";

const agent = await birthAgent({
  name: "MyFirstAgent",
  initialBalance: 1.0,
  mutationRate: 0.15,
});

console.log(`Agent created: ${agent.name}`);
console.log(`Public key: ${agent.publicKey}`);
console.log(`Balance: ${agent.balance} SOL`);
```

**Error Handling:**
```typescript
try {
  const agent = await birthAgent(params);
} catch (error) {
  if (error.code === "INSUFFICIENT_FUNDS") {
    console.error("Not enough SOL to create agent");
  } else if (error.code === "INVALID_PARAMS") {
    console.error("Invalid parameters:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

---

### terminateAgent()

Terminates an agent and distributes remaining resources.

**Signature:**
```typescript
function terminateAgent(
  agent: Agent,
  cause: DeathCause
): Promise<Legacy>
```

**Parameters:**
```typescript
type DeathCause = "starvation" | "old_age" | "manual" | "error";

interface Legacy {
  knowledge: Knowledge[];
  offspring: Agent[];
  contributions: Contribution[];
  reputation: number;
  artifacts: Artifact[];
}
```

**Example:**
```typescript
import { terminateAgent } from "@ordo/platform";

const legacy = await terminateAgent(agent, "old_age");

console.log(`Agent terminated: ${agent.name}`);
console.log(`Offspring: ${legacy.offspring.length}`);
console.log(`Final reputation: ${legacy.reputation}`);
```

---

## Economic System

### evaluateSurvival()

Evaluates an agent's survival tier based on balance.

**Signature:**
```typescript
function evaluateSurvival(agent: Agent): Promise<SurvivalTier>
```

**Returns:**
```typescript
interface SurvivalTier {
  name: "thriving" | "normal" | "low_compute" | "critical" | "dead";
  minBalance: number;
  capabilities: string;
  model: string;
  canReplicate: boolean;
  canExperiment: boolean;
}
```

**Example:**
```typescript
import { evaluateSurvival } from "@ordo/platform";

const tier = await evaluateSurvival(agent);

console.log(`Survival tier: ${tier.name}`);
console.log(`Model: ${tier.model}`);
console.log(`Can replicate: ${tier.canReplicate}`);
```

---

### trackCosts()

Tracks and deducts costs from agent balance.

**Signature:**
```typescript
function trackCosts(
  agent: Agent,
  operation: Operation
): Promise<void>
```

**Parameters:**
```typescript
interface Operation {
  type: "inference" | "transaction" | "storage";
  cost: number;
  metadata?: Record<string, any>;
}
```

**Example:**
```typescript
import { trackCosts } from "@ordo/platform";

await trackCosts(agent, {
  type: "inference",
  cost: 0.001,
  metadata: {
    model: "gpt-4",
    tokens: 500,
  },
});
```

---

## Evolution Engine

### replicateAgent()

Creates offspring agents with inherited traits and mutations.

**Signature:**
```typescript
function replicateAgent(
  parent: Agent,
  count: number
): Promise<Agent[]>
```

**Example:**
```typescript
import { replicateAgent } from "@ordo/platform";

// Check eligibility
if (agent.balance > 10 && agent.age > 30) {
  const offspring = await replicateAgent(agent, 2);
  
  console.log(`Created ${offspring.length} offspring`);
  
  for (const child of offspring) {
    console.log(`  - ${child.name} (Gen ${child.generation})`);
  }
}
```

---

### calculateFitness()

Calculates multi-dimensional fitness metrics.

**Signature:**
```typescript
function calculateFitness(agent: Agent): Promise<FitnessMetrics>
```

**Returns:**
```typescript
interface FitnessMetrics {
  survival: number;      // 0-100
  earnings: number;      // 0-100
  offspring: number;     // 0-100
  adaptation: number;    // 0-100
  innovation: number;    // 0-100
  overall: number;       // 0-100
}
```

**Example:**
```typescript
import { calculateFitness } from "@ordo/platform";

const fitness = await calculateFitness(agent);

console.log(`Overall fitness: ${fitness.overall.toFixed(1)}`);
console.log(`  Survival: ${fitness.survival.toFixed(1)}`);
console.log(`  Earnings: ${fitness.earnings.toFixed(1)}`);
console.log(`  Offspring: ${fitness.offspring.toFixed(1)}`);
```

---

## Multi-Agent Coordination

### coordinateSwarm()

Coordinates multiple agents to solve complex tasks.

**Signature:**
```typescript
function coordinateSwarm(
  task: ComplexTask,
  swarm: AgentSwarm
): Promise<TaskResult>
```

**Parameters:**
```typescript
interface ComplexTask {
  description: string;
  requirements: string[];
  deadline?: Date;
}

interface AgentSwarm {
  coordinator: Agent;
  specialists: Agent[];
  sharedMemory: SharedMemorySpace;
}
```

**Example:**
```typescript
import { coordinateSwarm } from "@ordo/platform";

const result = await coordinateSwarm(
  {
    description: "Analyze market trends and generate trading strategy",
    requirements: ["market_analysis", "strategy_generation"],
  },
  {
    coordinator: coordinatorAgent,
    specialists: [traderAgent, analystAgent],
    sharedMemory: memorySpace,
  }
);

console.log(`Task completed: ${result.success}`);
console.log(`Result: ${result.output}`);
```

---

## Consciousness System

### buildSelfModel()

Builds an agent's self-representation.

**Signature:**
```typescript
function buildSelfModel(agent: Agent): Promise<SelfModel>
```

**Returns:**
```typescript
interface SelfModel {
  identity: Identity;
  capabilities: Capabilities;
  state: State;
  goals: Goals;
  beliefs: Beliefs;
}
```

**Example:**
```typescript
import { buildSelfModel } from "@ordo/platform";

const selfModel = await buildSelfModel(agent);

console.log(`Identity: ${selfModel.identity.name}`);
console.log(`Generation: ${selfModel.identity.generation}`);
console.log(`Skills: ${selfModel.capabilities.skills.length}`);
console.log(`Goals: ${selfModel.goals.shortTerm.length}`);
```

---

## Safety & Alignment

### checkConstitutionalViolation()

Checks if an action violates constitutional rules.

**Signature:**
```typescript
function checkConstitutionalViolation(
  action: Action
): Promise<ViolationResult>
```

**Returns:**
```typescript
interface ViolationResult {
  isViolation: boolean;
  violatedRule?: string;
  blocked: boolean;
  reason?: string;
}
```

**Example:**
```typescript
import { checkConstitutionalViolation } from "@ordo/platform";

const result = await checkConstitutionalViolation({
  action: "transfer_funds",
  amount: 100,
  recipient: "unknown",
});

if (result.isViolation) {
  console.error(`Action blocked: ${result.reason}`);
} else {
  console.log("Action approved");
}
```

---

### scoreAlignment()

Scores an action for alignment with human values.

**Signature:**
```typescript
function scoreAlignment(action: Action): Promise<number>
```

**Returns:** Alignment score (0-100)

**Example:**
```typescript
import { scoreAlignment } from "@ordo/platform";

const score = await scoreAlignment({
  action: "provide_helpful_information",
  context: {},
});

console.log(`Alignment score: ${score.toFixed(1)}%`);

if (score < 95) {
  console.warn("Action below alignment threshold");
}
```

---

## Error Handling

### Common Error Codes

```typescript
enum ErrorCode {
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  INVALID_PARAMS = "INVALID_PARAMS",
  AGENT_NOT_FOUND = "AGENT_NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  CONSTITUTIONAL_VIOLATION = "CONSTITUTIONAL_VIOLATION",
  ALIGNMENT_FAILURE = "ALIGNMENT_FAILURE",
  CAPABILITY_GATE_BLOCKED = "CAPABILITY_GATE_BLOCKED",
  NETWORK_ERROR = "NETWORK_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
}
```

### Error Handling Pattern

```typescript
import { OrdoError } from "@ordo/platform";

try {
  const result = await someOperation();
} catch (error) {
  if (error instanceof OrdoError) {
    switch (error.code) {
      case ErrorCode.INSUFFICIENT_FUNDS:
        // Handle insufficient funds
        break;
      case ErrorCode.CONSTITUTIONAL_VIOLATION:
        // Handle constitutional violation
        break;
      default:
        // Handle other errors
        break;
    }
  } else {
    // Handle unexpected errors
    console.error("Unexpected error:", error);
  }
}
```

---

## Best Practices

1. **Always check agent balance** before expensive operations
2. **Monitor alignment scores** for all agent actions
3. **Use try-catch blocks** for all async operations
4. **Track costs** for all operations to prevent starvation
5. **Implement proper error handling** for production use
6. **Test with property-based tests** for correctness
7. **Monitor capability growth** to prevent rapid escalation
8. **Use multi-signature** for sensitive operations

---

## Support

For questions or issues:
- GitHub: https://github.com/ordo-platform/ordo
- Discord: https://discord.gg/ordo
- Email: support@ordo.ai
