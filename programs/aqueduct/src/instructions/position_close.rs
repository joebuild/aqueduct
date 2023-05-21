use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::token;
use whirlpool::state::{Position, TickArray, Whirlpool};
use whirlpool::cpi::accounts::{CollectFees, CollectReward, ModifyLiquidity, ClosePosition, UpdateFeesAndRewards};

use crate::state::*;
use crate::WhirlpoolProgram;

#[derive(Accounts)]
pub struct PositionClose<'info> {
    #[account(mut)]
    pub auth: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub user: UncheckedAccount<'info>,
    #[account(mut)]
    pub user_pda: Box<Account<'info, User>>,

    pub whirlpool_program: Program<'info, WhirlpoolProgram>,
    #[account(mut)]
    pub whirlpool: Box<Account<'info, Whirlpool>>,

    #[account(mut, has_one = whirlpool)]
    pub position: Box<Account<'info, Position>>,

    #[account(
        mut,
        constraint = position_token_account.mint == position.position_mint,
        constraint = position_token_account.amount == 1
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = position.position_mint)]
    pub position_mint: Account<'info, Mint>,

    #[account(mut, constraint = token_owner_account_a.mint == whirlpool.token_mint_a)]
    pub token_owner_account_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = whirlpool.token_vault_a)]
    pub token_vault_a: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub token_aqueduct_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = token_owner_account_b.mint == whirlpool.token_mint_b)]
    pub token_owner_account_b: Box<Account<'info, TokenAccount>>,
    #[account(mut, address = whirlpool.token_vault_b)]
    pub token_vault_b: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub token_aqueduct_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, has_one = whirlpool)]
    pub tick_array_lower: AccountLoader<'info, TickArray>,
    #[account(mut, has_one = whirlpool)]
    pub tick_array_upper: AccountLoader<'info, TickArray>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    // remaining_accounts are the (reward_owner_account, reward_vault) pairs for the whirlpool
}

pub fn handler<'info>(ctx: Context<'_, '_, '_, 'info, PositionClose<'info>>,
) -> Result<()> {

    let (_user_pda, user_pda_bump) = Pubkey::find_program_address(&[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref()], ctx.program_id);
    let seeds = &[USER_PDA_PREFIX, ctx.accounts.user.key.as_ref(), &[user_pda_bump]];
    let signer_seeds = &[&seeds[..]];

    ctx.accounts.position.reload()?;

    if ctx.accounts.position.liquidity > 0 {
        msg!("starting update_fees_and_rewards");
        whirlpool::cpi::update_fees_and_rewards(
            ctx.accounts.into_update_fees_and_rewards_context().with_signer(signer_seeds)
        )?;
        msg!("finished update_fees_and_rewards");
    }

    msg!("starting collect_fees");
    let token_a_start = ctx.accounts.token_owner_account_a.amount;
    let token_b_start = ctx.accounts.token_owner_account_b.amount;

    whirlpool::cpi::collect_fees(
        ctx.accounts.into_collect_fees_context().with_signer(signer_seeds)
    )?;

    ctx.accounts.token_owner_account_a.reload()?;
    ctx.accounts.token_owner_account_b.reload()?;

    let token_a_end = ctx.accounts.token_owner_account_a.amount;
    let token_b_end = ctx.accounts.token_owner_account_b.amount;

    let service_amount_token_a = ((token_a_end - token_a_start) * AQUEDUCT_FEE_PERCENT)/100;
    let service_amount_token_b = ((token_b_end - token_b_start) * AQUEDUCT_FEE_PERCENT)/100;

    if service_amount_token_a > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.token_owner_account_a.to_account_info(),
                    to: ctx.accounts.token_aqueduct_a.to_account_info(),
                    authority: ctx.accounts.user_pda.to_account_info(),
                },
            ).with_signer(signer_seeds),
            service_amount_token_a,
        )?;
    }

    if service_amount_token_b > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.token_owner_account_b.to_account_info(),
                    to: ctx.accounts.token_aqueduct_b.to_account_info(),
                    authority: ctx.accounts.user_pda.to_account_info(),
                },
            ).with_signer(signer_seeds),
            service_amount_token_b
        )?;
    }

    msg!("finished collect_fees");

    ctx.accounts.position.reload()?;

    msg!("starting collect_reward");
    for (i, reward_pair) in ctx.remaining_accounts.chunks(3).enumerate() {

        msg!("i: {}", i);
        msg!("amount_owed: {}", ctx.accounts.position.reward_infos[i].amount_owed);

        if ctx.accounts.position.reward_infos[i].amount_owed > 0 {
            let reward_owner_account: Account<'info, TokenAccount> = Account::try_from(&reward_pair[0])?;
            let reward_vault: Account<TokenAccount> = Account::try_from(&reward_pair[1])?;
            let service_ata: Account<'info, TokenAccount> = Account::try_from(&reward_pair[2])?;

            let tokens_start = reward_owner_account.amount;

            whirlpool::cpi::collect_reward(
                ctx.accounts.into_collect_rewards_context(reward_owner_account, reward_vault).with_signer(signer_seeds),
                i as u8
            )?;

            let reward_owner_account_after: Account<'info, TokenAccount> = Account::try_from(&reward_pair[0])?;
            let service_amount = ((reward_owner_account_after.amount - tokens_start) * AQUEDUCT_FEE_PERCENT)/100;

            if service_amount > 0 {
                token::transfer(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        token::Transfer {
                            from: reward_owner_account_after.to_account_info(),
                            to: service_ata.to_account_info(),
                            authority: ctx.accounts.user_pda.to_account_info()
                        },
                    ).with_signer(signer_seeds),
                    service_amount
                )?;
            }
        }
    }
    msg!("finished collect_reward");

    if ctx.accounts.position.liquidity > 0 {
        msg!("starting decrease_liquidity");
        whirlpool::cpi::decrease_liquidity(
            ctx.accounts.into_reduce_liquidity_context().with_signer(signer_seeds),
            ctx.accounts.position.liquidity,
            0u64,
            0u64
        )?;
        msg!("finished decrease_liquidity");
    }

    ctx.accounts.position.reload()?;
    msg!("ctx.accounts.position.liquidity: {}", ctx.accounts.position.liquidity);

    for ri in ctx.accounts.position.reward_infos {
        msg!("amount_owed: {}", ri.amount_owed);
    }

    msg!("starting close_position");
    whirlpool::cpi::close_position(
        ctx.accounts.into_close_position_context().with_signer(signer_seeds)
    )?;
    msg!("finished close_position");

    Ok(())
}

