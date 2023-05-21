use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct UserDelete<'info> {
    #[account(
        mut,
        constraint = user.key() == user_pda.user
    )]
    pub user: Signer<'info>,
    #[account(
        mut,
        close=user
    )]
    pub user_pda: Account<'info, User>,
    pub system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<UserDelete>,
) -> Result<()> {
    Ok(())
}
