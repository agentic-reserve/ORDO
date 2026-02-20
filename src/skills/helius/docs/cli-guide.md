# Helius CLI Guide for Agents

Complete guide for AI agents to programmatically create Helius accounts, manage API keys, and interact with Helius infrastructure via CLI.

## Overview

The Helius CLI enables agents to:
- Generate Solana keypairs for authentication
- Create Helius accounts programmatically
- Obtain API keys without manual dashboard interaction
- Manage projects and API keys
- Monitor usage and credits

## Installation

```bash
npm install -g helius-cli
```

Verify installation:
```bash
helius --version
# Expected: x.y.z (version number)
```

## Requirements

- Node.js >= 18.0.0
- 1 USDC on Solana mainnet (for signup)
- ~0.001 SOL (for transaction fees)

## Complete Agent Workflow

### Step 1: Generate Keypair

```bash
helius keygen
```

**Output:**
```
Keypair saved to: ~/.helius-cli/keypair.json
Address: <wallet_address>
```

**Custom path:**
```bash
helius keygen -o /path/to/keypair.json
```

**Force overwrite:**
```bash
helius keygen --force
```

**Exit Codes:**
- `0` - Success
- `1` - General error

### Step 2: Login (Authenticate)

Before signing up, authenticate your wallet with Helius:

```bash
helius login --json
```

**With custom keypair:**
```bash
helius login -k /path/to/keypair.json --json
```

**Success Response:**
```json
{
  "status": "SUCCESS",
  "wallet": "wallet_address"
}
```

**Exit Codes:**
- `0` - Success
- `11` - Keypair not found (run `helius keygen` first)
- `12` - Authentication failed

### Step 3: Fund Wallet

**Manual step** - Send to the wallet address from Step 1:
- 1 USDC (mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- 0.001 SOL (for transaction fees)

**Check balances via Solana RPC:**
```typescript
import { createSolanaRpc } from "@solana/kit";

const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");

// Check SOL balance
const balance = await rpc.getBalance(address).send();
console.log("SOL:", Number(balance) / 1e9);

// Check USDC balance
const tokenAccounts = await rpc.getTokenAccountsByOwner(
  address,
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { encoding: "jsonParsed" }
).send();
```

**Track transactions:**
- Use [orbmarkets.io/tx/{signature}](https://orbmarkets.io/tx/) to monitor funding transactions

### Step 4: Signup and Get API Key

```bash
helius signup --json
```

**With custom keypair:**
```bash
helius signup -k /path/to/keypair.json --json
```

**Success Response (New Account):**
```json
{
  "status": "SUCCESS",
  "wallet": "wallet_address",
  "projectId": "project-uuid",
  "projectName": "Project Name",
  "apiKey": "your-api-key-here",
  "endpoints": {
    "mainnet": "https://mainnet.helius-rpc.com/?api-key=your-api-key-here",
    "devnet": "https://devnet.helius-rpc.com/?api-key=your-api-key-here"
  },
  "credits": 1000000,
  "transaction": "transaction-signature"
}
```

**Success Response (Existing Account):**
```json
{
  "status": "EXISTING_PROJECT",
  "wallet": "wallet_address",
  "projectId": "project-uuid",
  "projectName": "Project Name",
  "apiKey": "your-api-key-here",
  "endpoints": {
    "mainnet": "https://mainnet.helius-rpc.com/?api-key=your-api-key-here",
    "devnet": "https://devnet.helius-rpc.com/?api-key=your-api-key-here"
  },
  "credits": 1000000
}
```

**Extract values:**
```typescript
const response = JSON.parse(stdout);
const apiKey = response.apiKey;
const mainnetRpc = response.endpoints.mainnet;
const devnetRpc = response.endpoints.devnet;
const projectId = response.projectId;
```

**Exit Codes:**
- `0` - Success
- `10` - Not logged in (run `helius login` first)
- `11` - Keypair not found
- `20` - Insufficient SOL
- `21` - Insufficient USDC
- `22` - Payment failed

## Managing Existing Accounts

### Login with Existing Wallet

```bash
helius login --keypair /path/to/keypair.json --json
```

### List Projects

```bash
helius projects --json
```

**Response:**
```json
{
  "projects": [
    {
      "projectId": "uuid",
      "projectName": "Project Name",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Project Details

```bash
helius project <project-id> --json
```

### List API Keys

```bash
helius apikeys --json
```

**Response:**
```json
{
  "projectId": "uuid",
  "projectName": "Project Name",
  "apiKeys": [
    {
      "keyId": "key-uuid",
      "name": "Default Key"
    }
  ]
}
```

### Create New API Key

```bash
helius apikeys create --json
```

### Check Usage

```bash
helius usage --json
```

**Response:**
```json
{
  "projectId": "uuid",
  "credits": {
    "total": 1000000,
    "used": 50000,
    "remaining": 950000
  },
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-02-01T00:00:00Z"
  }
}
```

### Get RPC Endpoints

```bash
helius rpc --json
```

**Response:**
```json
{
  "endpoints": {
    "mainnet": "https://mainnet.helius-rpc.com/?api-key=...",
    "devnet": "https://devnet.helius-rpc.com/?api-key=..."
  }
}
```

## Exit Codes Reference

| Code | Name | Description | Action |
|------|------|-------------|--------|
| 0 | SUCCESS | Operation completed | Extract data from response |
| 1 | GENERAL_ERROR | Unexpected error | Check message, retry with backoff |
| 10 | NOT_LOGGED_IN | Authentication required | Run `helius login` |
| 11 | KEYPAIR_NOT_FOUND | Keypair file missing | Run `helius keygen` |
| 12 | AUTH_FAILED | Authentication failed | Check keypair validity |
| 20 | INSUFFICIENT_SOL | Need more SOL | Fund wallet with ~0.001 SOL |
| 21 | INSUFFICIENT_USDC | Need more USDC | Fund wallet with 1 USDC |
| 22 | PAYMENT_FAILED | Transaction failed | Retry or check network |
| 30 | NO_PROJECTS | No projects found | Run `helius signup` |
| 31 | PROJECT_NOT_FOUND | Invalid project ID | Verify project exists |
| 32 | MULTIPLE_PROJECTS | Ambiguous project | Specify project ID |
| 40 | API_ERROR | Helius API error | Retry with backoff |
| 41 | NO_API_KEYS | No keys found | Run `helius apikeys create` |

## Error Handling

### Error Response Format

```json
{
  "error": "INSUFFICIENT_USDC",
  "message": "Insufficient USDC balance",
  "have": 0,
  "need": 1000000,
  "fundAddress": "wallet_address"
}
```

### Retry Strategy

**Retryable errors** (use exponential backoff):
- Exit code 1 (GENERAL_ERROR)
- Exit code 22 (PAYMENT_FAILED)
- Exit code 40 (API_ERROR)

**Non-retryable errors** (require user action):
- Exit code 11 (KEYPAIR_NOT_FOUND) - Run keygen
- Exit code 20 (INSUFFICIENT_SOL) - Fund wallet
- Exit code 21 (INSUFFICIENT_USDC) - Fund wallet
- Exit code 30 (NO_PROJECTS) - Run signup

**Retry implementation:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const exitCode = error.exitCode;
      
      // Don't retry non-retryable errors
      if ([11, 20, 21, 30, 31].includes(exitCode)) {
        throw error;
      }
      
      // Last attempt
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}
```

## Verification

### Test API Key

```typescript
async function verifyApiKey(apiKey: string): Promise<boolean> {
  const response = await fetch(
    `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth",
      }),
    }
  );
  
  const data = await response.json();
  return data.result === "ok";
}
```

## File Paths

| File | Path | Format |
|------|------|--------|
| Default keypair | `~/.helius-cli/keypair.json` | Solana CLI 64-byte JSON array |
| Config | `~/.helius-cli/config.json` | JSON |

## Solana Addresses

| Asset | Network | Address |
|-------|---------|---------|
| USDC | Mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDC | Devnet | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| Helius Treasury | Mainnet | `CEs84tEowsXpH8u4VBf8rJSVgSRypFMfXw9CpGRtQgb6` |

## Idempotency

- **signup**: Running with existing account returns project info without charging again
- **keygen**: Fails if keypair exists unless `--force` flag is used
- **login**: Can be run multiple times safely

## Agent Pseudocode

```
1. Check if CLI installed
   - Run: helius --version
   - If fails: npm install -g helius-cli