impl<'info> PositionClose<'info> {

    fn into_update_fees_and_rewards_context(&self) -> CpiContext<'_, '_, '_, 'info, UpdateFeesAndRewards<'info>> {
        let cpi_accounts = UpdateFeesAndRewards {
            whirlpool: self.whirlpool.to_account_info(),
            position: self.position.to_account_info(),
            tick_array_lower: self.tick_array_lower.to_account_info(),
            tick_array_upper: self.tick_array_upper.to_account_info()
        };
        let cpi_program = self.whirlpool_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

    fn into_collect_fees_context(&self) -> CpiContext<'_, '_, '_, 'info, CollectFees<'info>> {
        let cpi_accounts = CollectFees {
            whirlpool: self.whirlpool.to_account_info(),
            position_authority: self.user_pda.to_account_info(),
            position: self.position.to_account_info(),
            position_token_account: self.position_token_account.to_account_info(),
            token_owner_account_a: self.token_owner_account_a.to_account_info(),
            token_vault_a: self.token_vault_a.to_account_info(),
            token_owner_account_b: self.token_owner_account_b.to_account_info(),
            token_vault_b: self.token_vault_b.to_account_info(),
            token_program: self.token_program.to_account_info()
        };
        let cpi_program = self.whirlpool_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

    fn into_collect_rewards_context(&self,
        reward_owner_account: Account<'info, TokenAccount>,
        reward_vault: Account<'info, TokenAccount>
    ) -> CpiContext<'_, '_, '_, 'info, CollectReward<'info>> {
        let cpi_accounts = CollectReward {
            whirlpool: self.whirlpool.to_account_info(),
            position_authority: self.user_pda.to_account_info(),
            position: self.position.to_account_info(),
            position_token_account: self.position_token_account.to_account_info(),
            reward_owner_account: reward_owner_account.to_account_info(),
            reward_vault: reward_vault.to_account_info(),
            token_program: self.token_program.to_account_info()
        };
        let cpi_program = self.whirlpool_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

    fn into_reduce_liquidity_context(&self) -> CpiContext<'_, '_, '_, 'info, ModifyLiquidity<'info>> {
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
            tick_array_upper: self.tick_array_upper.to_account_info()
        };
        let cpi_program = self.whirlpool_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

    fn into_close_position_context(&self) -> CpiContext<'_, '_, '_, 'info, ClosePosition<'info>> {
        let cpi_accounts = ClosePosition {
            position_authority: self.user_pda.to_account_info(),
            receiver: self.auth.to_account_info(),
            position: self.position.to_account_info(),
            position_mint: self.position_mint.to_account_info(),
            position_token_account: self.position_token_account.to_account_info(),
            token_program: self.token_program.to_account_info()
        };
        let cpi_program = self.whirlpool_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }

}
