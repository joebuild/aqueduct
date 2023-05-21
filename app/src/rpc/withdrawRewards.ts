import {PublicKey, SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";
import BN from "bn.js";
import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {USDC} from "../infrastructure/constants";
import {getATA} from "../utils/tokens";
import {getRewardsMints} from "./data";

export const withdrawRewards = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider
): Promise<string> => {

	const [userPda] = getUserPDA(
		program.programId,
		provider.wallet.publicKey
	)

	const rewardsMints: PublicKey[] = (await getRewardsMints(program, provider, provider.wallet.publicKey)).filter((x) => x.toBase58() !== USDC.toBase58())

	const [first, ...rest] = rewardsMints;

	const restIxs = []

	for (const mint of rest){
		const [sourceATA] = getATA(mint, userPda)
		const [destinationATA] = getATA(mint, provider.wallet.publicKey)

		restIxs.push(
			await program.methods.fundsWithdraw(new BN(0))
				.accounts(
					{
						user: provider.wallet.publicKey,
						userPda: userPda,
						sourceAta: sourceATA,
						destinationAta: destinationATA,
						mint: mint,
						associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
						tokenProgram: TOKEN_PROGRAM_ID,
						rent: anchor.web3.SYSVAR_RENT_PUBKEY,
						systemProgram: SystemProgram.programId,
					})
				.instruction()
		)
	}

	const [sourceATA] = getATA(first, userPda)
	const [destinationATA] = getATA(first, provider.wallet.publicKey)

	return program.methods.fundsWithdraw(new BN(0))
			.accounts(
				{
					user: provider.wallet.publicKey,
					userPda: userPda,
					sourceAta: sourceATA,
					destinationAta: destinationATA,
					mint: first,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
					tokenProgram: TOKEN_PROGRAM_ID,
					rent: anchor.web3.SYSVAR_RENT_PUBKEY,
					systemProgram: SystemProgram.programId,
				})
			.postInstructions(restIxs)
			.rpc()
}
