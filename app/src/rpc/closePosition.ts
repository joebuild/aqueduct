import {PublicKey, SystemProgram} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";
import {AQuB, WHIRLPOOL_PROGRAM_ID} from "../infrastructure/constants";
import {
	AccountFetcher,
	buildWhirlpoolClient,
	collectRewardsQuote,
	PDAUtil,
	PoolUtil,
	TickArrayUtil,
	WhirlpoolContext, WhirlpoolIx
} from "@orca-so/whirlpools-sdk";
import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {getATA} from "../utils/tokens";
import BN from "bn.js";
import {TransactionBuilder} from "@orca-so/common-sdk";

export const closePosition = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	whirlpool: PublicKey,
	positionMint: PublicKey,
	userAddr: PublicKey,
	initTickArrays = false
): Promise<string> => {
	const [userPda] = getUserPDA(
		program.programId,
		userAddr
	)

	const positionPda = PDAUtil.getPosition(WHIRLPOOL_PROGRAM_ID, positionMint);
	const position = positionPda.publicKey;
	const [positionTokenAccount] = getATA(positionMint, userPda);

	const whirlpoolCTX = WhirlpoolContext.from(provider.connection, provider.wallet, WHIRLPOOL_PROGRAM_ID);
	const fetcher = new AccountFetcher(provider.connection);
	const whirlpoolClient = buildWhirlpoolClient(whirlpoolCTX, fetcher);

	const positionObj = await whirlpoolClient.getPosition(position);
	const whirlpoolObj = await whirlpoolClient.getPool(whirlpool);

	const poolTokenAInfo = whirlpoolObj.getTokenAInfo();
	const poolTokenBInfo = whirlpoolObj.getTokenBInfo();

	const [aqTokenAAccount] = getATA(poolTokenAInfo.mint, AQuB)
	const [aqTokenBAccount] = getATA(poolTokenBInfo.mint, AQuB)

	const aqTokenAccountIxs = []

	const createAqTokenBIx = await program.methods.initAta()
		.accounts(
			{
				auth: provider.wallet.publicKey,
				owner: provider.wallet.publicKey,
				ata: aqTokenBAccount,
				mint: poolTokenBInfo.mint,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				tokenProgram: TOKEN_PROGRAM_ID,
				rent: anchor.web3.SYSVAR_RENT_PUBKEY,
				systemProgram: SystemProgram.programId,
			})
		.instruction()

	aqTokenAccountIxs.push(createAqTokenBIx)

	const whirlpoolData = whirlpoolObj.getData()

	const [tokenOwnerA] = getATA(poolTokenAInfo.mint, userPda);
	const [tokenOwnerB] = getATA(poolTokenBInfo.mint, userPda);
	const tokenVaultA = whirlpoolObj.getData().tokenVaultA;
	const tokenVaultB = whirlpoolObj.getData().tokenVaultB;

	const tickSpacing = whirlpoolObj.getData().tickSpacing;
	const tickArrayLowerPubkey = PDAUtil.getTickArrayFromTickIndex(positionObj.getData().tickLowerIndex, tickSpacing, whirlpool, whirlpoolCTX.program.programId).publicKey;
	const tickArrayUpperPubkey = PDAUtil.getTickArrayFromTickIndex(positionObj.getData().tickUpperIndex, tickSpacing, whirlpool, whirlpoolCTX.program.programId).publicKey;

	const aToB = true; // Swapping from tokenA to tokenB
	const tickArrayAddresses = PoolUtil.getTickArrayPublicKeysForSwap(
		whirlpoolData.tickCurrentIndex,
		whirlpoolData.tickSpacing,
		aToB,
		whirlpoolCTX.program.programId,
		whirlpoolObj.getAddress()
	);

	let createRewardATAIxs = []
	let rewardsAccountInfos = []

	try {
		const tickArrayLower = await fetcher.getTickArray(tickArrayLowerPubkey);
		const tickArrayUpper = await fetcher.getTickArray(tickArrayUpperPubkey);
		const tickLower = TickArrayUtil.getTickFromArray(tickArrayLower, positionObj.getData().tickLowerIndex, tickSpacing);
		const tickUpper = TickArrayUtil.getTickFromArray(tickArrayUpper, positionObj.getData().tickUpperIndex, tickSpacing);

		const rewardQuotes = collectRewardsQuote({
			whirlpool: whirlpoolObj.getData(),
			position: positionObj.getData(),
			tickLower: tickLower,
			tickUpper: tickUpper
		});

		const rewards = whirlpoolObj.getData().rewardInfos
			.map((x, i) => {
				return {info: x, quote: rewardQuotes[i]}
			})

		const relevantRewards = rewards.filter((x) => x.quote > new BN(0))

		createRewardATAIxs = await Promise.all(relevantRewards.map((x) => {
			const [rewardOwnerAccount] = getATA(x.info.mint, userPda)

			return program.methods.initAta()
				.accounts(
					{
						auth: provider.wallet.publicKey,
						owner: userPda,
						ata: rewardOwnerAccount,
						mint: x.info.mint,
						associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
						tokenProgram: TOKEN_PROGRAM_ID,
						rent: anchor.web3.SYSVAR_RENT_PUBKEY,
						systemProgram: SystemProgram.programId,
					})
				.instruction()
		}))

		const aqTokenAccounts = await Promise.all(rewards.map(async (x) => {
			const [ata] = getATA(x.info.mint, AQuB)

			const createAqTokenIx = await program.methods.initAta()
				.accounts(
					{
						auth: provider.wallet.publicKey,
						owner: provider.wallet.publicKey,
						ata: ata,
						mint: x.info.mint,
						associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
						tokenProgram: TOKEN_PROGRAM_ID,
						rent: anchor.web3.SYSVAR_RENT_PUBKEY,
						systemProgram: SystemProgram.programId,
					})
				.instruction()

			if (x.quote > new BN(0)){
				aqTokenAccountIxs.push(createAqTokenIx)
			}

			return ata
		}))

		rewardsAccountInfos = rewards.flatMap((x, i): PublicKey[] => {
				const [rewardOwnerAccount] = getATA(x.info.mint, userPda)
				return [rewardOwnerAccount, x.info.vault, aqTokenAccounts[i]]
			})
			.map(x => {
				return {
					pubkey: x,
					isWritable: true,
					isSigner: false
				}
			})
	} catch (e){
		console.log(e)
	}

	try {
		await program.methods.initAta()
			.accounts(
				{
					auth: provider.wallet.publicKey,
					owner: provider.wallet.publicKey,
					ata: aqTokenAAccount,
					mint: poolTokenAInfo.mint,
					associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
					tokenProgram: TOKEN_PROGRAM_ID,
					rent: anchor.web3.SYSVAR_RENT_PUBKEY,
					systemProgram: SystemProgram.programId,
				})
			.preInstructions(createRewardATAIxs.concat(aqTokenAccountIxs))
			.rpc()
	} catch (e){
		console.log(e)
	}

	const swapIx = await program.methods.positionSwap(
		aToB,
		new BN(0),
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

	if (initTickArrays){
		const initTickArraysForSwap = tickArrayAddresses.map((ta) => {
			const taPda = PDAUtil.getTickArrayFromTickIndex(
				whirlpoolData.tickCurrentIndex,
				whirlpoolData.tickSpacing,
				whirlpool,
				WHIRLPOOL_PROGRAM_ID,
			)

			return WhirlpoolIx.initTickArrayIx(whirlpoolCTX.program, {
				funder: whirlpoolCTX.wallet.publicKey,
				startTick: whirlpoolData.tickCurrentIndex,
				tickArrayPda: taPda,
				whirlpool: whirlpool,
			});
		})

		try {
			const tx = new TransactionBuilder(whirlpoolCTX.provider);
			initTickArraysForSwap.map((ix) => tx.addInstruction(ix));
			await tx.buildAndExecute();
		} catch (e){
			console.log(e)
		}
	}

	return program.methods.positionClose()
		.accounts(
			{
				auth: provider.wallet.publicKey,
				user: userAddr,
				userPda: userPda,
				whirlpoolProgram: WHIRLPOOL_PROGRAM_ID,
				whirlpool: whirlpool,
				position: position,
				positionTokenAccount: positionTokenAccount,
				positionMint: positionObj.getData().positionMint,
				tokenOwnerAccountA: tokenOwnerA,
				tokenVaultA: tokenVaultA,
				tokenAqueductA: aqTokenAAccount,
				tokenOwnerAccountB: tokenOwnerB,
				tokenVaultB: tokenVaultB,
				tokenAqueductB: aqTokenBAccount,
				tickArrayLower: tickArrayLowerPubkey,
				tickArrayUpper: tickArrayUpperPubkey,
				associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
				tokenProgram: TOKEN_PROGRAM_ID,
				systemProgram: SystemProgram.programId,
			})
		.postInstructions([swapIx])
		.remainingAccounts(rewardsAccountInfos)
		.rpc()

}
