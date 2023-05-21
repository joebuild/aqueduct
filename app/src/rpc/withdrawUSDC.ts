import {SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";
import type BN from "bn.js";
import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {USDC} from "../infrastructure/constants";
import {getATA} from "../utils/tokens";

export const withdrawUSDC = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	amount: BN
): Promise<string> => {
	const [userPda] = getUserPDA(
		program.programId,
		provider.wallet.publicKey
	)

	const [sourceATA] = getATA(USDC, userPda)
	const [destinationATA] = getATA(USDC, provider.wallet.publicKey)

	return program.methods.fundsWithdraw(amount)
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
