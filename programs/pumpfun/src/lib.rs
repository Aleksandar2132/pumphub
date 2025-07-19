use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, InitializeMint, MintTo};
use std::str::FromStr;

declare_id!("FfJxVq3U1hcoNFJVuYyfh1iG6zv7DJrM8pZJQtwM5mT4"); // Cambia esto si tu ID del programa es diferente

const OWNER_WALLET: &str = "G2H9ZuNWtjmthZ2JJuLkHJ7yNVvRRhp8DhYxWjjN1J6x"; // Tu wallet Phantom
const FEE_LAMPORTS: u64 = 20_000_000; // 0.02 SOL
const OWNER_TOKEN_PERCENT: u64 = 10; // 10% de tokens para ti

#[program]
pub mod pumpfun {
    use super::*;
    use anchor_lang::solana_program::{program::invoke, system_instruction};

    pub fn launch_token(
        ctx: Context<LaunchToken>,
        decimals: u8,
        amount: u64,
    ) -> Result<()> {
        let owner_pubkey = Pubkey::from_str(OWNER_WALLET).unwrap();

        // Cobrar comisión en SOL
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.authority.key(),
                &owner_pubkey,
                FEE_LAMPORTS,
            ),
            &[
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Inicializar el mint
        token::initialize_mint(
            ctx.accounts.into_initialize_mint_context(),
            decimals,
            ctx.accounts.authority.key,
            Some(ctx.accounts.authority.key),
        )?;

        // Dividir tokens
        let owner_token_amount = amount * OWNER_TOKEN_PERCENT / 100;
        let user_token_amount = amount - owner_token_amount;

        // Mint al usuario
        token::mint_to(
            ctx.accounts.into_mint_to_user(),
            user_token_amount,
        )?;

        // Mint al dueño (tu wallet)
        token::mint_to(
            ctx.accounts.into_mint_to_fee(),
            owner_token_amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct LaunchToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = authority,
        mint::freeze_authority = authority
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = fee_receiver,
    )]
    pub fee_token_account: Account<'info, TokenAccount>,

    /// CHECK: No necesita validación, es tu wallet
    #[account(address = Pubkey::from_str(OWNER_WALLET).unwrap())]
    pub fee_receiver: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
}

impl<'info> LaunchToken<'info> {
    fn into_initialize_mint_context(&self) -> CpiContext<'_, '_, '_, 'info, InitializeMint<'info>> {
        let cpi_accounts = InitializeMint {
            mint: self.mint.to_account_info(),
            rent: self.rent.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }

    fn into_mint_to_user(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.token_account.to_account_info(),
            authority: self.authority.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }

    fn into_mint_to_fee(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        let cpi_accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.fee_token_account.to_account_info(),
            authority: self.authority.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}
