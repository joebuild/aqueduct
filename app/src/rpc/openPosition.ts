import {PublicKey, SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";
import {
	WHIRLPOOL_PROGRAM_ID
} from "../infrastructure/constants";
import {
	AccountFetcher,
	buildWhirlpoolClient,
	increaseLiquidityQuoteByInputTokenWithParams,
	PDAUtil,
	PoolUtil,
	PriceMath,
	TickUtil,
	WhirlpoolContext
} from "@orca-so/whirlpools-sdk";
import {Percentage} from "@orca-so/common-sdk";
import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import Decimal from "decimal.js";
import {getATA, getTokenBalance} from "../utils/tokens";
import BN from "bn.js";

export const openPosition = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	whirlpool: PublicKey,
	userAddr: PublicKey,
): Promise<string> => {
	const [userPda] = getUserPDA(
		program.programId,
		userAddr
	)

	const positionMintKeypair = anchor.web3.Keypair.generate();

	const positionMint = positionMintKeypair.publicKey;
	const positionPda = PDAUtil.getPosition(WHIRLPOOL_PROGRAM_ID, positionMint);
	const position = positionPda.publicKey;
	const [positionTokenAccount] = getATA(positionMint, userPda);
	const positionBump = positionPda.bump;

	const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, WHIRLPOOL_PROGRAM_ID);
	const fetcher = new AccountFetcher(provider.connection);
	const whirlpoolClient = buildWhirlpoolClient(ctx, fetcher);

	// const positionObj = await whirlpoolClient.getPosition(position);
	const whirlpoolObj = await whirlpoolClient.getPool(whirlpool);

	const poolTokenAInfo = whirlpoolObj.getTokenAInfo();
	const poolTokenBInfo = whirlpoolObj.getTokenBInfo();

	const tokenADecimal = poolTokenAInfo.decimals;
	const tokenBDecimal = poolTokenBInfo.decimals;

	const whirlpoolData = whirlpoolObj.getData()
	const currentTickIndex = whirlpoolObj.getData().tickCurrentIndex

	const price = PriceMath.tickIndexToPrice(currentTickIndex, tokenADecimal, tokenBDecimal)

	const tickLowerIndex = TickUtil.getInitializableTickIndex(
		PriceMath.priceToTickIndex(price.mul(new Decimal(1 - POSITION_RANGE)), tokenADecimal, tokenBDecimal),
		whirlpoolObj.getData().tickSpacing
	);
	const tickUpperIndex = TickUtil.getInitializableTickIndex(
		PriceMath.priceToTickIndex(price.mul(new Decimal(1 + POSITION_RANGE)), tokenADecimal, tokenBDecimal),
		whirlpoolObj.getData().tickSpacing
	);

	const [tokenOwnerA] = getATA(poolTokenAInfo.mint, userPda);
	const [tokenOwnerB] = getATA(poolTokenBInfo.mint, userPda);
	const tokenVaultA = whirlpoolObj.getData().tokenVaultA;
	const tokenVaultB = whirlpoolObj.getData().tokenVaultB;

	const tickSpacing = whirlpoolObj.getData().tickSpacing;
	const tickArrayLowerPubkey = PDAUtil.getTickArrayFromTickIndex(tickLowerIndex, tickSpacing, whirlpool, ctx.program.programId).publicKey;
	const tickArrayUpperPubkey = PDAUtil.getTickArrayFromTickIndex(tickUpperIndex, tickSpacing, whirlpool, ctx.program.programId).publicKey;

	// const tokenAAmount = await getTokenBalance(provider, poolTokenAInfo.mint, userPda)
	const tokenBAmount = await getTokenBalance(provider.connection, poolTokenBInfo.mint, userPda)

	const quote = increaseLiquidityQuoteByInputTokenWithParams({
		tokenMintA: poolTokenAInfo.mint,
		tokenMintB: poolTokenBInfo.mint,
		tickCurrentIndex: whirlpoolData.tickCurrentIndex,
		sqrtPrice: whirlpoolData.sqrtPrice,
		inputTokenMint: whirlpoolData.tokenMintB,
		inputTokenAmount: tokenBAmount,
		tickLowerIndex: tickLowerIndex,
		tickUpperIndex: tickUpperIndex,
		slippageTolerance: Percentage.fromFraction(0, 1000),
	});

	const totalQuoteCost = quote.tokenEstA.toNumber() * price.toNumber() + quote.tokenEstB.toNumber();
	const normalizationRatio = totalQuoteCost / tokenBAmount.toNumber();

	// const targetA = quote.tokenEstA.toNumber() / normalizationRatio;
	const targetB = quote.tokenEstB.toNumber() / normalizationRatio;

	const bToSell = (tokenBAmount.toNumber() - targetB) * OPEN_POSITION_FRACTION;

	const aToB = false; // Swapping from tokenA to tokenB
	const tickArrayAddresses = PoolUtil.getTickArrayPublicKeysForSwap(
		whirlpoolData.tickCurrentIndex,
		whirlpoolData.tickSpacing,
		aToB,
		ctx.program.programId,
		whirlpoolObj.getAddress()
	);

	// console.log('tickLowerIndex', tickLowerIndex)
	// console.log('tickUpperIndex', tickUpperIndex)
	// console.log('targetA', targetA)
	// console.log('targetB', targetB)

	const openPositionIx = await program.methods.positionOpen(
		positionBump,
		tickLowerIndex,
		tickUpperIndex,
	)
		.accounts(
			{
				auth: provider.wallet.publicKey,
				user: userAddr,
				userPda: userPda,
				whirlpoolProgram: WHIRLPOOL_PROGRAM_ID,
				position: position,
				positionMint: positionMint,
				positionTokenAccount: positionTokenAccount,
				whirlpool: whirlpool,
				mintA: poolTokenAInfo.mint,
				mintB: poolTokenBInfo.mint,
				tokenOwnerAccountA: tokenOwnerA,
				tokenOwnerAccountB: tokenOwnerB,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			})
		.signers([positionMintKeypair])
		.instruction()

	const swapIx = await program.methods.positionSwap(
		aToB,
		new BN(bToSell),
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
		.instruction()

	// // get human-readable balance and exit if less than minimum
	// const [ata] = getATA(poolTokenBInfo.mint, userAddr);
	// const balance = new BN((await provider.connection.getTokenAccountBalance(ata)).value.amount).toNumber() / (10 ** 6)
	// if (balance < MINIMUM_ACCOUNT_ACTIVATION){
	// 	return ''
	// }

	await program.methods.positionFund(
		tickLowerIndex,
		tickUpperIndex,
		new BN(0),
		new BN(MINIMUM_ACCOUNT_ACTIVATION * 0.4 * (10 ** poolTokenBInfo.decimals))
	)
		.accounts(
			{
				auth: provider.wallet.publicKey,
				user: userAddr,
				userPda: userPda,
				whirlpoolProgram: WHIRLPOOL_PROGRAM_ID,
				whirlpool: whirlpool,
				position: position,
				positionTokenAccount: positionTokenAccount,
				positionMint: positionMint,
				tokenOwnerAccountA: tokenOwnerA,
				tokenOwnerAccountB: tokenOwnerB,
				tokenVaultA: tokenVaultA,
				tokenVaultB: tokenVaultB,
				tickArrayLower: tickArrayLowerPubkey,
				tickArrayUpper: tickArrayUpperPubkey,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
				rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			})
		.signers([positionMintKeypair])
		.preInstructions([openPositionIx, swapIx])
		.rpc()

	return positionMint.toBase58()
}
