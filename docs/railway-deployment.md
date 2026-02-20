# Railway Deployment Guide

This guide explains how to deploy the Ordo platform to Railway with auto-scaling and zero-downtime deployments.

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository connected to Railway
- Required API keys (Helius, OpenRouter, Supabase)

## Quick Deploy

### Option 1: One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Option 2: Manual Setup

1. **Create New Project**
   ```bash
   railway login
   railway init
   ```

2. **Link Repository**
   ```bash
   railway link
   ```

3. **Set Environment Variables**
   ```bash
   # Solana Configuration
   railway variables set SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   railway variables set HELIUS_API_KEY=your_helius_api_key
   
   # OpenRouter Configuration
   railway variables set OPENROUTER_API_KEY=your_openrouter_api_key
   
   # Supabase Configuration
   railway variables set SUPABASE_URL=https://your-project.supabase.co
   railway variables set SUPABASE_ANON_KEY=your_anon_key
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Production Settings
   railway variables set NODE_ENV=production
   railway variables set LOG_LEVEL=info
   ```

4. **Deploy**
   ```bash
   railway up
   ```

## Configuration

### Auto-Scaling

The platform is configured to auto-scale based on the 88.8% utilization threshold (following universal constants):

```json
{
  "scaling": {
    "minReplicas": 1,
    "maxReplicas": 10,
    "targetCPU": 88.8,
    "targetMemory": 88.8
  }
}
```

### Health Checks

Railway performs health checks at `/health` endpoint:

```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});
```

### Restart Policy

Automatic restart on failure with exponential backoff:
- Max retries: 10
- Policy: ON_FAILURE
- Timeout: 300 seconds

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SOLANA_RPC_URL` | Helius RPC endpoint | `https://mainnet.helius-rpc.com/?api-key=...` |
| `HELIUS_API_KEY` | Helius API key | `abc123...` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `LOG_LEVEL` | Logging level | `info` |
| `AGENT_MAX_LIFESPAN_DAYS` | Max agent lifespan | `365` |
| `AGENT_INITIAL_BALANCE_SOL` | Initial SOL balance | `1.0` |
| `HEARTBEAT_INTERVAL_MINUTES` | Heartbeat frequency | `60` |

## Monitoring

### Railway Dashboard

Monitor your deployment at: https://railway.app/dashboard

Key metrics:
- CPU usage
- Memory usage
- Request latency
- Error rate
- Deployment status

### Custom Metrics

The platform exposes metrics at `/metrics` endpoint:

```bash
curl https://your-app.railway.app/metrics
```

## Zero-Downtime Deployments

Railway automatically performs rolling deployments:

1. New version is built
2. Health check passes
3. Traffic gradually shifts to new version
4. Old version is terminated after full migration

### Deployment Strategy

```toml
[deploy]
restartPolicyType = "ON_FAILURE"
healthcheckPath = "/health"
healthcheckTimeout = 300
```

## Scaling

### Manual Scaling

```bash
# Scale to specific replica count
railway scale --replicas 5

# Scale based on CPU
railway scale --target-cpu 88.8
```

### Automatic Scaling

Configured in `railway.toml`:
- Scales up when CPU/Memory > 88.8%
- Scales down when CPU/Memory < 50%
- Min replicas: 1
- Max replicas: 10

## Cost Optimization

### Estimated Costs

- **Starter Plan**: $5/month (1 GB RAM, 1 vCPU)
- **Pro Plan**: $20/month (8 GB RAM, 4 vCPU)
- **Auto-scaling**: Pay per replica-hour

### Cost Reduction Tips

1. **Use spot instances** (70% savings)
2. **Right-size resources** based on actual usage
3. **Enable auto-scaling** to minimize idle capacity
4. **Monitor zombie resources** and terminate unused services

## Troubleshooting

### Deployment Fails

```bash
# Check build logs
railway logs --build

# Check deployment logs
railway logs --deployment
```

### Health Check Fails

Ensure `/health` endpoint returns 200 status:

```typescript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});
```

### Environment Variables Missing

```bash
# List all variables
railway variables

# Set missing variable
railway variables set KEY=value
```

### High Memory Usage

```bash
# Check memory usage
railway status

# Scale up if needed
railway scale --replicas 2
```

## CI/CD Integration

### GitHub Actions

Railway automatically deploys on push to main branch. To customize:

```yaml
# .github/workflows/railway.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Security

### Secrets Management

Never commit secrets to git. Use Railway's environment variables:

```bash
# Set secret
railway variables set SECRET_KEY=value

# View secrets (masked)
railway variables
```

### Network Security

- Enable Railway's private networking
- Use HTTPS for all endpoints
- Implement rate limiting
- Enable CORS with whitelist

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Ordo Issues: https://github.com/ordo-platform/ordo/issues

## Next Steps

1. Set up monitoring and alerting
2. Configure custom domain
3. Enable auto-scaling
4. Set up CI/CD pipeline
5. Configure backup strategy
