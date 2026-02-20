# GitHub Deployment Guide

This guide explains how to set up automated deployments using GitHub Actions.

## Overview

The Ordo platform uses GitHub Actions for:
- Continuous Integration (CI)
- Continuous Deployment (CD)
- Automated releases
- Docker image publishing

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request:

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

**Jobs:**
- **Lint**: ESLint and Prettier checks
- **Test**: Unit and property-based tests
- **Build**: TypeScript compilation
- **Security**: npm audit and Snyk scan
- **Docker**: Docker image build test

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

Deploys to Railway on push to main/production:

```yaml
on:
  push:
    branches: [main, production]
```

**Jobs:**
- **Test**: Run all tests before deployment
- **Deploy Staging**: Deploy to staging environment (main branch)
- **Deploy Production**: Deploy to production environment (production branch)

### 3. Release Workflow (`.github/workflows/release.yml`)

Creates releases on version tags:

```yaml
on:
  push:
    tags: ['v*']
```

**Jobs:**
- **Create Release**: Generate GitHub release with changelog
- **Publish NPM**: Publish package to npm registry
- **Publish Docker**: Push Docker image to GitHub Container Registry

## Setup

### 1. Repository Secrets

Add the following secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Description | Required For |
|--------|-------------|--------------|
| `RAILWAY_TOKEN_STAGING` | Railway API token for staging | Deploy workflow |
| `RAILWAY_TOKEN_PRODUCTION` | Railway API token for production | Deploy workflow |
| `CODECOV_TOKEN` | Codecov upload token | CI workflow |
| `SNYK_TOKEN` | Snyk security scan token | CI workflow |
| `NPM_TOKEN` | npm publish token | Release workflow |

### 2. Railway Tokens

Get Railway API tokens:

```bash
# Login to Railway
railway login

# Get token for staging
railway token --service ordo-staging

# Get token for production
railway token --service ordo-production
```

Add tokens to GitHub secrets.

### 3. Environment Configuration

Configure GitHub environments:

**Settings → Environments → New environment**

#### Staging Environment
- Name: `staging`
- URL: `https://ordo-staging.railway.app`
- Protection rules: None (auto-deploy)

#### Production Environment
- Name: `production`
- URL: `https://ordo.railway.app`
- Protection rules:
  - Required reviewers: 1+
  - Wait timer: 5 minutes
  - Deployment branches: `production` only

## Deployment Process

### Staging Deployment

1. **Push to main branch**
   ```bash
   git checkout main
   git pull origin main
   git merge develop
   git push origin main
   ```

2. **Automatic deployment**
   - CI tests run
   - If tests pass, deploys to staging
   - Available at: https://ordo-staging.railway.app

### Production Deployment

1. **Create production branch**
   ```bash
   git checkout -b production main
   git push origin production
   ```

2. **Manual approval required**
   - CI tests run
   - Deployment waits for approval
   - Reviewer approves deployment
   - Deploys to production
   - Available at: https://ordo.railway.app

### Rollback

If deployment fails:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

## Release Process

### 1. Version Bump

Update version in `package.json`:

```bash
# Patch release (0.1.0 → 0.1.1)
npm version patch

# Minor release (0.1.0 → 0.2.0)
npm version minor

# Major release (0.1.0 → 1.0.0)
npm version major
```

### 2. Push Tag

```bash
# Push version tag
git push origin v0.1.0

# Or push all tags
git push --tags
```

### 3. Automatic Release

GitHub Actions will:
1. Create GitHub release with changelog
2. Publish package to npm
3. Push Docker image to GitHub Container Registry

### 4. Verify Release

Check:
- GitHub Releases: https://github.com/ordo-platform/ordo/releases
- npm: https://www.npmjs.com/package/@ordo/platform
- Docker: https://github.com/ordo-platform/ordo/pkgs/container/ordo

## Monitoring

### Workflow Status

View workflow runs:
- **Actions tab**: https://github.com/ordo-platform/ordo/actions
- **Status badges**: Add to README.md

```markdown
![CI](https://github.com/ordo-platform/ordo/workflows/CI/badge.svg)
![Deploy](https://github.com/ordo-platform/ordo/workflows/Deploy/badge.svg)
```

### Deployment Status

Check deployment status:
- **Environments tab**: https://github.com/ordo-platform/ordo/deployments
- **Railway dashboard**: https://railway.app/dashboard

### Notifications

Configure notifications:
- **GitHub**: Settings → Notifications
- **Slack**: Add GitHub app to Slack
- **Discord**: Add GitHub webhook to Discord

## Troubleshooting

### CI Fails

```bash
# Check workflow logs
# Go to Actions tab → Select failed workflow → View logs

# Common issues:
# 1. Linting errors
npm run lint

# 2. Test failures
npm test

# 3. Build errors
npm run build
```

### Deployment Fails

```bash
# Check Railway logs
railway logs --service ordo-staging

# Common issues:
# 1. Environment variables missing
railway variables

# 2. Build timeout
# Increase timeout in railway.json

# 3. Health check fails
# Check /health endpoint
```

### Release Fails

```bash
# Check workflow logs
# Common issues:
# 1. NPM token expired
# Update NPM_TOKEN secret

# 2. Docker push fails
# Check GITHUB_TOKEN permissions

# 3. Tag already exists
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
```

## Security

### Secrets Management

- Never commit secrets to git
- Use GitHub secrets for sensitive data
- Rotate tokens regularly
- Use environment-specific tokens

### Branch Protection

Enable branch protection:

**Settings → Branches → Add rule**

For `main` branch:
- Require pull request reviews (1+)
- Require status checks to pass
- Require branches to be up to date
- Include administrators

For `production` branch:
- Require pull request reviews (2+)
- Require status checks to pass
- Require branches to be up to date
- Include administrators
- Require deployment approval

### Dependency Security

Automated security scans:
- **npm audit**: Runs on every CI build
- **Snyk**: Scans for vulnerabilities
- **Dependabot**: Automatic dependency updates

Enable Dependabot:

**Settings → Security → Dependabot**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

## Best Practices

### 1. Commit Messages

Use conventional commits:

```bash
feat: add new feature
fix: fix bug
docs: update documentation
test: add tests
chore: update dependencies
```

### 2. Pull Requests

- Create feature branches
- Write descriptive PR titles
- Add PR description
- Request reviews
- Wait for CI to pass
- Squash and merge

### 3. Testing

- Write tests for new features
- Ensure tests pass locally
- Check coverage reports
- Fix failing tests before merging

### 4. Versioning

Follow semantic versioning:
- **Major**: Breaking changes (1.0.0 → 2.0.0)
- **Minor**: New features (1.0.0 → 1.1.0)
- **Patch**: Bug fixes (1.0.0 → 1.0.1)

## Advanced Configuration

### Custom Workflows

Create custom workflows in `.github/workflows/`:

```yaml
name: Custom Workflow

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  custom-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run custom-script
```

### Matrix Builds

Test multiple Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 21]
```

### Caching

Speed up workflows with caching:

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

## Support

- GitHub Actions Docs: https://docs.github.com/actions
- Railway Docs: https://docs.railway.app
- Ordo Issues: https://github.com/ordo-platform/ordo/issues

## Next Steps

1. Set up branch protection rules
2. Configure Dependabot
3. Add status badges to README
4. Set up Slack/Discord notifications
5. Configure custom workflows
