# Ordo REST API

REST API server for Ordo platform, providing HTTP endpoints for web and mobile clients.

## Features

- **Authentication**: Wallet-based auth with JWT tokens
- **Agent Management**: CRUD operations for AI agents
- **Transactions**: Transaction history and monitoring
- **Metrics**: Performance analytics and statistics
- **CORS**: Configured for web and mobile clients
- **Type-Safe**: Full TypeScript support

## Tech Stack

- **Runtime**: Bun (fast JavaScript runtime)
- **Framework**: Hono (lightweight web framework)
- **Auth**: JWT + SIWE (Sign-In with Ethereum/Solana)
- **Database**: SQLite via Ordo database layer

## Installation

```bash
cd src/api
bun install
```

## Development

```bash
# Start development server
bun run dev

# Server runs on http://localhost:3001
```

## Production

```bash
# Build
bun run build

# Start production server
bun run start
```

## API Endpoints

### Authentication

```
POST   /api/auth/nonce      - Generate nonce for wallet auth
POST   /api/auth/verify     - Verify signature and get JWT
POST   /api/auth/refresh    - Refresh JWT token
GET    /api/auth/me         - Get current user info
```

### Agents

```
GET    /api/agents          - List all agents
POST   /api/agents          - Create new agent
GET    /api/agents/:id      - Get agent details
PATCH  /api/agents/:id      - Update agent
DELETE /api/agents/:id      - Delete agent
POST   /api/agents/:id/pause   - Pause agent
POST   /api/agents/:id/resume  - Resume agent
```

### Transactions

```
GET    /api/transactions                - List all transactions
GET    /api/transactions/:id            - Get transaction details
GET    /api/transactions/agents/:id     - Get agent transactions
```

### Metrics

```
GET    /api/metrics/overview                      - Get overview metrics
GET    /api/metrics/agents/:id/performance        - Get agent performance
GET    /api/metrics/agents/:id/stats              - Get agent statistics
```

## Authentication Flow

1. Client requests nonce with wallet address
2. Client signs message with wallet
3. Client sends signature to verify endpoint
4. Server verifies signature and returns JWT
5. Client includes JWT in Authorization header for subsequent requests

## Environment Variables

```env
API_PORT=3001
API_HOST=0.0.0.0
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:19006
```

## Example Usage

### JavaScript/TypeScript

```typescript
// Get nonce
const { nonce, message } = await fetch('http://localhost:3001/api/auth/nonce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ walletAddress: 'YOUR_WALLET_ADDRESS' }),
}).then(r => r.json());

// Sign message with wallet
const signature = await wallet.signMessage(message);

// Verify and get token
const { token } = await fetch('http://localhost:3001/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: 'YOUR_WALLET_ADDRESS',
    signature,
    message,
  }),
}).then(r => r.json());

// Use token for authenticated requests
const agents = await fetch('http://localhost:3001/api/agents', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
}).then(r => r.json());
```

## Error Handling

All endpoints return JSON responses:

```json
// Success
{
  "agents": [...],
  "total": 4
}

// Error
{
  "error": "Agent not found"
}
```

HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## CORS Configuration

Configured to allow requests from:
- http://localhost:3000 (Next.js web app)
- http://localhost:19006 (Expo mobile app)

Update `CORS_ORIGINS` environment variable for production domains.

## Security

- JWT tokens expire after 7 days
- Wallet signature verification (implement proper verification in production)
- CORS restrictions
- Rate limiting (TODO)
- Input validation
- SQL injection protection via parameterized queries

## Performance

- Lightweight Hono framework
- Bun runtime for fast execution
- Efficient database queries
- JSON response caching (TODO)

## Deployment

### Docker

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
EXPOSE 3001
CMD ["bun", "run", "server.ts"]
```

### Railway

```bash
railway up
```

### Vercel/Netlify

Deploy as serverless functions (requires adapter).

## Testing

```bash
# Health check
curl http://localhost:3001/health

# Get nonce
curl -X POST http://localhost:3001/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"YOUR_WALLET"}'

# List agents (requires auth)
curl http://localhost:3001/api/agents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## License

MIT
