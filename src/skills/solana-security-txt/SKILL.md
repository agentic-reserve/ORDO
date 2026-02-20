# Solana security.txt Skill

## Overview
This skill provides guidance on implementing the security.txt standard for Solana smart contracts. The security.txt standard makes it easy for security researchers to contact project developers when they discover vulnerabilities.

## When to Use This Skill
- Adding security contact information to Solana programs
- Making programs discoverable for security researchers
- Implementing responsible disclosure mechanisms
- Setting up bug bounty programs
- Improving security posture of Solana projects

## Why security.txt Matters

Security researchers often discover vulnerabilities but struggle to contact developers, especially for smaller or private projects. The security.txt standard solves this by embedding standardized contact information directly in the smart contract binary.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
solana-security-txt = "1.1.2"
```

For querying security.txt from binaries:

```bash
cargo install query-security-txt
```

## Basic Usage

### Simple Implementation

```rust
use solana_security_txt::security_txt;

security_txt! {
    name: "My Project",
    project_url: "https://myproject.com",
    contacts: "email:security@myproject.com",
    policy: "https://myproject.com/security-policy"
}
```

### Complete Implementation

```rust
#[cfg(not(feature = "no-entrypoint"))]
use {default_env::default_env, solana_security_txt::security_txt};

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    // Required fields
    name: "Example Project",
    project_url: "https://example.com",
    contacts: "email:security@example.com,discord:security#1234,link:https://example.com/security",
    policy: "https://github.com/example/example/blob/main/SECURITY.md",

    // Optional fields
    preferred_languages: "en,es",
    source_code: "https://github.com/example/example",
    source_revision: default_env!("GITHUB_SHA", ""),
    source_release: default_env!("GITHUB_REF_NAME", ""),
    auditors: "Neodyme, OtterSec",
    acknowledgements: "https://example.com/security/hall-of-fame",
    encryption: "
-----BEGIN PGP PUBLIC KEY BLOCK-----
[Your PGP public key]
-----END PGP PUBLIC KEY BLOCK-----
"
}
```

## Field Reference

### Required Fields

#### name (string)
The name of your project. Use "private" if the project isn't public.

```rust
name: "Ordo Agent Registry"
```

#### project_url (https URL)
URL to your project's homepage or dapp. Use "private" if not public.

```rust
project_url: "https://ordo.example.com"
```

#### contacts (comma-separated list)
Contact methods in format `<type>:<info>`. Ordered by preference.

Supported contact types:
- `email`: Email address
- `link`: Web link (e.g., contact form)
- `discord`: Discord handle
- `telegram`: Telegram handle
- `twitter`: Twitter handle
- `other`: Other contact method

```rust
contacts: "email:security@example.com,discord:security#1234,link:https://example.com/contact"
```

**Best Practice**: Use stable contact methods like `security@` email addresses that won't change.

#### policy (link or text)
Your security policy describing bug bounties, disclosure terms, and reward structure.

```rust
policy: "https://github.com/example/example/blob/main/SECURITY.md"
```

Or inline:

```rust
policy: "
We offer bug bounties up to $10,000 for critical vulnerabilities.
Bounties are paid at our discretion after verification.
Reporters must not disclose issues publicly before fixes are deployed.
"
```

### Optional Fields

#### preferred_languages (comma-separated list)
ISO 639-1 language codes.

```rust
preferred_languages: "en,es,de"
```

#### source_code (URL)
Link to your source code repository.

```rust
source_code: "https://github.com/example/example"
```

#### source_revision (string)
Git commit SHA for build verification. Use `env!` macro for automation.

```rust
source_revision: default_env!("GITHUB_SHA", "")
```

#### source_release (string)
Release tag for build verification. Use `env!` macro for automation.

```rust
source_release: default_env!("GITHUB_REF_NAME", "")
```

#### auditors (comma-separated list or link)
Security auditors who reviewed your contract.

```rust
auditors: "Neodyme, OtterSec, Kudelski Security"
```

Or link to audit reports:

```rust
auditors: "https://example.com/audits"
```

**Note**: This is self-reported and may not be accurate.

#### acknowledgements (text or link)
Recognition for security researchers who found vulnerabilities.

```rust
acknowledgements: "
Thanks to the following researchers:
- Alice (@alice) - Critical vulnerability in v1.0
- Bob (@bob) - Access control issue in v1.2
"
```

#### encryption (PGP key or link)
PGP public key for encrypted communications.

```rust
encryption: "
-----BEGIN PGP PUBLIC KEY BLOCK-----
[Your full PGP public key block]
-----END PGP PUBLIC KEY BLOCK-----
"
```

#### expiry (date)
Expiration date in YYYY-MM-DD format.

```rust
expiry: "2026-12-31"
```

## Library Authors: Critical Configuration

If your contract is used as a dependency, you **MUST** exclude the macro when built as a library:

```rust
#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    // Your fields here
}
```

This prevents linker errors when multiple dependencies use security.txt.

## Security Policy Examples

### Minimal Policy

```markdown
## Security Policy

