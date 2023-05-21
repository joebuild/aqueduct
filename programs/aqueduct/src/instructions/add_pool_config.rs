use std::{
    mem::size_of,
};

use anchor_lang::prelude::*;
use whirlpool::state::Whirlpool;

use crate::state::*;

#[derive(Accounts)]
pub struct AddPoolConfig<'info> {
    #[account(mut)]
    pub auth: Signer<'info>,

    #[account(
        init,
        seeds = [
            POOL_CONFIG_PDA_PREFIX,
            whirlpool.key().as_ref()
        ],
        bump,
        payer = auth,
        space = 8 + size_of::<PoolConfig>()
    )]
    pub pool_config: Account<'info, PoolConfig>,

    #[account(mut)]
    pub whirlpool: Box<Account<'info, Whirlpool>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<AddPoolConfig>,
) -> Result<()> {

    Ok(())
}
