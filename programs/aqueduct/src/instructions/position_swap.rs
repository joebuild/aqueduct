use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Token, TokenAccount}};
use whirlpool::{state::{TickArray, Whirlpool}};
use whirlpool::cpi::accounts::{Swap};

use crate::state::*;

#[derive(Clone)]
pub struct WhirlpoolProgram;
impl Id for WhirlpoolProgram {
    fn id() -> Pubkey { whirlpool::id() }
}

#[derive(Accounts)]
#[instruction(
    a_to_b: bool,
    amount: u64,
)]
pub struct PositionSwap<'info> {
    #[account(mut)]
    pub auth: Signer<'info>,

    /// CHECK:
    pub user: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [
            USER_PDA_PREFIX,
            user.key().as_ref()
        ],
        bump,
    )]
    pub user_pda: Box<Account<'info, User>>,

    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    #[account(mut)]
    pub whirlpool: Box<Account<'info, Whirlpool>>,

    #[account(mut, constraint = token_owner_account_a.mint == whirlpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = token_owner_account_b.mint == whirlpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_vault_a.key() == whirlpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = token_vault_b.key() == whirlpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, has_one = whirlpool)]
    pub tick_array_0: AccountLoader<'info, TickArray>,
    #[account(mut, has_one = whirlpool)]
    pub tick_array_1: AccountLoader<'info, TickArray>,
    #[account(mut, has_one = whirlpool)]
    pub tick_array_2: AccountLoader<'info, TickArray>,

    /// CHECK:
    pub oracle: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, PositionSwap<'info>>,
    a_to_b: bool,
    amount: u64,
) -> Result<()> {

    let (_user_pda, user_pda_bump) = Pubkey::find_program_address(&[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref()], ctx.program_id);
    let seeds = &[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref(), &[user_pda_bump]];
    let signer_seeds = &[&seeds[..]];

    msg!("a_to_b: {}", a_to_b);
    msg!("amount: {}", amount);

    let sqrt_price_limit = if a_to_b { MIN_SQRT_PRICE } else { MAX_SQRT_PRICE };

    let mut mod_amount = amount;

    if amount == 0u64 {
        mod_amount = if a_to_b { ctx.accounts.token_owner_account_a.amount } else { ctx.accounts.token_owner_account_b.amount }
    }

    if mod_amount > 0u64 {
        whirlpool::cpi::swap(
            ctx.accounts.into_swap_context().with_signer(signer_seeds),
            mod_amount,
            0, // TODO: set reasonable safety defaults for the swap
            sqrt_price_limit, // TODO: calculate this val to avoid errors with large orders
            true,
            a_to_b
        )?;
    }

    Ok(())
}

impl<'info> PositionSwap<'info> {

    fn into_swap_context(&self) -> CpiContext<'_, '_, '_, 'info, Swap<'info>> {
        let cpi_accounts = Swap {
            token_program: self.token_program.to_account_info(),
            token_authority: self.user_pda.to_account_info(),
            whirlpool: self.whirlpool.to_account_info(),
            token_owner_account_a: self.token_owner_account_a.to_account_info(),
            token_vault_a: self.token_vault_a.to_account_info(),
            token_owner_account_b: self.token_owner_account_b.to_account_info(),
            token_vault_b: self.token_vault_b.to_account_info(),
            tick_array_0: self.tick_array_0.to_account_info(),
            tick_array_1: self.tick_array_1.to_account_info(),
            tick_array_2: self.tick_array_2.to_account_info(),
            oracle: self.oracle.to_account_info(),
        };
        let cpi_program = self.whirlpool_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

}
