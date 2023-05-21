import {PublicKey, SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";

export const saveUserSettings = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	whirlpool: PublicKey,
	isPaused: boolean,
): Promise<string> => {
	const [userPda] = getUserPDA(
		program.programId,
		provider.wallet.publicKey
	)

	return program.methods.userSettings(
		isPaused
	)
		.accounts(
			{
				user: provider.wallet.publicKey,
				userPda: userPda,
				whirlpool: whirlpool,
				systemProgram: SystemProgram.programId,
			})
		.rpc()
}
