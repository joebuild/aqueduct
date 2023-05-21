use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Token, Mint, TokenAccount}};
use whirlpool::{state::{OpenPositionBumps, Whirlpool}};
use whirlpool::cpi::accounts::{OpenPosition};

use crate::state::*;

#[derive(Clone)]
pub struct WhirlpoolProgram;
impl Id for WhirlpoolProgram {
    fn id() -> Pubkey { whirlpool::id() }
}

#[derive(Accounts)]
#[instruction(
    position_bump: u8,
    tick_lower_index: i32,
    tick_upper_index: i32,
)]
pub struct PositionOpen<'info> {
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

    /// CHECK: Safe
    #[account(mut)]
    pub position: AccountInfo<'info>,
    #[account(mut)]
    pub position_mint: Signer<'info>,
    /// CHECK: Safe
    #[account(mut)]
    pub position_token_account: AccountInfo<'info>,
    #[account(mut)]
    pub whirlpool: Box<Account<'info, Whirlpool>>,

    pub mint_a: Box<Account<'info, Mint>>,
    pub mint_b: Box<Account<'info, Mint>>,

    #[account(
        init_if_needed,
        associated_token::mint = mint_a,
        associated_token::authority = user_pda,
        payer = auth
    )]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        associated_token::mint = mint_b,
        associated_token::authority = user_pda,
        payer = auth
    )]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, PositionOpen<'info>>,
    position_bump: u8,
    tick_lower_index: i32,
    tick_upper_index: i32,
) -> Result<()> {

    let (_user_pda, user_pda_bump) = Pubkey::find_program_address(&[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref()], ctx.program_id);
    let seeds = &[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref(), &[user_pda_bump]];
    let signer_seeds = &[&seeds[..]];

    let tick_index_current = ctx.accounts.whirlpool.tick_current_index;

    assert!(tick_index_current >= tick_lower_index);
    assert!(tick_index_current <= tick_upper_index);

    whirlpool::cpi::open_position(
        ctx.accounts.into_open_position_context().with_signer(signer_seeds),
        OpenPositionBumps { position_bump },
        tick_lower_index,
        tick_upper_index
    )?;

    Ok(())
}

impl<'info> PositionOpen<'info> {

    fn into_open_position_context(&self) -> CpiContext<'_, '_, '_, 'info, OpenPosition<'info>> {
        let cpi_accounts = OpenPosition {
            funder: self.auth.to_account_info(),
            owner: self.user_pda.to_account_info(),
            position: self.position.to_account_info(),
            position_mint: self.position_mint.to_account_info(),
            position_token_account: self.position_token_account.to_account_info(),
            whirlpool: self.whirlpool.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            rent: self.rent.to_account_info(),
            associated_token_program: self.associated_token_program.to_account_info()
        };
        let cpi_program = self.whirlpool_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

}
