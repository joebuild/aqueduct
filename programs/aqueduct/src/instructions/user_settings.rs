use anchor_lang::prelude::*;
use whirlpool::state::Whirlpool;
use crate::state::*;

#[derive(Accounts)]
#[instruction(
    is_paused: bool,
)]
pub struct UserSettings<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [
            USER_PDA_PREFIX,
            user.key().as_ref()
        ],
        bump,
    )]
    pub user_pda: Box<Account<'info, User>>,
    pub whirlpool: Box<Account<'info, Whirlpool>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UserSettings>,
    is_paused: bool,
) -> Result<()> {

    ctx.accounts.user_pda.paused = is_paused;
    ctx.accounts.user_pda.whirlpool = ctx.accounts.whirlpool.key();

    Ok(())
}
