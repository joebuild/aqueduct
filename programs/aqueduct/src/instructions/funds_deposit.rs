use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::*;

#[derive(Accounts)]
#[instruction(
    deposit_amount: u64,
)]
pub struct FundsDeposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_pda: Account<'info, User>,
    #[account(mut)]
    pub source_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        associated_token::mint = mint,
        associated_token::authority = user_pda,
        payer = user
    )]
    pub destination_ata: Account<'info, TokenAccount>,
    #[account(
        constraint = *mint.to_account_info().key == USDC,
    )]
    pub mint: Account<'info, Mint>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FundsDeposit>,
   deposit_amount: u64,
) -> Result<()> {

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.source_ata.to_account_info(),
                to: ctx.accounts.destination_ata.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        deposit_amount,
    )?;

    Ok(())
}
