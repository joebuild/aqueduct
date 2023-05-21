use anchor_lang::prelude::*;
use spl_token::solana_program::pubkey::Pubkey;

#[account]
pub struct User {
    pub user: Pubkey,
    pub paused: bool,
    pub whirlpool: Pubkey,
}

impl Default for User {
    fn default() -> Self {
        User {
            user: Pubkey::default(),
            paused: false,
            whirlpool: Pubkey::default()
        }
    }
}