use solana_program::pubkey;
use spl_token::solana_program::pubkey::Pubkey;

pub use pool_config::*;
pub use user::*;

mod pool_config;
mod user;

pub const POOL_CONFIG_PDA_PREFIX: &[u8] = b"conf";
pub const POSITION_OWNER_PDA_PREFIX: &[u8] = b"posi";
pub const USER_PDA_PREFIX: &[u8] = b"user";

pub const MAX_SQRT_PRICE: u128 = 79226673515401279992447579055;
pub const MIN_SQRT_PRICE: u128 = 4295048016;

pub const AQUEDUCT_FEE_NUMERATOR: u64 = 20;
pub const AQUEDUCT_FEE_DENOMINATOR: u64 = 100;

pub const AQUEDUCT_FEE_PERCENT: u64 = 15;

pub const PROGRAM_ID: Pubkey = pubkey!("EU3CcRRS2G4RR5bj7AogBNvErnf1G95gumA9b9fQ2Sco");

pub const ADMIN: Pubkey = pubkey!("AQuAraAPetCyiUsaeq5SqtwYBLoJyZe6o7vT98cmKVux");
pub const B_SERVICE: Pubkey = pubkey!("AQuBwENZc5k2kHQiYdpDfwTXQuos5A5yunc42RjC5wSt");
pub const C_SERVICE: Pubkey = pubkey!("AQuCcjumeuJMCWjmGf28DLkC6UXA1VuaGemBqiVsoW8U");

pub const USDC: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

pub const RESOLUTION: u64 = 10000;