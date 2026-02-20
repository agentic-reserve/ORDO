use anchor_lang::prelude::*;

declare_id!("AgentReg11111111111111111111111111111111111");

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

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
