use std::mem::size_of;

use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct UserCreate<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        seeds = [
            USER_PDA_PREFIX,
            user.key().as_ref()
        ],
        bump,
        payer = user,
        space = 8 + size_of::<User>()
    )]
    pub user_pda: Account<'info, User>,

    /// CHECK: Mango CPI
    pub mango_group: AccountInfo<'info>,
    /// CHECK: Mango CPI
    pub mango_account: AccountInfo<'info>,
    /// CHECK: Mango CPI
    pub mango_v3: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UserCreate>,
) -> Result<()> {

    // mango_markets_v3 ::create_mango_account(
    //     ctx.accounts
    //         .into_mango_user_create_ctx(),
    //         // .with_signer(depository_pda_signer),
    //     0u64,
    // )?;

    // ctx.accounts.user_pda.mango_account = ctx.accounts.mango_account.to_account_info().key();

    ctx.accounts.user_pda.user = ctx.accounts.user.to_account_info().key();

    Ok(())
}

// impl<'info> UserCreate<'info> {
//     pub fn into_mango_user_create_ctx(
//         &self,
//     ) -> CpiContext<'_, '_, '_, 'info, CreateMangoAccount<'info>> {
//         let cpi_accounts = CreateMangoAccount {
//             mango_group: self.mango_group.to_account_info(),
//             mango_account: self.mango_account.to_account_info(),
//             owner: self.user.to_account_info(),
//             system_prog: self.system_program.to_account_info(),
//             payer: self.user.to_account_info(),
//         };
//         let cpi_program = self.mango_v3.to_account_info();
//         CpiContext::new(cpi_program, cpi_accounts)
//     }
// }
