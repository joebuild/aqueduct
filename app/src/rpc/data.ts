import {PublicKey} from '@solana/web3.js'
import type {AnchorProvider, Program} from '@project-serum/anchor'
import type {Aqueduct} from '../idl/aqueduct'
import {getUserPDA} from "../utils/pda";
import {WHIRLPOOL_PROGRAM_ID} from "../infrastructure/constants";
import {
	buildWhirlpoolClient,
	collectFeesQuote,
	collectRewardsQuote,
	PDAUtil,
	PoolUtil,
	type Position,
	PriceMath,
	TickArrayUtil,
	type Whirlpool,
	type WhirlpoolClient,
	WhirlpoolContext
} from "@orca-so/whirlpools-sdk";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import BN from "bn.js";

export const getPositions = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	userAddress: PublicKey
): Promise<Position[]> => {
	const positionMints = await getPositionMints(program, provider, userAddress)

	const ctx = WhirlpoolContext.from(provider.connection, provider.wallet, WHIRLPOOL_PROGRAM_ID);
	const whirlpoolClient = buildWhirlpoolClient(ctx);

	return await Promise.all(positionMints.map(async (positionMint) => {
		const positionPda = PDAUtil.getPosition(WHIRLPOOL_PROGRAM_ID, positionMint);
		const position = positionPda.publicKey;
		return await whirlpoolClient.getPosition(position)
	}))
}

export const getPositionMints = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	userAddress: PublicKey
): Promise<PublicKey[]> => {
	const [userDataPda] = getUserPDA(
		program.programId,
		userAddress
	)

	const parsedTokenAccounts = (await program.provider.connection.getParsedTokenAccountsByOwner(
		userDataPda,
		{programId: TOKEN_PROGRAM_ID}
	)).value;

	return parsedTokenAccounts
		.map(({pubkey, account}) => {
			const info = account.data.parsed.info;
			if (info.tokenAmount.uiAmount === 1 && info.tokenAmount.decimals === 0) {
				return new PublicKey(info.mint as string);
			}
			return;
		})
		.filter(Boolean);
}

export const getRewardsMints = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	userAddress: PublicKey
): Promise<PublicKey[]> => {
	const [userDataPda] = getUserPDA(
		program.programId,
		userAddress
	)

	const parsedTokenAccounts = (await program.provider.connection.getParsedTokenAccountsByOwner(
		userDataPda,
		{programId: TOKEN_PROGRAM_ID}
	)).value;

	return parsedTokenAccounts
		.map(({pubkey, account}) => {
			const info = account.data.parsed.info;
			if (info.tokenAmount.decimals !== 0 && new BN(info.tokenAmount.amount) > new BN(0)) {
				return new PublicKey(info.mint as string);
			}
			return;
		})
		.filter(Boolean);
}

export const getPositionBalance = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	whirlpoolClient: WhirlpoolClient,
	position: Position,
	whirlpool?: Whirlpool,
): Promise<number> => {
	const positionData = position.getData();

	const whirlpoolObj = whirlpool ? whirlpool : await whirlpoolClient.getPool(positionData.whirlpool);

	const poolTokenAInfo = whirlpoolObj.getTokenAInfo();
	const poolTokenBInfo = whirlpoolObj.getTokenBInfo();

	const tokenADecimal = poolTokenAInfo.decimals;
	const tokenBDecimal = poolTokenBInfo.decimals;

	const whirlpoolData = whirlpoolObj.getData()
	const currentTickIndex = whirlpoolObj.getData().tickCurrentIndex

	const price = PriceMath.tickIndexToPrice(currentTickIndex, tokenADecimal, tokenBDecimal)

	const amounts = PoolUtil.getTokenAmountsFromLiquidity(
		positionData.liquidity,
		whirlpoolData.sqrtPrice,
		PriceMath.tickIndexToSqrtPriceX64(positionData.tickLowerIndex),
		PriceMath.tickIndexToSqrtPriceX64(positionData.tickUpperIndex),
		true
	);

	const balance = ((amounts.tokenA.toNumber() * price.toNumber()) / (10 ** poolTokenAInfo.decimals)) + (amounts.tokenB.toNumber() / (10 ** poolTokenBInfo.decimals))

	return Math.round(100 * balance) / 100
}

