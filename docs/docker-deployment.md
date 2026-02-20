# Docker Self-Hosting Guide

This guide explains how to self-host the Ordo platform using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- 4GB+ RAM available
- 20GB+ disk space

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/ordo-platform/ordo.git
cd ordo
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env
```

Required variables:
- `SOLANA_RPC_URL` - Helius or custom RPC endpoint
- `HELIUS_API_KEY` - Helius API key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f ordo
```

### 4. Verify Deployment

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":1234567890}
```

## Architecture

The Docker setup includes:

```
┌─────────────────────────────────────────┐
│           Nginx (Reverse Proxy)         │
│              Port 80/443                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Ordo Platform                   │
│           Port 3000                     │
└──────┬──────────────────┬───────────────┘
       │                  │
┌──────▼──────┐    ┌──────▼──────┐
│  PostgreSQL │    │    Redis    │
│  Port 5432  │    │  Port 6379  │
└─────────────┘    └─────────────┘
```

## Configuration

### Docker Compose Services

#### Ordo Platform

Main application service:

```yaml
ordo:
  build: .
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=production
  env_file:
    - .env
```

#### PostgreSQL

Local database (alternative to Supabase):

```yaml
postgres:
  image: postgres:15-alpine
  ports:
    - "5432:5432"
  environment:
    - POSTGRES_USER=ordo
    - POSTGRES_PASSWORD=ordo_password
    - POSTGRES_DB=ordo
```

#### Redis

Caching and session management:

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes
```

### Environment Variables

See `.env.example` for all available variables.

## Deployment Modes

### Development Mode

For local development with hot reload:

```bash
# Start with local Solana validator
docker-compose --profile local-validator up -d

# View logs
docker-compose logs -f
```

### Production Mode

For production deployment with Nginx:

```bash
# Start with Nginx reverse proxy
docker-compose --profile production up -d

# Configure SSL certificates
# Place certificates in ./ssl/ directory
```

## Scaling

### Horizontal Scaling

Scale the Ordo service to multiple replicas:

```bash
# Scale to 3 replicas
docker-compose up -d --scale ordo=3

# Verify
docker-compose ps
```

### Resource Limits

Configure resource limits in `docker-compose.yml`:

```yaml
ordo:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
      reservations:
        cpus: '1'
        memory: 2G
```

## Monitoring

### Container Logs

```bash
# View all logs
docker-compose logs

# Follow specific service
docker-compose logs -f ordo

# Last 100 lines
docker-compose logs --tail=100 ordo
```

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats ordo-platform
```

### Health Checks

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' ordo-platform

# View health check logs
docker inspect --format='{{json .State.Health}}' ordo-platform | jq
```

## Backup and Restore

### Database Backup

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U ordo ordo > backup.sql

# Restore PostgreSQL
docker-compose exec -T postgres psql -U ordo ordo < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm \
  -v ordo_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore volumes
docker run --rm \
  -v ordo_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build ordo
docker-compose up -d ordo

# Verify
docker-compose logs -f ordo
```

### Update Dependencies

```bash
# Rebuild all services
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

### Clean Up

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean up system
docker system prune -a
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs ordo

# Check container status
docker-compose ps

# Restart service
docker-compose restart ordo
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U ordo -d ordo -c "SELECT 1"

# Restart database
docker-compose restart postgres
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# Increase memory limit in docker-compose.yml
# Then restart:
docker-compose up -d
```

### Port Conflicts

```bash
# Check port usage
netstat -tulpn | grep :3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use different host port
```

## Security

### Network Isolation

Services communicate via internal network:

```yaml
networks:
  ordo-network:
    driver: bridge
```

### Non-Root User

Application runs as non-root user:

```dockerfile
USER ordo
```

### Secrets Management

Never commit `.env` file. Use Docker secrets for production:

```yaml
secrets:
  openrouter_key:
    external: true

services:
  ordo:
    secrets:
      - openrouter_key
```

### SSL/TLS

Configure SSL certificates for production:

```bash
# Generate self-signed certificate (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Use Let's Encrypt (production)
certbot certonly --standalone -d your-domain.com
```

## Performance Optimization

### Build Cache

Use BuildKit for faster builds:

```bash
DOCKER_BUILDKIT=1 docker-compose build
```

### Multi-Stage Builds

Dockerfile uses multi-stage builds for smaller images:

```dockerfile
FROM node:20-alpine AS builder
# Build stage

FROM node:20-alpine AS production
# Production stage
```

### Volume Mounts

Use volumes for persistent data:

```yaml
volumes:
  - ./data:/app/data
  - ./logs:/app/logs
```

## Cost Optimization

### Resource Right-Sizing

Monitor and adjust resource limits:

```bash
# Monitor usage
docker stats

# Adjust limits in docker-compose.yml
```

### Auto-Scaling

Use Docker Swarm or Kubernetes for auto-scaling:

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml ordo
```

## Support

- Docker Docs: https://docs.docker.com
- Docker Compose Docs: https://docs.docker.com/compose
- Ordo Issues: https://github.com/ordo-platform/ordo/issues

## Next Steps

1. Configure monitoring and alerting
2. Set up automated backups
3. Configure SSL certificates
4. Implement log aggregation
5. Set up CI/CD pipeline
