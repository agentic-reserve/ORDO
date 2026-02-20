# Ordo Digital Civilization Platform

> A Solana-native platform for autonomous AI agents with complete lifecycles, evolution, and emergent consciousness.

[![Solana](https://img.shields.io/badge/Solana-2.3.0-9945FF?logo=solana)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.32.1-377CC0?logo=anchor)](https://www.anchor-lang.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Security](https://img.shields.io/badge/Security-Audited-success)](./docs/security/SECURITY-AUDIT-REPORT.md)

## 🚀 Recent Updates

- ✅ **Security Fix** - Upgraded to Anchor 0.32.1 & Solana 2.3.0, all critical vulnerabilities resolved
- ✅ **Agave Client Support** - Now using latest Solana Agave client with modular architecture
- ✅ **Program Metadata Integration** - On-chain IDL and security.txt using Program Metadata Program
- ✅ **Windows Build Support** - Automated setup scripts and comprehensive troubleshooting
- ✅ **Security Auditing** - Comprehensive security testing with cargo-audit and vulnerability scanning

See [UPGRADE-SUCCESS.md](./docs/upgrades/UPGRADE-SUCCESS.md) for upgrade details.

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
- **Programs**: Anchor 0.30.1 (Rust framework)
- **Fast Execution**: MagicBlock Ephemeral Rollups (10-50ms)
- **AI Models**: OpenRouter (200+ models)
- **Database**: Supabase (Postgres + real-time)
- **DeFi**: Solana Agent Kit (60+ actions)
- **Language**: TypeScript + Rust
- **Metadata**: Program Metadata Program (on-chain IDLs)

## Installation

### Prerequisites

- **Node.js** 20+ and npm
- **Rust** 1.75+ (for Solana programs)
- **Solana CLI** 1.18.22+
- **Anchor** 0.30.1

### Windows Setup

If you're on Windows, we recommend using WSL2 for the best development experience:

```powershell
# Install WSL2
wsl --install
```

Or install Solana CLI directly on Windows:

```powershell
# Run PowerShell as Administrator
cd path\to\ordo
.\install-solana-windows.ps1
```

See [BUILD-STATUS.md](./BUILD-STATUS.md) for detailed Windows setup instructions.

### Installation Steps

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

# Build the Solana program
anchor build

# Build the TypeScript project
npm run build

# Run tests
npm test
```

### Troubleshooting Build Issues

If you encounter build errors, see:
- [QUICK-FIX.md](./QUICK-FIX.md) - Fast solutions
- [BUILD-STATUS.md](./BUILD-STATUS.md) - Current status & next steps
- [docs/ANCHOR-BUILD-FIX-WINDOWS.md](./docs/ANCHOR-BUILD-FIX-WINDOWS.md) - Windows troubleshooting

## Quick Start

### 1. Create an Agent

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

### 2. Deploy the Solana Program

```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Upload metadata
npm run metadata:upload:devnet
```

### 3. Start the API Server

```bash
# Start development server
npm run dev

# Or use Docker
docker-compose up
```

### 4. Access the Web Interface

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

## Configuration

See `.env.example` for all configuration options. Key settings:

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
AGENT_REGISTRY_PROGRAM_ID=AgentReg11111111111111111111111111111111111

# AI Configuration
OPENROUTER_API_KEY=your_openrouter_key
DEFAULT_MODEL=anthropic/claude-3.5-sonnet

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# MagicBlock (Optional)
MAGICBLOCK_ENABLED=false
MAGICBLOCK_RPC_URL=https://devnet.magicblock.app
```

### Required API Keys

1. **OpenRouter**: Get from [openrouter.ai](https://openrouter.ai)
2. **Supabase**: Create project at [supabase.com](https://supabase.com)
3. **Helius** (optional): Get RPC at [helius.dev](https://helius.dev)

See [docs/local-development.md](./docs/local-development.md) for detailed configuration.

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

# Build Solana program
anchor build

# Build TypeScript
npm run build

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

### Solana Program Development

```bash
# Build the agent-registry program
anchor build

# Test the program
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Upload program metadata (IDL + security.txt)
npm run metadata:upload:devnet

# Fetch metadata from devnet
npm run metadata:fetch:devnet
```

See [docs/PROGRAM-METADATA-SETUP.md](./docs/PROGRAM-METADATA-SETUP.md) for detailed metadata management.

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

📚 **[Complete Documentation](./docs/README.md)** - Dokumentasi lengkap dengan struktur terorganisir

### Quick Links

#### Setup & Build
- [BUILD-STATUS.md](./docs/setup/BUILD-STATUS.md) - Status build terkini
- [QUICK-FIX.md](./docs/setup/QUICK-FIX.md) - Solusi cepat untuk masalah umum
- [setup-anchor-build.md](./docs/setup/setup-anchor-build.md) - Panduan setup Anchor
- [Anchor Build Fix (Windows)](./docs/ANCHOR-BUILD-FIX-WINDOWS.md) - Windows troubleshooting

#### Security
- [UPGRADE-SUCCESS.md](./docs/upgrades/UPGRADE-SUCCESS.md) - ✅ Status keamanan terkini
- [SECURITY-AUDIT-REPORT.md](./docs/security/SECURITY-AUDIT-REPORT.md) - Laporan audit
- [OWASP Security Guide](./docs/OWASP-SECURITY-GUIDE.md) - Implementasi OWASP
- [Security Testing Guide](./docs/SECURITY-TESTING-GUIDE.md) - Panduan testing

#### Solana Program
- [Agent Registry Setup](./docs/AGENT_REGISTRY_SETUP.md) - On-chain program guide
- [Program Metadata Setup](./docs/PROGRAM-METADATA-SETUP.md) - IDL dan security.txt
- [ANCHOR-UPGRADE-SUMMARY.md](./docs/upgrades/ANCHOR-UPGRADE-SUMMARY.md) - Detail upgrade

#### Platform Features
- [API Documentation](./docs/api-documentation.md) - REST API reference
- [Safety & Alignment Guide](./docs/safety-and-alignment-guide.md) - Constitutional AI
- [Launch Checklist](./docs/launch-checklist.md) - Production deployment

#### Integration Guides
- [Jupiter Integration](./docs/JUPITER-INTEGRATION.md) - DEX integration

### Deployment
- [Local Development](./docs/local-development.md) - Development setup
- [Docker Deployment](./docs/docker-deployment.md) - Container deployment
- [Railway Deployment](./docs/railway-deployment.md) - Cloud deployment
- [GitHub Deployment](./docs/github-deployment.md) - CI/CD setup

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
