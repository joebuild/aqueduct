use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct InitATA<'info> {
    #[account(mut)]
    pub auth: Signer<'info>,
    #[account(mut)]
    /// CHECK:
    pub owner: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        associated_token::mint = mint,
        associated_token::authority = owner,
        payer = auth
    )]
    pub ata: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<InitATA>,
) -> Result<()> {
    Ok(())
}
