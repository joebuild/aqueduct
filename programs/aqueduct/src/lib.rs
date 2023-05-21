extern crate anchor_lang;
extern crate anchor_spl;
extern crate solana_program;

use anchor_lang::prelude::*;

use instructions::*;
use state::{ADMIN, B_SERVICE};

pub mod instructions;
pub mod integrations;
pub mod state;

declare_id!("EU3CcRRS2G4RR5bj7AogBNvErnf1G95gumA9b9fQ2Sco");

#[program]
pub mod aqueduct {
    use super::*;

    #[access_control(
        admin_access(&ctx.accounts.auth)
    )]
    pub fn add_pool_config(
        ctx: Context<AddPoolConfig>,
    ) -> Result<()> {
        add_pool_config::handler(
            ctx,
        )
    }

    pub fn user_create(
        ctx: Context<UserCreate>,
    ) -> Result<()> {
        user_create::handler(
            ctx,
        )
    }

    pub fn user_settings(
        ctx: Context<UserSettings>,
        is_paused: bool,
    ) -> Result<()> {
        user_settings::handler(
            ctx,
            is_paused
        )
    }

    pub fn user_delete(
        ctx: Context<UserDelete>,
    ) -> Result<()> {
        user_delete::handler(
            ctx,
        )
    }

    #[access_control(
        service_access(&ctx.accounts.auth)
    )]
    pub fn position_open<'info>(
        ctx: Context<'_, '_, '_, 'info, PositionOpen<'info>>,
        position_bump: u8,
        tick_lower_index: i32,
        tick_upper_index: i32,
    ) -> Result<()> {
        position_open::handler(
            ctx,
            position_bump,
            tick_lower_index,
            tick_upper_index,
        )
    }

    #[access_control(
        service_access(&ctx.accounts.auth)
    )]
    pub fn position_swap<'info>(
        ctx: Context<'_, '_, '_, 'info, PositionSwap<'info>>,
        a_to_b: bool,
        amount: u64,
    ) -> Result<()> {
        position_swap::handler(
            ctx,
            a_to_b,
            amount,
        )
    }

    #[access_control(
        service_access(&ctx.accounts.auth)
    )]
    pub fn position_fund<'info>(
        ctx: Context<'_, '_, '_, 'info, PositionFund<'info>>,
        tick_lower_index: i32,
        tick_upper_index: i32,
        minimum_a_amount: u64,
        minimum_b_amount: u64
    ) -> Result<()> {
        position_fund::handler(
            ctx,
            tick_lower_index,
            tick_upper_index,
            minimum_a_amount,
            minimum_b_amount
        )
    }

    #[access_control(
        service_access(&ctx.accounts.auth)
    )]
    pub fn init_ata<'info>(
        ctx: Context<'_, '_, '_, 'info, InitATA<'info>>,
    ) -> Result<()> {
        init_ata::handler(
            ctx,
        )
    }

    #[access_control(
        service_access(&ctx.accounts.auth)
    )]
    pub fn position_close<'info>(
        ctx: Context<'_, '_, '_, 'info, PositionClose<'info>>,
    ) -> Result<()> {
        position_close::handler(
            ctx,
        )
    }

    pub fn funds_deposit(
        ctx: Context<FundsDeposit>,
        amount: u64,
    ) -> Result<()> {
        funds_deposit::handler(
            ctx,
            amount
        )
    }

    pub fn funds_withdraw(
        ctx: Context<FundsWithdraw>,
        amount: u64,
    ) -> Result<()> {
        funds_withdraw::handler(
            ctx,
            amount
        )
    }

}

fn admin_access<'info>(auth: &Signer<'info>) -> Result<()> {
    if !(auth.key == &ADMIN) {
        msg!("not an authorized admin account");
        return Err(ErrorCode::ConstraintSigner.into());
    }

    Ok(())
}

fn service_access<'info>(auth: &Signer<'info>) -> Result<()> {
    if !(auth.key == &B_SERVICE) {
        msg!("not an authorized service account");
        return Err(ErrorCode::ConstraintSigner.into());
    }

    Ok(())
}