We pay bug bounties at our discretion after verifying the bug, up to 10% of value at risk, with a maximum of $50,000.

Bounties are only paid if:
- Details have not been shared with third parties before a fix is deployed
- The reporter does not exploit the issue without our explicit consent

Contact: security@example.com
```

### No Bounty Policy

For toy projects or low-value contracts:

```markdown
## Security Policy

We do not pay bug bounties. However, we appreciate responsible disclosure and will acknowledge security researchers who report issues.

Contact: security@example.com
```

### Comprehensive Policy

See examples from major projects:
- [Solana Foundation](https://github.com/solana-labs/solana/security/policy)
- [Serum](https://forum.projectserum.com/t/formalizing-a-bug-bounty-program/410)
- [Marinade Finance](https://docs.marinade.finance/developers/bug-bounty)
- [Solend](https://docs.solend.fi/protocol/bug-bounty)
- [Wormhole](https://github.com/certusone/wormhole/blob/dev.v2/ImmuneFi%20bug-bounty.md)

## Querying security.txt

### From Local Binary

```bash
query-security-txt target/deploy/my_program.so
```

### From On-Chain Program

```bash
query-security-txt <PROGRAM_ADDRESS>
```

### In Solana Explorer

View security.txt in the Solana Explorer:
```
https://explorer.solana.com/address/<PROGRAM_ADDRESS>/security?cluster=<CLUSTER>
```

Example: https://explorer.solana.com/address/HPxKXnBN4vJ8RjpdqDCU7gvNQHeeyGnSviYTJ4fBrDt4/security?cluster=devnet

## Build Verification

Use `source_revision` and `source_release` for reproducible builds:

```rust
security_txt! {
    name: "My Project",
    project_url: "https://myproject.com",
    contacts: "email:security@myproject.com",
    policy: "https://myproject.com/security",
    source_code: "https://github.com/myproject/myproject",
    source_revision: default_env!("GITHUB_SHA", ""),
    source_release: default_env!("GITHUB_REF_NAME", "")
}
```

Third-party verification tools can use these fields to:
1. Clone the repository at the specified commit/tag
2. Rebuild the binary
3. Compare with the on-chain program
4. Verify the deployed code matches the source

## Integration with CI/CD

### GitHub Actions

```yaml
name: Build and Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build program
        run: |
          anchor build
        env:
          GITHUB_SHA: ${{ github.sha }}
          GITHUB_REF_NAME: ${{ github.ref_name }}
      
      - name: Verify security.txt
        run: |
          cargo install query-security-txt
          query-security-txt target/deploy/my_program.so
```

## Ordo Implementation Example

```rust
// programs/agent-registry/src/lib.rs

use anchor_lang::prelude::*;

#[cfg(not(feature = "no-entrypoint"))]
use {default_env::default_env, solana_security_txt::security_txt};

declare_id!("YourProgramIDHere");

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Ordo Agent Registry",
    project_url: "https://github.com/agentic-reserve/ORDO",
    contacts: "email:security@ordo.example.com,link:https://github.com/agentic-reserve/ORDO/security/advisories/new",
    policy: "https://github.com/agentic-reserve/ORDO/blob/main/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/agentic-reserve/ORDO",
    source_revision: default_env!("GITHUB_SHA", ""),
    source_release: default_env!("GITHUB_REF_NAME", ""),
    auditors: "Pending",
    acknowledgements: "
Special thanks to security researchers who help keep Ordo secure.
See our Hall of Fame: https://github.com/agentic-reserve/ORDO/security
"
}

#[program]
pub mod agent_registry {
    use super::*;
    
    // Your program logic here
}
```

## Best Practices

### 1. Use Stable Contact Methods
Prefer email addresses over social media handles that might change:
```rust
// GOOD
contacts: "email:security@example.com,link:https://example.com/security"

