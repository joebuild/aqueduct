import { PublicKey } from '@solana/web3.js'
import { Buffer } from 'buffer'
import {USER_PDA_PREFIX} from "../infrastructure/constants";

export const getUserPDA = (
	programId: PublicKey,
	userAddr: PublicKey
): [PublicKey, number] => {
	return PublicKey.findProgramAddressSync(
		[
			encode(USER_PDA_PREFIX),
			userAddr.toBytes()
		],
		programId
	)
}

export const encode = (x: string) => Buffer.from(x)
