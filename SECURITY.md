# Security Policy

## Reporting Security Vulnerabilities

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@ordo.com**

Include the following information:
- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability

We will respond within 48 hours and work with you to understand and resolve the issue.

## API Key Security

### Critical: Never Commit API Keys

This repository uses `.env.example` as a template. **NEVER commit real API keys to version control.**

### Exposed Keys Found

If you find exposed API keys in this repository:
1. Report immediately to security@ordo.com
2. Rotate the exposed keys immediately
3. Review access logs for unauthorized usage

### Best Practices

1. **Use Environment Variables**
   ```bash
   # Copy template
   cp .env.example .env
   
   # Add your real keys to .env (which is in .gitignore)
   nano .env
   ```

2. **Generate Secure Keys**
   ```bash
   # Encryption key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Use Secrets Managers in Production**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

4. **Rotate Keys Regularly**
   - API keys: Every 90 days
   - Encryption keys: Every 180 days
   - JWT secrets: Every 90 days

5. **Use Different Keys Per Environment**
   - Development
   - Staging
   - Production

## Wallet Security

### Private Key Management

**CRITICAL**: Never expose Solana private keys!

1. **Development**: Use test wallets with minimal funds
2. **Production**: Use hardware wallets or MPC solutions
3. **Never**: Commit private keys to version control
4. **Never**: Share private keys via chat/email

### Recommended Wallet Solutions

- **Development**: Phantom, Solflare (testnet)
- **Production**: Ledger, Squads (multisig)
- **Programmatic**: AWS KMS, Google Cloud KMS

## Dependency Security

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Automated Scanning

We use:
- Dependabot for dependency updates
- npm audit for vulnerability scanning
- Snyk for continuous monitoring (optional)

## Smart Contract Security

### Audit Requirements

Before mainnet deployment:
1. Internal code review
2. External security audit
3. Bug bounty program
4. Gradual rollout with monitoring

### Testing

```bash
# Run all tests
anchor test

# Run with coverage
anchor test --coverage

# Fuzz testing
cargo fuzz run <target>
```

## Access Control

### Repository Access

- Maintainers: Full access
- Contributors: Fork and PR workflow
- Bots: Read-only (except CI/CD)

### API Access

- Rate limiting enabled
- Authentication required for sensitive endpoints
- IP whitelisting for admin endpoints

## Incident Response

### If You Discover a Vulnerability

1. **Do not** exploit the vulnerability
2. **Do not** disclose publicly
3. **Do** report to security@ordo.com
4. **Do** provide detailed information
5. **Do** allow time for fix before disclosure

### Response Timeline

- **24 hours**: Initial response
- **48 hours**: Vulnerability assessment
- **7 days**: Fix development
- **14 days**: Fix deployment
- **30 days**: Public disclosure (coordinated)

## Compliance

### Data Protection

- GDPR compliant (EU users)
- CCPA compliant (California users)
- SOC 2 Type II (in progress)

### Encryption

- Data at rest: AES-256
- Data in transit: TLS 1.3
- Wallet keys: Hardware security modules

## Security Checklist

### Before Deployment

- [ ] All API keys rotated
- [ ] Environment variables configured
- [ ] Secrets manager configured
- [ ] Rate limiting enabled
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Logging configured
- [ ] Monitoring configured
- [ ] Backup configured
- [ ] Disaster recovery plan
- [ ] Incident response plan

### Regular Maintenance

- [ ] Weekly: Review access logs
- [ ] Monthly: Rotate API keys
- [ ] Quarterly: Security audit
- [ ] Annually: Penetration testing

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)
- [Anchor Security](https://www.anchor-lang.com/docs/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

- Security Email: security@ordo.com
- General Contact: contributors@ordo.com
- Discord: [Join our server](https://discord.gg/ordo)

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help improve our security.

---

Last Updated: 2025-01-21
