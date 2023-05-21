use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::*;

#[derive(Accounts)]
#[instruction(
    amount: u64,
)]
pub struct FundsWithdraw<'info> {
    #[account(
        mut,
        constraint = user.key() == user_pda.user
    )]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [
            USER_PDA_PREFIX,
            user.key().as_ref()
        ],
        bump,
    )]
    pub user_pda: Account<'info, User>,
    #[account(
        mut,
        constraint = source_ata.owner == user_pda.key(),
    )]
    pub source_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        associated_token::mint = mint,
        associated_token::authority = user,
        payer = user
    )]
    pub destination_ata: Account<'info, TokenAccount>,
    #[account(
        constraint = mint.decimals != 0,
    )]
    pub mint: Account<'info, Mint>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FundsWithdraw>,
   amount: u64,
) -> Result<()> {
    let (_user_pda, user_pda_bump) = Pubkey::find_program_address(&[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref()], ctx.program_id);
    let seeds = &[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref(), &[user_pda_bump]];
    let signer_seeds = &[&seeds[..]];

    if amount == 0u64 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.source_ata.to_account_info(),
                    to: ctx.accounts.destination_ata.to_account_info(),
                    authority: ctx.accounts.user_pda.to_account_info(),
                },
            ).with_signer(signer_seeds),
            ctx.accounts.source_ata.amount,
        )?;
    } else {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.source_ata.to_account_info(),
                    to: ctx.accounts.destination_ata.to_account_info(),
                    authority: ctx.accounts.user_pda.to_account_info(),
                },
            ).with_signer(signer_seeds),
            amount,
        )?;
    }

    Ok(())
}