// LESS IDEAL (handles can change)
contacts: "discord:user#1234,twitter:@user"
```

### 2. Link to External Policy
Keep detailed policy on your website/GitHub so you can update it without redeploying:
```rust
policy: "https://github.com/example/example/blob/main/SECURITY.md"
```

### 3. Include Build Information
Enable reproducible builds:
```rust
source_revision: default_env!("GITHUB_SHA", ""),
source_release: default_env!("GITHUB_REF_NAME", "")
```

### 4. Verify Before Deployment
Always test your security.txt before deploying:
```bash
anchor build
query-security-txt target/deploy/my_program.so
```

### 5. Keep Information Updated
If using inline policy, remember that updates require program upgrades. Consider using external links for information that might change.

### 6. Multiple Contact Methods
Provide multiple ways to reach you:
```rust
contacts: "email:security@example.com,discord:security#1234,link:https://example.com/contact"
```

## Troubleshooting

### Linker Error: `multiple definition of security_txt`

This means multiple dependencies use security.txt. Ensure all dependencies use the `no-entrypoint` guard:

```rust
#[cfg(not(feature = "no-entrypoint"))]
security_txt! { ... }
```

### security.txt Not Showing in Explorer

1. Verify it's in your binary:
   ```bash
   query-security-txt target/deploy/my_program.so
   ```

2. Ensure program is deployed to the correct cluster

3. Check the Explorer URL format:
   ```
   https://explorer.solana.com/address/<PROGRAM_ID>/security?cluster=<CLUSTER>
   ```

### Build Environment Variables Not Set

Use `default_env!` macro with fallback:
```rust
source_revision: default_env!("GITHUB_SHA", "local-build")
```

## Format Specification

The security.txt is stored as a string with markers:

```
=======BEGIN SECURITY.TXT V1=======\0
name\0My Project\0
project_url\0https://example.com\0
contacts\0email:security@example.com\0
policy\0https://example.com/security\0
=======END SECURITY.TXT V1=======\0
```

Fields are stored as key-value pairs delimited by null bytes (`\0`).

### ELF Section

The macro also creates a `.security.txt` ELF section containing a pointer to the string and its length, making it easier for ELF-aware parsers to locate the security.txt.

## Security Considerations

### 1. Contact Information Exposure
security.txt is public and on-chain. Only include contact information you're comfortable being public.

### 2. Policy Accuracy
Ensure your policy accurately reflects your bug bounty terms. Ambiguous policies can lead to disputes.

### 3. Response Commitment
Only include contact methods you actively monitor. Unresponsive security contacts are worse than none.

### 4. PGP Key Management
If providing encryption keys, ensure you:
- Have access to the private key
- Keep the private key secure
- Can rotate keys if compromised

### 5. Audit Claims
Only list auditors who have actually audited your code. False claims damage credibility.

## Integration with Bug Bounty Platforms

Many projects use platforms like Immunefi. You can link to your program:

```rust
policy: "https://immunefi.com/bounty/yourproject/"
```

Or include platform contact in contacts field:
```rust
contacts: "link:https://immunefi.com/bounty/yourproject/,email:security@example.com"
```

## Resources

- [solana-security-txt GitHub](https://github.com/neodyme-labs/solana-security-txt)
- [solana-security-txt Docs](https://docs.rs/solana-security-txt/)
- [query-security-txt Crate](https://crates.io/crates/query-security-txt)
- [securitytxt.org](https://securitytxt.org/) (Web standard inspiration)
- [Solana Explorer](https://explorer.solana.com/)

## Example Projects Using security.txt

Browse the Solana Explorer to see real-world implementations:
- Search for programs with `/security` tab
- Study their contact methods and policies
- Learn from established projects

## Minimal Implementation Checklist

- [ ] Add `solana-security-txt` dependency
- [ ] Include `#[cfg(not(feature = "no-entrypoint"))]` guard
- [ ] Set `name` field
- [ ] Set `project_url` field
- [ ] Set `contacts` field with at least one contact method
- [ ] Set `policy` field (link or inline)
- [ ] Test with `query-security-txt` before deployment
- [ ] Verify in Solana Explorer after deployment
- [ ] Monitor contact channels for security reports

## Complete Ordo Example

```rust
// programs/agent-registry/src/lib.rs

use anchor_lang::prelude::*;

#[cfg(not(feature = "no-entrypoint"))]
use {default_env::default_env, solana_security_txt::security_txt};

declare_id!("AgentRegistryProgramID111111111111111111111");

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Ordo Agent Registry",
    project_url: "https://github.com/agentic-reserve/ORDO",
    contacts: "email:security@ordo.example.com,link:https://github.com/agentic-reserve/ORDO/security/advisories/new,discord:ordo-security#0001",
    policy: "https://github.com/agentic-reserve/ORDO/blob/main/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/agentic-reserve/ORDO",
    source_revision: default_env!("GITHUB_SHA", ""),
    source_release: default_env!("GITHUB_REF_NAME", ""),
    auditors: "Pending - Accepting audit proposals",
    acknowledgements: "
We thank the following security researchers:
- [Future Hall of Fame]

Submit vulnerabilities responsibly and join our Hall of Fame!
",
    expiry: "2027-12-31"
}

#[program]
pub mod agent_registry {
    use super::*;
    
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Your program logic
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

This implementation provides comprehensive security contact information while maintaining flexibility for updates through external links.
