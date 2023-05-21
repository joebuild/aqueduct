import {PublicKey, SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";
import {WHIRLPOOL_PROGRAM_ID} from "../infrastructure/constants";
import {AccountFetcher, buildWhirlpoolClient, PDAUtil, PoolUtil, WhirlpoolContext} from "@orca-so/whirlpools-sdk";
import {ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {getTokenBalance} from "../utils/tokens";
import BN from "bn.js";

export const swapToUSDC = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	whirlpool: PublicKey,
	userAddr: PublicKey,
): Promise<string> => {
	const [userPda, userPDABump] = getUserPDA(
		program.programId,
		userAddr
	)

	const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, WHIRLPOOL_PROGRAM_ID);
	const fetcher = new AccountFetcher(provider.connection);
	const whirlpoolClient = buildWhirlpoolClient(ctx, fetcher);

	const whirlpoolObj = await whirlpoolClient.getPool(whirlpool);

	const poolTokenAInfo = whirlpoolObj.getTokenAInfo();
	const poolTokenBInfo = whirlpoolObj.getTokenBInfo();

	const whirlpoolData = whirlpoolObj.getData()

	const tokenOwnerA = await getAssociatedTokenAddress(poolTokenAInfo.mint, userPda, true);
	const tokenOwnerB = await getAssociatedTokenAddress(poolTokenBInfo.mint, userPda, true);
	const tokenVaultA = whirlpoolObj.getData().tokenVaultA;
	const tokenVaultB = whirlpoolObj.getData().tokenVaultB;

	const tokenAAmount = await getTokenBalance(provider, poolTokenAInfo.mint, userPda)

	const aToB = true; // Swapping from tokenA to tokenB
	const tickArrayAddresses = PoolUtil.getTickArrayPublicKeysForSwap(
		whirlpoolData.tickCurrentIndex,
		whirlpoolData.tickSpacing,
		aToB,
		ctx.program.programId,
		whirlpoolObj.getAddress()
	);

 	return program.methods.positionSwap(
		aToB,
		new BN(new BN(tokenAAmount)),
	)
		.accounts(
			{
				auth: provider.wallet.publicKey,
				user: userAddr,
				userPda: userPda,
				whirlpoolProgram: WHIRLPOOL_PROGRAM_ID,
				whirlpool: whirlpool,
				tokenOwnerAccountA: tokenOwnerA,
				tokenOwnerAccountB: tokenOwnerB,
				tokenVaultA: tokenVaultA,
				tokenVaultB: tokenVaultB,
				tickArray0: tickArrayAddresses[0],
				tickArray1: tickArrayAddresses[1],
				tickArray2: tickArrayAddresses[2],
				oracle: PDAUtil.getOracle(WHIRLPOOL_PROGRAM_ID, whirlpool).publicKey,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			})
		.rpc()

}
