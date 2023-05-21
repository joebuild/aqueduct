use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Token, TokenAccount}};
use whirlpool::{manager::liquidity_manager::calculate_liquidity_token_deltas, math::{mul_u256, sqrt_price_from_tick_index, U256Muldiv}, state::{Position, TickArray, Whirlpool}};
use whirlpool::cpi::accounts::{ModifyLiquidity};

use crate::state::*;

#[derive(Clone)]
pub struct WhirlpoolProgram;
impl Id for WhirlpoolProgram {
    fn id() -> Pubkey { whirlpool::id() }
}

#[derive(Accounts)]
#[instruction(
    tick_lower_index: i32,
    tick_upper_index: i32,
    minimum_a_amount: u64,
    minimum_b_amount: u64
)]
pub struct PositionFund<'info> {
    #[account(mut)]
    pub auth: Signer<'info>,

    /// CHECK:
    pub user: UncheckedAccount<'info>,
    #[account(mut)]
    pub user_pda: Box<Account<'info, User>>,

    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    #[account(mut)]
    pub whirlpool: Box<Account<'info, Whirlpool>>,

    #[account(mut, has_one = whirlpool)]
    pub position: Box<Account<'info, Position>>,
    #[account(
        constraint = position_token_account.mint == position.position_mint,
        constraint = position_token_account.amount == 1
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub position_mint: Signer<'info>,

    #[account(mut, constraint = token_owner_account_a.mint == whirlpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = token_owner_account_b.mint == whirlpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_vault_a.key() == whirlpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = token_vault_b.key() == whirlpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, has_one = whirlpool)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,
    #[account(mut, has_one = whirlpool)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, PositionFund<'info>>,
    tick_lower_index: i32,
    tick_upper_index: i32,
    minimum_a_amount: u64,
    minimum_b_amount: u64
) -> Result<()> {

    let (_user_pda, user_pda_bump) = Pubkey::find_program_address(&[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref()], ctx.program_id);
    let seeds = &[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref(), &[user_pda_bump]];
    let signer_seeds = &[&seeds[..]];

    ctx.accounts.token_owner_account_a.reload()?;
    ctx.accounts.token_owner_account_b.reload()?;

    let token_a_amount: u64 = ctx.accounts.token_owner_account_a.amount;
    let token_b_amount: u64 = ctx.accounts.token_owner_account_b.amount;

    let tick_index_current = ctx.accounts.whirlpool.tick_current_index;

    assert!(tick_index_current >= tick_lower_index);
    assert!(tick_index_current <= tick_upper_index);

    // let sqrt_price_lower_x64 = sqrt_price_from_tick_index(tick_lower_index);
    let sqrt_price_current_x64 = ctx.accounts.whirlpool.sqrt_price;
    let sqrt_price_upper_x64 = sqrt_price_from_tick_index(tick_upper_index);

    // msg!("sqrt_price_current_x64: {}", sqrt_price_current_x64);
    // msg!("sqrt_price_upper_x64: {}", sqrt_price_upper_x64);

    // get_liquidity_from_token_a is imported from whirlpools-sdk (getLiquidityFromTokenA)
    let liquidity = get_liquidity_from_token_a(token_a_amount as u128, sqrt_price_current_x64, sqrt_price_upper_x64)?;

    msg!("liquidity: {}", liquidity);

    let (token_max_a, token_max_b) = calculate_liquidity_token_deltas(
        tick_index_current,
        sqrt_price_current_x64,
        &ctx.accounts.position,
        liquidity as i128
    )?;

    // msg!("token_owner_account_a.amount: {}", ctx.accounts.token_owner_account_a.amount);
    // msg!("token_owner_account_b.amount: {}", ctx.accounts.token_owner_account_b.amount);

    // msg!("token_a_amount: {}", token_a_amount);
    // msg!("token_b_amount: {}", token_b_amount);

    // msg!("token_max_a: {}", token_max_a);
    // msg!("token_max_b: {}", token_max_b);

    assert!(token_max_a > minimum_a_amount);
    assert!(token_max_b > minimum_b_amount);

    msg!("starting increase liquiditiy..");

    whirlpool::cpi::increase_liquidity(
        ctx.accounts.into_increase_liquidity_context().with_signer(signer_seeds),
        liquidity,
        token_max_a,
        token_max_b
    )?;

    msg!("finished increase liquiditiy");

    Ok(())
}

impl<'info> PositionFund<'info> {

    fn into_increase_liquidity_context(&self) -> CpiContext<'_, '_, '_, 'info, ModifyLiquidity<'info>> {
        let cpi_accounts = ModifyLiquidity {
            whirlpool: self.whirlpool.to_account_info(),
            token_program: self.token_program.to_account_info(),
            position_authority: self.user_pda.to_account_info(),
            position: self.position.to_account_info(),
            position_token_account: self.position_token_account.to_account_info(),
            token_owner_account_a: self.token_owner_account_a.to_account_info(),
            token_owner_account_b: self.token_owner_account_b.to_account_info(),
            token_vault_a: self.token_vault_a.to_account_info(),
            token_vault_b: self.token_vault_b.to_account_info(),
            tick_array_lower: self.tick_array_lower.to_account_info(),
            tick_array_upper: self.tick_array_upper.to_account_info(),
        };
        let cpi_program = self.whirlpool_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

// https://github.com/everlastingsong/solsandbox/blob/main/orca_whirlpools_sdk/rust_cpi/cpi_whirlpool_increase_liquidity/programs/cpi_whirlpool_increase_liquidity/src/lib.rs
fn get_liquidity_from_token_a(amount: u128, sqrt_price_lower_x64: u128, sqrt_price_upper_x64: u128 ) -> Result<u128> {
    // Δa = liquidity/sqrt_price_lower - liquidity/sqrt_price_upper
    // liquidity = Δa * ((sqrt_price_lower * sqrt_price_upper) / (sqrt_price_upper - sqrt_price_lower))
    assert!(sqrt_price_lower_x64 < sqrt_price_upper_x64);
    let sqrt_price_diff = sqrt_price_upper_x64 - sqrt_price_lower_x64;

    let numerator = mul_u256(sqrt_price_lower_x64, sqrt_price_upper_x64); // x64 * x64
    let denominator = U256Muldiv::new(0, sqrt_price_diff); // x64

    let (quotient, _remainder) = numerator.div(denominator, false);

    let liquidity = quotient
        .mul(U256Muldiv::new(0, amount))
        .shift_word_right()
        .try_into_u128()
        .or(Err(ErrorCode::WhirlpoolNumberDownCastError.into()));

    liquidity
}

#[error_code]
pub enum ErrorCode {
  OutOfRange,
  TooMuchAmount,
  WhirlpoolNumberDownCastError,
  LiquidityZero
}
