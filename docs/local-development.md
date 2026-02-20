# Local Development Guide

This guide explains how to set up and run the Ordo platform locally for development.

## Prerequisites

- Node.js 20+ installed
- npm or yarn installed
- Git installed
- Docker and Docker Compose (optional, for containerized development)
- Solana CLI tools (optional, for local validator)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/ordo-platform/ordo.git
cd ordo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

For local development, you can use:
- Local Solana validator (see below)
- Helius devnet RPC
- Local Supabase instance or cloud Supabase

### 4. Start Development Server

```bash
# Start with hot reload
npm run dev

# Or with debugger
npm run dev:debug
```

## Development Modes

### Mode 1: Native Development (Recommended)

Run directly on your machine with hot reload:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Features:
- Hot reload on file changes
- Fast iteration
- Direct debugging
- No Docker overhead

### Mode 2: Docker Development

Run in Docker containers with hot reload:

```bash
# Start all services
npm run dev:docker

# Or build and start
npm run dev:docker:build

# Stop services
npm run dev:docker:down
```

Features:
- Isolated environment
- Includes PostgreSQL, Redis, Solana validator
- Consistent across machines
- Easy cleanup

### Mode 3: Hybrid Development

Run app natively, services in Docker:

```bash
# Start only services
docker-compose -f docker-compose.dev.yml up postgres-dev redis-dev solana-validator-dev

# In another terminal, run app
npm run dev
```

Features:
- Best of both worlds
- Fast app iteration
- Isolated services
- Flexible configuration

## Local Services

### Solana Test Validator

#### Option 1: Docker

```bash
docker-compose -f docker-compose.dev.yml up solana-validator-dev
```

#### Option 2: Native

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Start validator
npm run dev:validator

# Or manually
solana-test-validator --reset --quiet
```

Access:
- RPC: http://localhost:8899
- Faucet: http://localhost:8900
- WebSocket: ws://localhost:9900

### PostgreSQL

#### Option 1: Docker

```bash
docker-compose -f docker-compose.dev.yml up postgres-dev
```

#### Option 2: Native

```bash
# Install PostgreSQL
# macOS
brew install postgresql@15

# Ubuntu
sudo apt install postgresql-15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb ordo_dev
```

Access:
- Host: localhost
- Port: 5432
- User: ordo_dev
- Password: ordo_dev_password
- Database: ordo_dev

### Redis

#### Option 1: Docker

```bash
docker-compose -f docker-compose.dev.yml up redis-dev
```

#### Option 2: Native

```bash
# Install Redis
# macOS
brew install redis

# Ubuntu
sudo apt install redis-server

# Start Redis
brew services start redis
```

Access:
- Host: localhost
- Port: 6379

### Supabase Local

#### Option 1: Docker

```bash
docker-compose -f docker-compose.dev.yml --profile supabase-local up supabase-dev
```

#### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start Supabase
supabase start
```

Access:
- API: http://localhost:54321
- Studio: http://localhost:54323
- Database: postgresql://postgres:postgres@localhost:54322/postgres

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

Edit files in `src/` directory. The dev server will automatically reload.

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### 4. Lint and Format

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### 5. Build

```bash
# Build TypeScript
npm run build

# Clean build artifacts
npm run clean
```

### 6. Commit Changes

```bash
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

## Debugging

### VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Ordo",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:debug"],
      "port": 9229,
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Chrome DevTools

```bash
# Start with debugger
npm run dev:debug

# Open Chrome
chrome://inspect

# Click "inspect" on your Node.js process
```

### Docker Debugging

```bash
# Start with debugger exposed
docker-compose -f docker-compose.dev.yml up

# Debugger available at localhost:9229
```

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/identity/keypair.test.ts

# Run tests matching pattern
npm test -- --grep "keypair"
```

### Property-Based Tests

```bash
# Run property tests
npm test -- --grep "Property"

# Run with more iterations
FAST_CHECK_NUM_RUNS=1000 npm test
```

### Integration Tests

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Run integration tests
npm test -- --grep "integration"

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Environment Variables

### Development Defaults

```env
# Solana (Local Validator)
SOLANA_RPC_URL=http://localhost:8899
SOLANA_NETWORK=localnet

# OpenRouter (Required)
OPENROUTER_API_KEY=your_key_here

# Supabase (Local or Cloud)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_key_here

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=true
```

### Using Devnet

```env
# Solana Devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
HELIUS_API_KEY=your_helius_devnet_key

# Request devnet SOL from faucet
# solana airdrop 2 <your-address> --url devnet
```

## Hot Reload

The development server uses `tsx watch` for hot reload:

```bash
npm run dev
```

Changes to TypeScript files will automatically:
1. Recompile TypeScript
2. Restart the application
3. Preserve state where possible

## Database Migrations

### Create Migration

```bash
# Using Supabase CLI
supabase migration new my_migration

# Edit migration file
nano supabase/migrations/YYYYMMDDHHMMSS_my_migration.sql
```

### Apply Migrations

```bash
# Local
supabase db push

# Production
supabase db push --linked
```

### Reset Database

```bash
# Local
supabase db reset

# Docker
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Module Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Clean build
npm run clean
npm run build
```

### Solana Validator Issues

```bash
# Reset validator
solana-test-validator --reset

# Check validator status
solana cluster-version --url http://localhost:8899
```

### Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose -f docker-compose.dev.yml ps postgres-dev

# View logs
docker-compose -f docker-compose.dev.yml logs postgres-dev

# Restart database
docker-compose -f docker-compose.dev.yml restart postgres-dev
```

## Performance Tips

### Fast Compilation

Use `tsx` for faster TypeScript execution:

```bash
npm run dev  # Uses tsx watch
```

### Incremental Builds

TypeScript is configured for incremental builds:

```json
{
  "compilerOptions": {
    "incremental": true
  }
}
```

### Parallel Testing

Run tests in parallel:

```bash
npm test -- --reporter=verbose --threads
```

## Code Quality

### Pre-Commit Hooks

Install pre-commit hooks:

```bash
# Install husky
npm install -D husky

# Set up hooks
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm test"
```

### Editor Integration

#### VS Code Extensions

- ESLint
- Prettier
- TypeScript
- Docker
- GitLens

#### Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Next Steps

1. Read [Architecture Guide](./architecture.md)
2. Review [API Reference](./api.md)
3. Check [Testing Guide](./testing.md)
4. Explore [Examples](../examples/)
5. Join [Discord Community](https://discord.gg/ordo)

## Support

- GitHub Issues: https://github.com/ordo-platform/ordo/issues
- Discord: https://discord.gg/ordo
- Documentation: https://docs.ordo.dev
