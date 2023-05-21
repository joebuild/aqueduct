use anchor_lang::prelude::*;
use spl_token::solana_program::pubkey::Pubkey;

#[account]
pub struct PoolConfig {
    pub task: Pubkey,
    pub user: Pubkey,
    pub approved: bool,
    pub rejected: bool,
}

impl Default for PoolConfig {
    fn default() -> Self {
        PoolConfig {
            task: Pubkey::default(),
            user: Pubkey::default(),
            approved: false,
            rejected: false,
        }
    }
}
