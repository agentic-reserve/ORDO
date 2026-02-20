use anchor_lang::prelude::*;

#[error_code]
pub enum AgentRegistryError {
    #[msg("Agent name is too long (max 50 characters)")]
    NameTooLong,
    
    #[msg("Agent description is too long (max 200 characters)")]
    DescriptionTooLong,
    
    #[msg("Agent URI is too long (max 200 characters)")]
    UriTooLong,
    
    #[msg("Too many services (max 10)")]
    TooManyServices,
    
    #[msg("Service name is too long (max 50 characters)")]
    ServiceNameTooLong,
    
    #[msg("Reputation comment is too long (max 500 characters)")]
    CommentTooLong,
    
    #[msg("Reputation score must be between -100 and +100")]
    InvalidReputationScore,
    
    #[msg("Cannot rate yourself")]
    CannotRateSelf,
}
