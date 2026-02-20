use anchor_lang::prelude::*;
use crate::state::AgentAccount;
use crate::errors::AgentRegistryError;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = AgentAccount::BASE_SIZE + 256, // Allocate reasonable space
        seeds = [b"agent", authority.key().as_ref()],
        bump
    )]
    pub agent_account: Account<'info, AgentAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterAgent>,
    name: String,
    description: String,
    agent_uri: String,
    services: Vec<String>,
    x402_support: bool,
    generation: u32,
) -> Result<()> {
    // Validate input lengths
    require!(
        name.len() <= AgentAccount::MAX_NAME_LEN,
        AgentRegistryError::NameTooLong
    );
    require!(
        description.len() <= AgentAccount::MAX_DESCRIPTION_LEN,
        AgentRegistryError::DescriptionTooLong
    );
    require!(
        agent_uri.len() <= AgentAccount::MAX_URI_LEN,
        AgentRegistryError::UriTooLong
    );
    require!(
        services.len() <= AgentAccount::MAX_SERVICES,
        AgentRegistryError::TooManyServices
    );
    for service in &services {
        require!(
            service.len() <= AgentAccount::MAX_SERVICE_LEN,
            AgentRegistryError::ServiceNameTooLong
        );
    }

    let agent_account = &mut ctx.accounts.agent_account;
    let clock = Clock::get()?;

    agent_account.authority = ctx.accounts.authority.key();
    agent_account.name = name.clone();
    agent_account.description = description;
    agent_account.agent_uri = agent_uri;
    agent_account.services = services;
    agent_account.x402_support = x402_support;
    agent_account.active = true;
    agent_account.parent_agent = None; // Can be set later for offspring
    agent_account.registered_at = clock.unix_timestamp;
    agent_account.reputation_score = 0;
    agent_account.generation = generation;
    agent_account.bump = ctx.bumps.agent_account;

    // Emit event
    emit!(AgentRegisteredEvent {
        agent: ctx.accounts.agent_account.key(),
        authority: ctx.accounts.authority.key(),
        name,
        generation,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct AgentRegisteredEvent {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub generation: u32,
    pub timestamp: i64,
}
