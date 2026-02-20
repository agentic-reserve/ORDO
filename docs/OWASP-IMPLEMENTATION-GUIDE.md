# OWASP Security Implementation for Ordo

This guide applies OWASP Top 10 security principles specifically to the Ordo platform's architecture.

## Platform Overview

Ordo consists of:
- **Solana Program** (`programs/agent-registry/`) - On-chain agent registry
- **Backend API** (`src/api/`) - Express.js REST API
- **Web App** (`web/`) - Next.js frontend
- **Mobile App** (`mobile/`) - React Native app
- **Database** - Supabase (PostgreSQL)

## A01: Broken Access Control - Ordo Implementation

### Agent Ownership Verification

```typescript
// src/api/middleware/auth.ts
import { verifySignature } from '@solana/web3.js';

export async function verifyAgentOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { agentId } = req.params;
  const { signature, publicKey } = req.body;
  
  // Get agent from database
  const agent = await supabase
    .from('agents')
    .select('wallet_address')
    .eq('id', agentId)
    .single();
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // Verify signature matches agent's wallet
  if (agent.wallet_address !== publicKey) {
    return res.status(403).json({ error: 'Not agent owner' });
  }
  
  // Verify signature
  const isValid = verifySignature(signature, publicKey);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  req.agent = agent;
  next();
}

// Usage
app.put('/api/agents/:agentId', verifyAgentOwnership, updateAgent);
```

### Role-Based Access Control

```typescript
// src/api/middleware/rbac.ts
export enum Role {
  USER = 'user',
  AGENT = 'agent',
  ADMIN = 'admin',
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Usage
app.delete('/api/agents/:id', requireRole(Role.ADMIN), deleteAgent);
app.post('/api/agents', requireRole(Role.USER, Role.AGENT), createAgent);
```

## A02: Cryptographic Failures - Ordo Implementation

### Secure Private Key Storage

```typescript
// src/identity/keypair.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

export function encryptPrivateKey(privateKey: Uint8Array): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(Buffer.from(privateKey));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptPrivateKey(
  encrypted: string,
  iv: string,
  tag: string
): Uint8Array {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return new Uint8Array(decrypted);
}

// Store in database
async function storeAgentWallet(agentId: string, privateKey: Uint8Array) {
  const { encrypted, iv, tag } = encryptPrivateKey(privateKey);
  
  await supabase.from('agent_wallets').insert({
    agent_id: agentId,
    encrypted_key: encrypted,
    iv,
    tag,
  });
}
```

### Secure API Keys

```typescript
// src/config/secrets.ts
import { createClient } from '@supabase/supabase-js';

// ❌ BAD: Hardcoded secrets
const OPENAI_KEY = 'sk-1234567890';

// ✅ GOOD: Environment variables
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const HELIUS_KEY = process.env.HELIUS_API_KEY!;

// ✅ GOOD: Validate secrets exist
function validateSecrets() {
  const required = [
    'OPENAI_API_KEY',
    'HELIUS_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
    'JWT_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }
}

validateSecrets();
```

## A03: Injection - Ordo Implementation

### SQL Injection Prevention (Supabase)

```typescript
// src/database/agents.ts
import { supabase } from './client';

// ❌ BAD: String concatenation
async function searchAgentsBad(query: string) {
  const { data } = await supabase.rpc('search_agents', {
    query: `%${query}%`  // Vulnerable if query contains SQL
  });
  return data;
}

// ✅ GOOD: Parameterized queries
async function searchAgents(query: string) {
  const { data } = await supabase
    .from('agents')
    .select('*')
    .ilike('name', `%${query}%`);  // Supabase handles escaping
  return data;
}

// ✅ GOOD: Input validation
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s-]+$/),
  limit: z.number().int().min(1).max(100).default(10),
});

app.get('/api/agents/search', async (req, res) => {
  const { query, limit } = searchSchema.parse(req.query);
  const agents = await searchAgents(query);
  res.json(agents.slice(0, limit));
});
```

### Command Injection Prevention

```typescript
// src/infrastructure/deployment.ts
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ❌ BAD: Shell injection
async function deployProgramBad(programPath: string) {
  exec(`solana program deploy ${programPath}`);  // Vulnerable!
}

// ✅ GOOD: Use execFile with array args
async function deployProgram(programPath: string) {
  // Validate path
  if (!programPath.match(/^[a-zA-Z0-9_\-\/\.]+$/)) {
    throw new Error('Invalid program path');
  }
  
  const { stdout, stderr } = await execFileAsync('solana', [
    'program',
    'deploy',
    programPath,
  ]);
  
  return { stdout, stderr };
}
```

## A04: Insecure Design - Ordo Implementation

### Rate Limiting

```typescript
// src/api/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

// General API rate limit
export const apiLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later',
});

// Strict limit for agent creation
export const agentCreationLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 agents per hour
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Strict limit for DeFi operations
export const defiLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 transactions per minute
  keyGenerator: (req) => req.agent?.wallet_address || req.ip,
});

// Apply to routes
app.use('/api/', apiLimiter);
app.post('/api/agents', agentCreationLimiter, createAgent);
app.post('/api/defi/swap', defiLimiter, executeSwap);
```

### Input Validation

