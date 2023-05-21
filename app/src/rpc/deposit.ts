import {SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";
import type BN from "bn.js";
import {ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {USDC} from "../infrastructure/constants";

export const deposit = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	amount: BN
): Promise<string> => {
	const [userPda] = getUserPDA(
		program.programId,
		provider.wallet.publicKey
	)

	const sourceATA = await getAssociatedTokenAddress(USDC, provider.wallet.publicKey, false)
	const destinationATA = await getAssociatedTokenAddress(USDC, userPda, true)

	return program.methods.fundsDeposit(amount)
		.accounts(
			{
				user: provider.wallet.publicKey,
				userPda: userPda,
				sourceAta: sourceATA,
				destinationAta: destinationATA,
				mint: USDC,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				tokenProgram: TOKEN_PROGRAM_ID,
				rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				systemProgram: SystemProgram.programId,
			})
		.rpc()
}
