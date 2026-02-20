# Security Policy

## Reporting a Vulnerability

We take the security of Ordo seriously. If you discover a security vulnerability, please follow responsible disclosure practices.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security issues to:
- **Email**: security@ordo.com
- **Subject**: [SECURITY] Brief description of the issue

### What to Include

Please provide as much information as possible:

1. **Description** - Clear explanation of the vulnerability
2. **Impact** - What an attacker could achieve
3. **Steps to Reproduce** - Detailed reproduction steps
4. **Proof of Concept** - Code or commands demonstrating the issue
5. **Suggested Fix** - If you have ideas on how to fix it
6. **Your Contact Info** - So we can follow up with questions

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (see below)

## Severity Levels

### Critical (Fix within 24-48 hours)

- Remote code execution
- Private key exposure
- Unauthorized fund transfers
- Complete system compromise

### High (Fix within 7 days)

- Authentication bypass
- Privilege escalation
- SQL injection
- Significant data exposure

### Medium (Fix within 30 days)

- Cross-site scripting (XSS)
- Information disclosure
- Denial of service
- Logic errors affecting security

### Low (Fix within 90 days)

- Minor information leaks
- Best practice violations
- Non-exploitable bugs

## Bug Bounty Program

### Scope

The following components are in scope:

**Smart Contracts**
- Agent Registry Program (`programs/agent-registry/`)
- All on-chain instructions and state management

**Backend Services**
- API Server (`src/api/`)
- Database operations (`src/database/`)
- Authentication/authorization

**DeFi Integration**
- Token swap logic (`src/defi/`)
- Wallet management (`src/identity/`)
- Transaction signing

**Web & Mobile**
- Web application (`web/`)
- Mobile application (`mobile/`)

### Out of Scope

- Third-party dependencies (report to the maintainer)
- Social engineering attacks
- Physical attacks
- Denial of service attacks
- Issues in test/development code

### Rewards

We offer bug bounties at our discretion based on:
- **Severity** of the vulnerability
- **Quality** of the report
- **Impact** on users and the platform

**Reward Range**: Up to 10% of value at risk, capped at $10,000

**Conditions**:
- Details must not be shared with third parties before a fix is deployed
- Reporter must not exploit the vulnerability
- Reporter must not access user data beyond what's necessary to demonstrate the issue

### Ineligible for Bounty

- Issues already known to us
- Issues found in code not yet deployed to production
- Theoretical vulnerabilities without proof of concept
- Vulnerabilities requiring unlikely user interaction
- Issues found through automated scanning without validation

## Security Best Practices

### For Contributors

When contributing code:

1. **Never commit secrets** - No API keys, private keys, or passwords
2. **Validate all inputs** - Assume all user input is malicious
3. **Use parameterized queries** - Prevent SQL injection
4. **Check permissions** - Verify authorization for all operations
5. **Handle errors securely** - Don't leak sensitive information
6. **Keep dependencies updated** - Run `npm audit` regularly

### For Users

To stay secure:

1. **Keep your private keys safe** - Never share them
2. **Verify transactions** - Check details before signing
3. **Use hardware wallets** - For large amounts
4. **Enable 2FA** - Where available
5. **Keep software updated** - Use the latest version

## Security Features

### Smart Contract Security

- **Anchor Framework** - Type-safe Rust framework
- **Account Validation** - Strict checks on all accounts
- **Signer Verification** - Required for sensitive operations
- **Integer Overflow Protection** - Checked arithmetic
- **Access Control** - Role-based permissions

### Backend Security

- **Authentication** - JWT-based with secure sessions
- **Authorization** - Role-based access control (RBAC)
- **Rate Limiting** - Prevent abuse and DoS
- **Input Validation** - All inputs sanitized
- **Encryption** - Sensitive data encrypted at rest and in transit

### Infrastructure Security

- **HTTPS Only** - All traffic encrypted
- **Security Headers** - CSP, HSTS, X-Frame-Options
- **Regular Audits** - Automated and manual security reviews
- **Monitoring** - Real-time security event detection
- **Backups** - Regular encrypted backups

## Disclosure Policy

### Our Commitment

When you report a vulnerability:

1. We will acknowledge receipt within 48 hours
2. We will provide regular updates on our progress
3. We will not take legal action against good-faith security research

### Your Commitment

When reporting a vulnerability:

1. Give us reasonable time to fix the issue before public disclosure
2. Do not access or modify user data beyond what's necessary
3. Do not exploit the vulnerability for personal gain
4. Do not disclose the issue to others until we've fixed it

### Coordinated Disclosure

We follow a 90-day disclosure timeline:

1. **Day 0**: Vulnerability reported
2. **Day 7**: Fix developed and tested
3. **Day 14**: Fix deployed to production
4. **Day 90**: Public disclosure (if not fixed, we may disclose earlier)

We may request an extension if the fix is complex or requires coordination with other parties.

## Security Audits

### Completed Audits

- None yet - Project is in active development

### Planned Audits

- **Claude Code Security** - AI-powered vulnerability discovery
- **Manual Code Review** - Human security researchers
- **Penetration Testing** - Simulated attacks on production systems

### Audit Reports

When available, audit reports will be published at:
- https://github.com/agentic-reserve/ORDO/tree/main/audits

## Security Updates

### Notification Channels

Security updates are announced via:
- **GitHub Security Advisories** - https://github.com/agentic-reserve/ORDO/security/advisories
- **Discord** - Security channel (link in README)
- **Twitter** - @OrdoPlatform
- **Email** - security@ordo.com mailing list

### Update Policy

- **Critical**: Immediate deployment, users notified
- **High**: Deployed within 7 days, users notified
- **Medium/Low**: Included in next regular release

## Contact

For security-related questions or concerns:

- **Email**: security@ordo.com
- **PGP Key**: Available on request
- **Response Time**: Within 48 hours

For general questions, use:
- **GitHub Discussions**: https://github.com/agentic-reserve/ORDO/discussions
- **Discord**: (link in README)

## Acknowledgements

We thank the following security researchers for responsibly disclosing vulnerabilities:

- *Your name could be here!*

## Legal

This security policy is subject to change without notice. By reporting a vulnerability, you agree to these terms.

Last updated: February 2026