```typescript
// src/api/validators/agent.ts
import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Name contains invalid characters'),
  
  description: z.string()
    .min(10)
    .max(500),
  
  agent_uri: z.string()
    .url('Must be a valid URL')
    .startsWith('https://', 'Must use HTTPS'),
  
  services: z.array(z.string())
    .max(10, 'Maximum 10 services'),
  
  x402_support: z.boolean(),
  
  generation: z.number()
    .int()
    .min(0)
    .max(1000),
  
  initial_balance: z.number()
    .min(0.01, 'Minimum 0.01 SOL')
    .max(100, 'Maximum 100 SOL'),
});

// Usage
app.post('/api/agents', async (req, res) => {
  try {
    const data = createAgentSchema.parse(req.body);
    const agent = await createAgent(data);
    res.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    throw error;
  }
});
```

## A05: Security Misconfiguration - Ordo Implementation

### Secure Express Configuration

```typescript
// src/api/server.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

const app = express();

// Security headers
app.use(helmet());
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true,
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://ordo.com', 'https://app.ordo.com']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Disable sensitive headers
app.disable('x-powered-by');

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  // Don't expose stack traces in production
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});
```

### Environment-Specific Configuration

```typescript
// src/config/index.ts
export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL!,
    network: process.env.SOLANA_NETWORK!,
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET!,
    encryptionKey: process.env.ENCRYPTION_KEY!,
    sessionSecret: process.env.SESSION_SECRET!,
  },
  
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV !== 'production',
  },
};

// Validate configuration
function validateConfig() {
  const required = [
    'SOLANA_RPC_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }
}

validateConfig();
```

## A06: Vulnerable Components - Ordo Implementation

### Dependency Management

```json
// package.json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "audit:check": "npm audit --audit-level=moderate",
    "update:check": "npx npm-check-updates",
    "update:minor": "npx npm-check-updates -u --target minor",
    "snyk:test": "npx snyk test",
    "snyk:monitor": "npx snyk monitor"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.9.3"
  }
}
```

### GitHub Actions for Security

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## A07: Authentication Failures - Ordo Implementation

### Wallet-Based Authentication

```typescript
// src/api/auth/wallet.ts
import { verifySignature } from '@solana/web3.js';
import jwt from 'jsonwebtoken';

export async function authenticateWallet(req: Request, res: Response) {
  const { publicKey, signature, message } = req.body;
  
  // Verify signature
  const isValid = verifySignature(signature, publicKey, message);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Check message timestamp (prevent replay attacks)
  const timestamp = parseInt(message.split(':')[1]);
  const now = Date.now();
  if (Math.abs(now - timestamp) > 60000) { // 1 minute
    return res.status(401).json({ error: 'Message expired' });
  }
  
  // Generate JWT
  const token = jwt.sign(
    { publicKey, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { publicKey, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  
  res.json({ token, refreshToken });
}
```

## A08: Data Integrity - Ordo Implementation

### Transaction Verification

```typescript
// src/defi/verification.ts
import { Connection, Transaction } from '@solana/web3.js';

export async function verifyTransaction(
  connection: Connection,
  signature: string,
  expectedAmount: number,
  expectedRecipient: string
): Promise<boolean> {
  const tx = await connection.getTransaction(signature);
  
  if (!tx) {
    throw new Error('Transaction not found');
  }
  
  // Verify transaction succeeded
  if (tx.meta?.err) {
    return false;
  }
  
  // Verify amount and recipient
  // (Implementation depends on transaction type)
  
  return true;
}
```

## A09: Logging & Monitoring - Ordo Implementation

### Security Event Logging

```typescript
// src/monitoring/security-logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn'
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log'
    }),
  ],
});

export function logSecurityEvent(
  event: string,
  details: Record<string, any>
) {
  logger.warn({
    type: 'security',
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

// Usage throughout the app
logSecurityEvent('failed_login', {
  publicKey,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

logSecurityEvent('unauthorized_access', {
  userId,
  resource: req.path,
  method: req.method,
});

logSecurityEvent('suspicious_activity', {
  agentId,
  pattern: 'rapid_transactions',
  count: transactionCount,
});
```

## A10: SSRF - Ordo Implementation

### URL Validation for Agent URIs

```typescript
// src/api/validators/url.ts
import { URL } from 'url';

const ALLOWED_DOMAINS = [
  'github.com',
  'gitlab.com',
  'ipfs.io',
  'arweave.net',
];

export function validateAgentUri(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Must be HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }
    
    // Block private IPs
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
    ];
    
    if (privatePatterns.some(p => p.test(url.hostname))) {
      return false;
    }
    
    // Check against allowlist
    return ALLOWED_DOMAINS.some(domain => 
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}
```

## Security Checklist for Ordo

```markdown
### Smart Contract Security
- [ ] All instructions have signer checks
- [ ] PDA derivations are validated
- [ ] Integer overflow protection enabled
- [ ] Account ownership verified
- [ ] No arbitrary CPI vulnerabilities

### API Security
- [ ] All endpoints have authentication
- [ ] Authorization checks on all operations
- [ ] Input validation with Zod
- [ ] Rate limiting configured
- [ ] CORS properly configured

### Data Security
- [ ] Private keys encrypted at rest
- [ ] API keys in environment variables
- [ ] Database queries parameterized
- [ ] Sensitive data not logged
- [ ] Backups encrypted

### Infrastructure
- [ ] HTTPS enforced
- [ ] Security headers configured (Helmet)
- [ ] Dependencies audited (npm audit, Snyk)
- [ ] Error messages don't leak info
- [ ] Monitoring and alerting enabled
```

## Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
