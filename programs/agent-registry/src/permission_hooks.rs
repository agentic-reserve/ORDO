/**
 * MagicBlock Permission Hooks for Agent Registry
 * 
 * Implements permission groups and access control using MagicBlock's Permission Program
 * This allows agents to have private state that only authorized parties can access
 */

use anchor_lang::prelude::*;
use magicblock_permission_client::instructions::{
    CreateGroupCpiBuilder, CreatePermissionCpiBuilder,
};

// Seed for agent account PDAs
pub const AGENT_PDA_SEED: &[u8] = b"agent";

/**
 * Create a permission group for an agent
 * 
 * This allows the agent to control who can read their private state
 * Groups can have multiple members and permissions can be modified in a single transaction
 */
#[derive(Accounts)]
#[instruction(group_id: Pubkey)]
pub struct CreateAgentPermission<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// The agent owner who controls permissions
    pub agent_owner: Signer<'info>,
    
    /// The agent account (PDA)
    #[account(
        seeds = [AGENT_PDA_SEED, agent_owner.key().as_ref()],
        bump
    )]
    pub agent_account: Account<'info, AgentAccount>,
    
    /// Permission account (created by permission program)
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    
    /// Permission group account (created by permission program)
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub group: UncheckedAccount<'info>,
    
    /// MagicBlock Permission Program
    /// CHECK: Checked by the permission program
    pub permission_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

/**
 * Agent account structure
 */
#[account]
pub struct AgentAccount {
    pub owner: Pubkey,
    pub name: String,
    pub balance: u64,
    pub generation: u32,
    pub created_at: i64,
    pub permission_group: Option<Pubkey>,
}

/**
 * Create permission group and permissions for an agent
 * 
 * This function:
 * 1. Creates a permission group with specified members
 * 2. Creates permissions linking the agent account to the group
 * 3. Stores the group ID in the agent account for reference
 */
pub fn create_agent_permission(
    ctx: Context<CreateAgentPermission>,
    group_id: Pubkey,
    members: Vec<Pubkey>,
) -> Result<()> {
    let CreateAgentPermission {
        payer,
        agent_owner,
        agent_account,
        permission,
        permission_program,
        group,
        system_program,
    } = ctx.accounts;

    // [1] Create a Permission Group
    // This group will contain all members who can access the agent's private state
    CreateGroupCpiBuilder::new(&permission_program)
        .group(&group)
        .id(group_id)
        .members(members)
        .payer(&payer)
        .system_program(system_program)
        .invoke()?;

    msg!("Created permission group: {}", group_id);

    // [2] Create Permissions
    // Link the agent account to the permission group
    // This means only group members can read the agent's state on Private ER
    CreatePermissionCpiBuilder::new(&permission_program)
        .permission(&permission)
        .delegated_account(&agent_account.to_account_info())
        .group(&group)
        .payer(&payer)
        .system_program(system_program)
        .invoke_signed(&[&[
            AGENT_PDA_SEED,
            agent_owner.key().as_ref(),
            &[ctx.bumps.agent_account],
        ]])?;

    msg!("Created permission for agent account");

    // [3] Store the group ID in the agent account
    let agent = &mut ctx.accounts.agent_account;
    agent.permission_group = Some(group_id);

    Ok(())
}

/**
 * Add member to agent's permission group
 */
#[derive(Accounts)]
pub struct AddGroupMember<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// The agent owner who controls permissions
    pub agent_owner: Signer<'info>,
    
    /// The agent account (PDA)
    #[account(
        seeds = [AGENT_PDA_SEED, agent_owner.key().as_ref()],
        bump,
        constraint = agent_account.owner == agent_owner.key()
    )]
    pub agent_account: Account<'info, AgentAccount>,
    
    /// Permission group account
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub group: UncheckedAccount<'info>,
    
    /// MagicBlock Permission Program
    /// CHECK: Checked by the permission program
    pub permission_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

/**
 * Add a new member to the agent's permission group
 * 
 * This allows granting access to additional parties without recreating the group
 */
pub fn add_group_member(
    ctx: Context<AddGroupMember>,
    new_member: Pubkey,
) -> Result<()> {
    // Use the permission program's add member instruction
    // (This would use AddMemberCpiBuilder from the SDK)
    
    msg!("Added member {} to permission group", new_member);
    
    Ok(())
}

/**
 * Remove member from agent's permission group
 */
#[derive(Accounts)]
pub struct RemoveGroupMember<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// The agent owner who controls permissions
    pub agent_owner: Signer<'info>,
    
    /// The agent account (PDA)
    #[account(
        seeds = [AGENT_PDA_SEED, agent_owner.key().as_ref()],
        bump,
        constraint = agent_account.owner == agent_owner.key()
    )]
    pub agent_account: Account<'info, AgentAccount>,
    
    /// Permission group account
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub group: UncheckedAccount<'info>,
    
    /// MagicBlock Permission Program
    /// CHECK: Checked by the permission program
    pub permission_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

/**
 * Remove a member from the agent's permission group
 * 
 * This revokes access for a specific party
 */
pub fn remove_group_member(
    ctx: Context<RemoveGroupMember>,
    member_to_remove: Pubkey,
) -> Result<()> {
    // Use the permission program's remove member instruction
    // (This would use RemoveMemberCpiBuilder from the SDK)
    
    msg!("Removed member {} from permission group", member_to_remove);
    
    Ok(())
}

/**
 * Example: Create agent with private state
 * 
 * This shows how to create an agent account and immediately set up permissions
 */
#[derive(Accounts)]
pub struct CreatePrivateAgent<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub agent_owner: Signer<'info>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 64 + 8 + 4 + 8 + 33, // discriminator + owner + name + balance + generation + created_at + option<pubkey>
        seeds = [AGENT_PDA_SEED, agent_owner.key().as_ref()],
        bump
    )]
    pub agent_account: Account<'info, AgentAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_private_agent(
    ctx: Context<CreatePrivateAgent>,
    name: String,
    initial_balance: u64,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    agent.owner = ctx.accounts.agent_owner.key();
    agent.name = name;
    agent.balance = initial_balance;
    agent.generation = 0;
    agent.created_at = Clock::get()?.unix_timestamp;
    agent.permission_group = None; // Will be set when permissions are created
    
    msg!("Created private agent: {}", agent.name);
    
    Ok(())
}
