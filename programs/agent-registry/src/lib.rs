use anchor_lang::prelude::*;

declare_id!("AgentReg11111111111111111111111111111111111");

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

// Security.txt - Contact information for security researchers
// This is embedded in the program binary and visible in Solana Explorer
#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    // Required fields
    name: "Ordo Agent Registry",
    project_url: "https://github.com/agentic-reserve/ORDO",
    contacts: "email:security@ordo.com,link:https://github.com/agentic-reserve/ORDO/security,discord:Ordo#1234",
    policy: "https://github.com/agentic-reserve/ORDO/blob/main/SECURITY.md",

    // Optional fields
    preferred_languages: "en",
    source_code: "https://github.com/agentic-reserve/ORDO",
    source_release: env!("CARGO_PKG_VERSION"),
    auditors: "Pending - Apply for Claude Code Security audit",
    acknowledgements: "
Security researchers who help secure Ordo:
- Report vulnerabilities to security@ordo.com
- We appreciate responsible disclosure
"
}

#[program]
pub mod agent_registry {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        description: String,
        agent_uri: String,
        services: Vec<String>,
        x402_support: bool,
        generation: u32,
    ) -> Result<()> {
        instructions::register_agent::handler(
            ctx,
            name,
            description,
            agent_uri,
            services,
            x402_support,
            generation,
        )
    }

    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        score: i64,
        comment: String,
    ) -> Result<()> {
        instructions::update_reputation::handler(ctx, score, comment)
    }
}
