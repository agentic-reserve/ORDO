use anchor_lang::prelude::*;

/// AgentAccount stores on-chain metadata for each agent
#[account]
pub struct AgentAccount {
    /// Authority (owner) of this agent account
    pub authority: Pubkey,
    /// Agent name
    pub name: String,
    /// Agent description
    pub description: String,
    /// URI pointing to additional agent metadata
    pub agent_uri: String,
    /// Services offered by this agent
    pub services: Vec<String>,
    /// Whether agent supports x402 payment protocol
    pub x402_support: bool,
    /// Whether agent is currently active
    pub active: bool,
    /// Parent agent (if this is an offspring)
    pub parent_agent: Option<Pubkey>,
    /// Timestamp when agent was registered
    pub registered_at: i64,
    /// Cumulative reputation score
    pub reputation_score: i64,
    /// Generation number (0 for genesis agents, parent.generation + 1 for offspring)
    pub generation: u32,
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl AgentAccount {
    /// Calculate space needed for AgentAccount
    /// 8 (discriminator) + 32 (authority) + 4 + name.len() + 4 + description.len() 
    /// + 4 + agent_uri.len() + 4 + services_total_len + 1 (x402_support) + 1 (active)
    /// + 1 + 32 (parent_agent Option) + 8 (registered_at) + 8 (reputation_score) 
    /// + 4 (generation) + 1 (bump)
    pub const BASE_SIZE: usize = 8 + 32 + 4 + 4 + 4 + 4 + 1 + 1 + 1 + 32 + 8 + 8 + 4 + 1;
    
    /// Maximum size for dynamic fields
    pub const MAX_NAME_LEN: usize = 50;
    pub const MAX_DESCRIPTION_LEN: usize = 200;
    pub const MAX_URI_LEN: usize = 200;
    pub const MAX_SERVICES: usize = 10;
    pub const MAX_SERVICE_LEN: usize = 50;
    
    pub fn space(name: &str, description: &str, agent_uri: &str, services: &[String]) -> usize {
        Self::BASE_SIZE 
            + name.len() 
            + description.len() 
            + agent_uri.len()
            + services.iter().map(|s| 4 + s.len()).sum::<usize>()
    }
}

/// ReputationRecord stores individual reputation ratings
#[account]
pub struct ReputationRecord {
    /// Agent being rated
    pub agent: Pubkey,
    /// Rater (who gave this rating)
    pub rater: Pubkey,
    /// Reputation score (-100 to +100)
    pub score: i64,
    /// Optional comment
    pub comment: String,
    /// Timestamp of rating
    pub timestamp: i64,
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl ReputationRecord {
    pub const BASE_SIZE: usize = 8 + 32 + 32 + 8 + 4 + 8 + 1;
    pub const MAX_COMMENT_LEN: usize = 500;
    
    pub fn space(comment: &str) -> usize {
        Self::BASE_SIZE + comment.len()
    }
}
