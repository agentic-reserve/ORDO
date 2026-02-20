use anchor_lang::prelude::*;
use crate::state::{AgentAccount, ReputationRecord};
use crate::errors::AgentRegistryError;

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(mut)]
    pub agent_account: Account<'info, AgentAccount>,
    
    #[account(
        init,
        payer = rater,
        space = ReputationRecord::BASE_SIZE + 256, // Allocate reasonable space
        seeds = [b"reputation", agent_account.key().as_ref(), rater.key().as_ref()],
        bump
    )]
    pub reputation_record: Account<'info, ReputationRecord>,
    
    #[account(mut)]
    pub rater: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<UpdateReputation>,
    score: i64,
    comment: String,
) -> Result<()> {
    // Validate inputs
    require!(
        score >= -100 && score <= 100,
        AgentRegistryError::InvalidReputationScore
    );
    require!(
        comment.len() <= ReputationRecord::MAX_COMMENT_LEN,
        AgentRegistryError::CommentTooLong
    );
    require!(
        ctx.accounts.agent_account.authority != ctx.accounts.rater.key(),
        AgentRegistryError::CannotRateSelf
    );

    let reputation_record = &mut ctx.accounts.reputation_record;
    let agent_account = &mut ctx.accounts.agent_account;
    let clock = Clock::get()?;

    // Store reputation record
    reputation_record.agent = ctx.accounts.agent_account.key();
    reputation_record.rater = ctx.accounts.rater.key();
    reputation_record.score = score;
    reputation_record.comment = comment.clone();
    reputation_record.timestamp = clock.unix_timestamp;
    reputation_record.bump = ctx.bumps.reputation_record;

    // Update cumulative reputation score on agent account
    agent_account.reputation_score = agent_account
        .reputation_score
        .checked_add(score)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // Emit event
    emit!(ReputationUpdatedEvent {
        agent: ctx.accounts.agent_account.key(),
        rater: ctx.accounts.rater.key(),
        score,
        new_total_score: agent_account.reputation_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct ReputationUpdatedEvent {
    pub agent: Pubkey,
    pub rater: Pubkey,
    pub score: i64,
    pub new_total_score: i64,
    pub timestamp: i64,
}
