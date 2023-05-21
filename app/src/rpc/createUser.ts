import {PublicKey, SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";

export const createUser = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
): Promise<string> => {
	const [userPda] = getUserPDA(
		program.programId,
		provider.wallet.publicKey
	)

	return program.methods.userCreate()
		.accounts(
			{
				user: provider.wallet.publicKey,
				userPda: userPda,
				mangoGroup: PublicKey.default,
				mangoAccount: PublicKey.default,
				mangoV3: PublicKey.default,
				systemProgram: SystemProgram.programId,

			})
		.rpc()
}
