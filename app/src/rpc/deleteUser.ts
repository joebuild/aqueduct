import {SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";
import * as anchor from '@project-serum/anchor'

export const deleteUser = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
): Promise<string> => {
	const [userPda] = getUserPDA(
		program.programId,
		provider.wallet.publicKey
	)

	return program.methods.userDelete()
		.accounts(
			{
				user: provider.wallet.publicKey,
				userPda: userPda,
				systemProgram: SystemProgram.programId,
			})
		.rpc()
}