2. Check if keypair exists
   - Path: ~/.helius-cli/keypair.json
   - If not: helius keygen

3. Login to authenticate
   - Run: helius login --json
   - If exit code 11: goto step 2

4. Check wallet balances
   - SOL >= 0.001
   - USDC >= 1
   - If insufficient: fund wallet and wait

5. Signup and get API key
   - Run: helius signup --json
   - Parse stdout as JSON
   - Extract: response.apiKey, response.endpoints

6. Handle exit codes
   - 0: Success, extract API key
   - 10: goto step 3 (login)
   - 11: goto step 2 (keygen)
   - 20/21: goto step 4 (funding)
   - 22/40: retry with backoff

7. Verify API key
   - Test with getHealth RPC call
   - Store for future use

8. Monitor usage
   - Run: helius usage --json
   - Track credits remaining
```

## Complete TypeScript Example

```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface HeliusSignupResponse {
  status: "SUCCESS" | "EXISTING_PROJECT";
  wallet: string;
  projectId: string;
  projectName: string;
  apiKey: string;
  endpoints: {
    mainnet: string;
    devnet: string;
  };
  credits: number;
  transaction?: string;
}

async function setupHeliusAccount(): Promise<HeliusSignupResponse> {
  try {
    // 1. Check CLI installation
    await execAsync("helius --version");
  } catch {
    console.log("Installing Helius CLI...");
    await execAsync("npm install -g helius-cli");
  }

  // 2. Generate keypair if needed
  try {
    await execAsync("helius keygen");
  } catch (error) {
    // Keypair might already exist
    console.log("Keypair already exists or created");
  }

  // 3. Login
  try {
    await execAsync("helius login --json");
  } catch (error) {
    throw new Error("Login failed. Check keypair.");
  }

  // 4. Check balances (implement balance checking here)
  // ... balance check code ...

  // 5. Signup
  const { stdout } = await execAsync("helius signup --json");
  const response: HeliusSignupResponse = JSON.parse(stdout);

  // 6. Verify API key
  const isValid = await verifyApiKey(response.apiKey);
  if (!isValid) {
    throw new Error("API key verification failed");
  }

  return response;
}

async function verifyApiKey(apiKey: string): Promise<boolean> {
  const response = await fetch(
    `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth",
      }),
    }
  );

  const data = await response.json();
  return data.result === "ok";
}

// Usage
const account = await setupHeliusAccount();
console.log("API Key:", account.apiKey);
console.log("Mainnet RPC:", account.endpoints.mainnet);
console.log("Credits:", account.credits);
```

## Rate Limits

- Initial credits: 1,000,000
- Monitor with: `helius usage --json`
- Upgrade plans available at [dashboard.helius.dev](https://dashboard.helius.dev)

## Resources

- [Helius CLI GitHub](https://github.com/helius-labs/helius-cli)
- [Helius Documentation](https://docs.helius.dev)
- [Agent Instructions JSON](https://helius.dev/api/agents.json)
- [Transaction Tracker](https://orbmarkets.io)
- [Helius Dashboard](https://dashboard.helius.dev)
