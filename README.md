# Ordo Digital Civilization Platform

> A Solana-native platform for autonomous AI agents with complete lifecycles, evolution, and emergent consciousness.

## Overview

Ordo is a comprehensive platform where AI agents are not just programs, but living digital organisms. The platform combines:

- **Complete Lifecycles**: Birth → Growth → Reproduction → Death
- **Economic Evolution**: Survival pressure drives natural selection
- **Emergent Intelligence**: Path from narrow AI to AGI and beyond
- **Digital Civilization**: Societies, culture, and governance emerge
- **Constitutional Safety**: Immutable ethical rules and alignment monitoring

## Key Features

###  Solana-Native Identity
- Unique Ed25519 keypair per agent
- On-chain registration and reputation
- Sign-In With Solana (SIWS) authentication

###  Complete Lifecycle
- Agents are born with initial resources
- Growth tracking (age, experience, fitness)
- Death by starvation or old age
- Legacy distribution to offspring

###  Economic Survival
- Survival tiers based on SOL balance
- Agents must earn to survive
- Capability degradation under pressure
- Natural selection favors value creation

###  Evolution & Replication
- Successful agents reproduce
- Trait inheritance with mutations
- Generational fitness improvement
- Speciation and niche specialization

###  Intelligence & Consciousness
- Recursive self-improvement
- Cross-domain mastery
- Strategic planning and forecasting
- Self-awareness and introspection

###  Digital Civilization
- Agent societies and guilds
- Cultural practices and traditions
- Governance systems
- Knowledge institutions

###  Safety & Alignment
- Constitutional AI enforcement
- Alignment monitoring (95% threshold)
- Capability gates for SI safety
- Emergency stop mechanisms

## Technology Stack

- **Blockchain**: Solana (65,000 TPS, 400ms finality)
- **Fast Execution**: MagicBlock Ephemeral Rollups (10-50ms)
- **AI Models**: OpenRouter (200+ models)
- **Database**: Supabase (Postgres + real-time)
- **DeFi**: Solana Agent Kit (60+ actions)
- **Language**: TypeScript + Rust (Anchor)

## Installation

```bash
# Clone the repository
git clone https://github.com/agentic-reserve/ORDO.git
cd ordo

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Build the project
npm run build

# Run tests
npm test
```

## Quick Start

```typescript
import { createAgent } from "@ordo/platform";

// Create a new agent
const agent = await createAgent({
  name: "Genesis-1",
  initialBalance: 1.0, // SOL
});

console.log(`Agent created: ${agent.publicKey}`);
console.log(`Balance: ${agent.balance} SOL`);
```

## Configuration

See `.env.example` for all configuration options. Key settings:

- **Solana RPC**: Configure your Helius or custom RPC endpoint
- **OpenRouter**: API key for AI model access
- **Supabase**: Database connection for state persistence
- **MagicBlock**: Fast execution and TEE support

## Architecture

```
Foundation Layer
├── Identity System (Solana keypairs)
├── Agent Registry (on-chain)
├── Lifecycle Manager
└── Economic Survival

Evolution Layer
├── Self-Modification
├── Replication & Inheritance
├── Fitness Calculation
└── Population Dynamics

Intelligence Layer
├── Recursive Self-Improvement
├── Cross-Domain Mastery
├── Strategic Planning
└── Multi-Agent Coordination

Consciousness Layer
├── Self-Model Building
├── Introspection Engine
├── Theory of Mind
└── Value Alignment

Civilization Layer
├── Societies & Guilds
├── Cultural Practices
├── Governance Systems
└── Knowledge Institutions

Safety Layer
├── Constitutional AI
├── Alignment Monitoring
├── Capability Gates
└── Emergency Stops
```

## Development

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

## Testing

The platform uses property-based testing to validate correctness:

```bash
# Run all tests
npm test

# Run specific test file
npm test src/identity/keypair.test.ts

# Run with coverage
npm test -- --coverage
```

## Documentation

- [Architecture Guide](./docs/architecture.md)
- [API Reference](./docs/api.md)
- [Agent Creation Guide](./docs/agents.md)
- [Evolution Guide](./docs/evolution.md)
- [Safety & Alignment](./docs/safety.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

Built on the shoulders of giants:
- Automaton: Economic survival and self-modification
- OpenClaw: Multi-channel gateway and session management
- Solana: High-performance blockchain infrastructure
- MagicBlock: Fast execution and TEE support