export const getFeeBalance = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	whirlpoolClient: WhirlpoolClient,
	position: Position,
	whirlpool?: Whirlpool,
): Promise<number> => {
	const positionData = position.getData();

	const whirlpoolObj = whirlpool ? whirlpool : await whirlpoolClient.getPool(positionData.whirlpool);
	const whirlpoolData = whirlpoolObj.getData()

	const tick_spacing = whirlpoolData.tickSpacing;
	const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(positionData.tickLowerIndex, tick_spacing, whirlpoolObj.getAddress(), WHIRLPOOL_PROGRAM_ID).publicKey;
	const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(positionData.tickUpperIndex, tick_spacing, whirlpoolObj.getAddress(), WHIRLPOOL_PROGRAM_ID).publicKey;

	const tick_array_lower = await whirlpoolClient.getFetcher().getTickArray(tick_array_lower_pubkey);
	const tick_array_upper = await whirlpoolClient.getFetcher().getTickArray(tick_array_upper_pubkey);
	const tick_lower = TickArrayUtil.getTickFromArray(tick_array_lower, positionData.tickLowerIndex, tick_spacing);
	const tick_upper = TickArrayUtil.getTickFromArray(tick_array_upper, positionData.tickUpperIndex, tick_spacing);

	const quote_fee = await collectFeesQuote({
		whirlpool: whirlpoolData,
		position: positionData,
		tickLower: tick_lower,
		tickUpper: tick_upper,
	});

	const poolTokenAInfo = whirlpoolObj.getTokenAInfo();
	const poolTokenBInfo = whirlpoolObj.getTokenBInfo();

	const tokenADecimal = poolTokenAInfo.decimals;
	const tokenBDecimal = poolTokenBInfo.decimals;

	const currentTickIndex = whirlpoolData.tickCurrentIndex

	const price = PriceMath.tickIndexToPrice(currentTickIndex, tokenADecimal, tokenBDecimal)

	const balance = ((quote_fee.feeOwedA.toNumber() * price.toNumber()) / (10 ** poolTokenAInfo.decimals)) + (quote_fee.feeOwedB.toNumber() / (10 ** poolTokenBInfo.decimals))

	return Math.round(100 * balance) / 100
}

export const getRewardBalance = async (
	program: Program<Aqueduct>,
	provider: AnchorProvider,
	whirlpoolClient: WhirlpoolClient,
	position: Position,
	whirlpool?: Whirlpool,
): Promise<number> => {
	const positionData = position.getData();

	const whirlpoolObj = whirlpool ? whirlpool : await whirlpoolClient.getPool(positionData.whirlpool);
	const whirlpoolData = whirlpoolObj.getData()

	const tick_spacing = whirlpoolData.tickSpacing;
	const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(positionData.tickLowerIndex, tick_spacing, whirlpoolObj.getAddress(), WHIRLPOOL_PROGRAM_ID).publicKey;
	const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(positionData.tickUpperIndex, tick_spacing, whirlpoolObj.getAddress(), WHIRLPOOL_PROGRAM_ID).publicKey;

	const tick_array_lower = await whirlpoolClient.getFetcher().getTickArray(tick_array_lower_pubkey);
	const tick_array_upper = await whirlpoolClient.getFetcher().getTickArray(tick_array_upper_pubkey);
	const tick_lower = TickArrayUtil.getTickFromArray(tick_array_lower, positionData.tickLowerIndex, tick_spacing);
	const tick_upper = TickArrayUtil.getTickFromArray(tick_array_upper, positionData.tickUpperIndex, tick_spacing);

	const quote_reward = collectRewardsQuote({
		whirlpool: whirlpoolData,
		position: positionData,
		tickLower: tick_lower,
		tickUpper: tick_upper,
	});

	let tokenAReward = quote_reward.find((reward, i) => {
		const reward_info = whirlpoolData.rewardInfos[i];
		return reward_info.mint.toBase58() === whirlpoolData.tokenMintA.toBase58()
	})

	tokenAReward = tokenAReward ? tokenAReward : new BN(0);

	const poolTokenAInfo = whirlpoolObj.getTokenAInfo();
	const poolTokenBInfo = whirlpoolObj.getTokenBInfo();

	const tokenADecimal = poolTokenAInfo.decimals;
	const tokenBDecimal = poolTokenBInfo.decimals;

	const currentTickIndex = whirlpoolData.tickCurrentIndex

	const price = PriceMath.tickIndexToPrice(currentTickIndex, tokenADecimal, tokenBDecimal)

	const rawBalance = tokenAReward.toNumber() * price.toNumber()
	const balance = rawBalance / (10 ** poolTokenAInfo.decimals)

	return Math.round(100 * balance) / 100
}
