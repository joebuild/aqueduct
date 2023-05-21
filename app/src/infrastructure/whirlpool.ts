import {
    buildWhirlpoolClient, decreaseLiquidityQuoteByLiquidityWithParams, type IncreaseLiquidityInput,
    increaseLiquidityQuoteByInputTokenWithParams, PDAUtil,
    PoolUtil,
    type PositionData,
    type PositionRewardInfoData,
    PriceMath,
    type WhirlpoolData,
    WhirlpoolIx
} from "@orca-so/whirlpools-sdk";
import {type GetProgramAccountsFilter, Keypair, PublicKey, sendAndConfirmTransaction} from "@solana/web3.js";
import BN from "bn.js";
import Decimal from "decimal.js";
import {bulkAddWhirlpools, getPairPriceStatsOverInterval} from "./database";
import {DEFAULT_INTERVAL_HOURS, MY_WALLET} from "./constants";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {
    DecimalUtil,
    deriveATA,
    EMPTY_INSTRUCTION,
    type Instruction, Percentage,
    resolveOrCreateATA, resolveOrCreateATAs,
    TokenUtil,
    TransactionBuilder
} from "@orca-so/common-sdk";
import {
    increaseLiquidityIx,
    openPositionIx,
    openPositionWithMetadataIx
} from "@orca-so/whirlpools-sdk/dist/instructions";
import {getATA} from "../utils/tokens";
import {sleep} from "./utils";


export async function myGetOpenPositionWithOptMetadataTx(
    tickLower: number,
    tickUpper: number,
    liquidityInput: IncreaseLiquidityInput,
    owner: PublicKey,
    funder: PublicKey,
    whirlpool,
    whirlpoolData,
    whirlpoolCtx,
    withMetadata: boolean = false
): Promise<{ positionMint: PublicKey; tx: TransactionBuilder }> {
    const { liquidityAmount: liquidity, tokenMaxA, tokenMaxB } = liquidityInput;

    // const whirlpool = await this.fetcher.getPool(this.address, false);

    const positionMintKeypair = Keypair.generate();
    const positionPda = PDAUtil.getPosition(
        whirlpoolCtx.program.programId,
        positionMintKeypair.publicKey
    );
    const metadataPda = PDAUtil.getPositionMetadata(positionMintKeypair.publicKey);
    const positionTokenAccountAddress = await deriveATA(owner, positionMintKeypair.publicKey);

    const txBuilder = new TransactionBuilder(
        whirlpoolCtx.provider.connection,
        whirlpoolCtx.provider.wallet
    );

    const positionIx = (withMetadata ? openPositionWithMetadataIx : openPositionIx)(
        whirlpoolCtx.program,
        {
            funder,
            owner: owner,
            positionPda,
            metadataPda,
            positionMintAddress: positionMintKeypair.publicKey,
            positionTokenAccount: positionTokenAccountAddress,
            whirlpool: whirlpool.getAddress(),
            tickLowerIndex: tickLower,
            tickUpperIndex: tickUpper,
        }
    );
    txBuilder.addInstruction(positionIx).addSigner(positionMintKeypair);

    const ataA = getATA(whirlpoolData.tokenMintA, owner)[0]
    const ataB = getATA(whirlpoolData.tokenMintB, owner)[0]

    // const [ataA, ataB] = await resolveOrCreateATAs(
    //     this.ctx.connection,
    //     wallet,
    //     [
    //         { tokenMint: whirlpool.tokenMintA, wrappedSolAmountIn: tokenMaxA },
    //         { tokenMint: whirlpool.tokenMintB, wrappedSolAmountIn: tokenMaxB },
    //     ],
    //     () => this.fetcher.getAccountRentExempt(),
    //     funder
    // );
    // const { address: tokenOwnerAccountA, ...tokenOwnerAccountAIx } = ataA;
    // const { address: tokenOwnerAccountB, ...tokenOwnerAccountBIx } = ataB;
    //
    // txBuilder.addInstruction(tokenOwnerAccountAIx);
    // txBuilder.addInstruction(tokenOwnerAccountBIx);

    const tickArrayLowerPda = PDAUtil.getTickArrayFromTickIndex(
        tickLower,
        whirlpoolData.tickSpacing,
        whirlpool.getAddress(),
        whirlpoolCtx.program.programId
    );
    const tickArrayUpperPda = PDAUtil.getTickArrayFromTickIndex(
        tickUpper,
        whirlpoolData.tickSpacing,
        whirlpool.getAddress(),
        whirlpoolCtx.program.programId
    );

    const liquidityIx = increaseLiquidityIx(whirlpoolCtx.program, {
        liquidityAmount: liquidity,
        tokenMaxA,
        tokenMaxB,
        whirlpool: whirlpool.getAddress(),
        positionAuthority: owner,
        position: positionPda.publicKey,
        positionTokenAccount: positionTokenAccountAddress,
        tokenOwnerAccountA: ataA,
        tokenOwnerAccountB: ataB,
        tokenVaultA: whirlpoolData.tokenVaultA,
        tokenVaultB: whirlpoolData.tokenVaultB,
        tickArrayLower: tickArrayLowerPda.publicKey,
        tickArrayUpper: tickArrayUpperPda.publicKey,
    });
    txBuilder.addInstruction(liquidityIx);

    return {
        positionMint: positionMintKeypair.publicKey,
        tx: txBuilder,
    };
}

export async function closeAllWhirlpoolPositions(ctx){
    const client = buildWhirlpoolClient(ctx)

    const token_accounts = (await ctx.connection.getTokenAccountsByOwner(ctx.wallet.publicKey, {programId: TOKEN_PROGRAM_ID})).value

    const whirlpool_position_candidate_pubkeys = token_accounts.map((ta) => {
        const parsed = TokenUtil.deserializeTokenAccount(ta.account.data)
        const pda = PDAUtil.getPosition(ctx.program.programId, parsed.mint)
        return new BN(parsed.amount.toString()).eq(new BN(1)) ? pda.publicKey : undefined
    }).filter(pubkey => pubkey !== undefined)

    const whirlpool_position_candidate_datas = await ctx.fetcher.listPositions(whirlpool_position_candidate_pubkeys, true)

    const whirlpool_positions = whirlpool_position_candidate_pubkeys.filter((pubkey, i) =>
        whirlpool_position_candidate_datas[i] !== null
    )

    console.log('Closing Whirlpool positions..')

    for (let position_pubkey of whirlpool_positions){
        const position = await client.getPosition(position_pubkey);
        const position_owner = ctx.wallet.publicKey;
        const position_token_account = await deriveATA(position_owner, position.getData().positionMint);
        const whirlpool_pubkey = position.getData().whirlpool;
        const whirlpool = await client.getPool(whirlpool_pubkey);
        const whirlpool_data = whirlpool.getData()
        const token_a = whirlpool.getTokenAInfo();
        const token_b = whirlpool.getTokenBInfo();

        const tick_spacing = whirlpool.getData().tickSpacing;
        const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(position.getData().tickLowerIndex, tick_spacing, whirlpool_pubkey, ctx.program.programId).publicKey;
        const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(position.getData().tickUpperIndex, tick_spacing, whirlpool_pubkey, ctx.program.programId).publicKey;

        const tokens_to_be_collected = new Set<string>();
        tokens_to_be_collected.add(token_a.mint.toBase58());
        tokens_to_be_collected.add(token_b.mint.toBase58());
        whirlpool.getData().rewardInfos.map((reward_info) => {
            if ( PoolUtil.isRewardInitialized(reward_info) ) {
                tokens_to_be_collected.add(reward_info.mint.toBase58())
            }
        })

        const required_ta_ix: Instruction[] = []
        const token_account_map = new Map<string, PublicKey>()
        for ( let mint_b58 of tokens_to_be_collected ) {
            const mint = new PublicKey(mint_b58)
            const {address, ...ix} = await resolveOrCreateATA(
                ctx.connection,
                position_owner,
                mint,
                () => ctx.fetcher.getAccountRentExempt()
            );
            required_ta_ix.push(ix)
            token_account_map.set(mint_b58, address)
        }

        let update_fee_and_rewards_ix = WhirlpoolIx.updateFeesAndRewardsIx(
            ctx.program,
            {
                whirlpool: position.getData().whirlpool,
                position: position_pubkey,
                tickArrayLower: tick_array_lower_pubkey,
                tickArrayUpper: tick_array_upper_pubkey,
            }
        )

        let collect_fees_ix = WhirlpoolIx.collectFeesIx(
            ctx.program,
            {
                whirlpool: whirlpool_pubkey,
                position: position_pubkey,
                positionAuthority: position_owner,
                positionTokenAccount: position_token_account,
                tokenOwnerAccountA: token_account_map.get(token_a.mint.toBase58()),
                tokenOwnerAccountB: token_account_map.get(token_b.mint.toBase58()),
                tokenVaultA: whirlpool.getData().tokenVaultA,
                tokenVaultB: whirlpool.getData().tokenVaultB,
            }
        );

        const collect_reward_ix = [EMPTY_INSTRUCTION, EMPTY_INSTRUCTION, EMPTY_INSTRUCTION];
        for (let i=0; i<whirlpool.getData().rewardInfos.length; i++) {
            const reward_info = whirlpool.getData().rewardInfos[i];
            if ( !PoolUtil.isRewardInitialized(reward_info) ) continue;

            collect_reward_ix[i] = WhirlpoolIx.collectRewardIx(
                ctx.program,
                {
                    whirlpool: whirlpool_pubkey,
                    position: position_pubkey,
                    positionAuthority: position_owner,
                    positionTokenAccount: position_token_account,
                    rewardIndex: i,
                    rewardOwnerAccount: token_account_map.get(reward_info.mint.toBase58()),
                    rewardVault: reward_info.vault,
                }
            );
        }

        const quote = decreaseLiquidityQuoteByLiquidityWithParams({
            sqrtPrice: whirlpool_data.sqrtPrice,
            tickCurrentIndex: whirlpool_data.tickCurrentIndex,
            tickLowerIndex: position.getData().tickLowerIndex,
            tickUpperIndex: position.getData().tickUpperIndex,
            liquidity: position.getData().liquidity,
            slippageTolerance: Percentage.fromFraction(0, 100),
        });

        const decrease_liquidity_ix = WhirlpoolIx.decreaseLiquidityIx(
            ctx.program,
            {
                ...quote,
                whirlpool: whirlpool_pubkey,
                position: position_pubkey,
                positionAuthority: position_owner,
                positionTokenAccount: position_token_account,
                tokenOwnerAccountA: token_account_map.get(token_a.mint.toBase58()),
                tokenOwnerAccountB: token_account_map.get(token_b.mint.toBase58()),
                tokenVaultA: whirlpool.getData().tokenVaultA,
                tokenVaultB: whirlpool.getData().tokenVaultB,
                tickArrayLower: tick_array_lower_pubkey,
                tickArrayUpper: tick_array_upper_pubkey,
            }
        );

        const close_position_ix = WhirlpoolIx.closePositionIx(
            ctx.program,
            {
                position: position_pubkey,
                positionAuthority: position_owner,
                positionTokenAccount: position_token_account,
                positionMint: position.getData().positionMint,
                receiver: position_owner,
            }
        );

        const tx_builder = new TransactionBuilder(ctx.connection, ctx.wallet);
        required_ta_ix.map((ix) => tx_builder.addInstruction(ix));
        tx_builder
            .addInstruction(update_fee_and_rewards_ix)
            .addInstruction(collect_fees_ix)
            .addInstruction(collect_reward_ix[0])
            .addInstruction(collect_reward_ix[1])
            .addInstruction(collect_reward_ix[2])
            .addInstruction(decrease_liquidity_ix)
            .addInstruction(close_position_ix);

        try {
            const tx_payload = await tx_builder.build()

            const signature = await sendAndConfirmTransaction(
                ctx.connection,
                tx_payload.transaction,
                [MY_WALLET],
                {
                    skipPreflight: true,
                    commitment: 'confirmed',
                    maxRetries: 2
                }
            )

            console.log("\t", whirlpool.getAddress().toBase58(), signature)

            // const signature = await tx_builder.buildAndExecute()
            // console.log("\t", whirlpool.getAddress().toBase58(), signature)
            //
            // const latest_blockhash = await ctx.connection.getLatestBlockhash();
            // await ctx.connection.confirmTransaction({signature, ...latest_blockhash}, "confirmed");
            //
            // await sleep(200)
        } catch (err){
            console.log(err)
        }
    }
}

export async function getWhirlpoolLiquidityByToken(ctx, tokensInfo, allPrices, mintList, openbooks, skipIfNoOpenbook= true, hoursIntervalForRange = DEFAULT_INTERVAL_HOURS): Promise<any> {
    let openbookMints = openbooks.flatMap((x) => [x.base_mint, x.quote_mint])

    let whirlpools = await ctx.program.account.whirlpool.all()

    const whirlpoolDatabaseObjs = whirlpools.map((wp) => {
        return {
            address: wp.publicKey.toBase58(),
            token_a: wp.account.tokenMintA.toBase58(),
            token_b: wp.account.tokenMintB.toBase58(),
            fee: wp.account.feeRate / 10000 / 100
        }
    })

    await bulkAddWhirlpools(whirlpoolDatabaseObjs)

    let liquidityByToken = {}

    for (let wp of whirlpools){
        try {
            let whirlpoolData = deserializeWhirlpool(wp.account)

            if (!mintList.includes(whirlpoolData.tokenMintA.toBase58()) && !mintList.includes(whirlpoolData.tokenMintB.toBase58())){
                continue
            }

            if (!tokensInfo[whirlpoolData.tokenMintA.toBase58()] || !tokensInfo[whirlpoolData.tokenMintB.toBase58()] || !allPrices[whirlpoolData.tokenMintA.toBase58()] || !allPrices[whirlpoolData.tokenMintB.toBase58()]){
                continue
            }

            if (skipIfNoOpenbook && (!openbookMints.includes(whirlpoolData.tokenMintA.toBase58()) && !openbookMints.includes(whirlpoolData.tokenMintB.toBase58()))){
                continue
            }

            const statsSummary = await getPairPriceStatsOverInterval(whirlpoolData.tokenMintA.toBase58(), whirlpoolData.tokenMintB.toBase58(), hoursIntervalForRange)
            let lowerBound = statsSummary.latest - statsSummary.std_dev
            let upperBound = statsSummary.latest + statsSummary.std_dev

            let positions = await getWhirlpoolPositions(ctx, wp.publicKey)

            let totalLiquidity = 0
            positions.map((p) => {
                const positionData = deserializePosition(p.account)
                const liquidityUSD = getPositionLiquidityInPriceRange(whirlpoolData, positionData, lowerBound, upperBound, tokensInfo, allPrices)

                totalLiquidity += liquidityUSD
            })

            if (totalLiquidity > 0) {
                for (let mint of [whirlpoolData.tokenMintA.toBase58(), whirlpoolData.tokenMintB.toBase58()]) {
                    if (liquidityByToken[mint]) {
                        liquidityByToken[mint] = liquidityByToken[mint] + totalLiquidity
                    } else {
                        liquidityByToken[mint] = totalLiquidity
                    }
                }
            }
        } catch (err) {
            continue
        }
    }

    return liquidityByToken
}

export function getPositionLiquidityInPriceRange(whirlpoolData, positionData, priceLower, priceUpper, tokensInfo, allPrices): number {
    if (new BN(0).eq(positionData.liquidity)){
        return 0
    }

    // { tokenA: <BN: 4f0f80e90>, tokenB: <BN: a280dd9> }
    const amounts = PoolUtil.getTokenAmountsFromLiquidity(
        positionData.liquidity,
        whirlpoolData.sqrtPrice,
        PriceMath.tickIndexToSqrtPriceX64(positionData.tickLowerIndex),
        PriceMath.tickIndexToSqrtPriceX64(positionData.tickUpperIndex),
        true
    );

    const tokenADecimals = tokensInfo[whirlpoolData.tokenMintA.toBase58()].decimals
    const tokenBDecimals = tokensInfo[whirlpoolData.tokenMintB.toBase58()].decimals

    const tokenAPrice = allPrices[whirlpoolData.tokenMintA.toBase58()].price
    const tokenBPrice = allPrices[whirlpoolData.tokenMintB.toBase58()].price

    const aLiquidity = amounts.tokenA.div(new BN(10 ** tokenADecimals)).toNumber() * tokenAPrice
    const bLiquidity = amounts.tokenB.div(new BN(10 ** tokenBDecimals)).toNumber() * tokenBPrice

    const totalLiquidity = aLiquidity + bLiquidity
    const liquidityPerTick = totalLiquidity / (positionData.tickUpperIndex - positionData.tickLowerIndex)

    const lowerPriceTick = PriceMath.priceToTickIndex(new Decimal(priceLower), tokenADecimals, tokenBDecimals)
    const upperPriceTick = PriceMath.priceToTickIndex(new Decimal(priceUpper), tokenADecimals, tokenBDecimals)

    const lowerRange = Math.max(positionData.tickLowerIndex, lowerPriceTick)
    const upperRange = Math.min(positionData.tickUpperIndex, upperPriceTick)

    const tickRange = Math.max(upperRange - lowerRange, 0)

    const rangeLiquidity: number = tickRange * liquidityPerTick

    if (isNaN(rangeLiquidity)){
        return 0
    }

    return rangeLiquidity
}

async function getWhirlpoolPositions(ctx, whirlpoolAddress: PublicKey){
    const positionFilter = (whirlpool: PublicKey): GetProgramAccountsFilter => ({
        memcmp: {
            offset: 8, // discriminator
            bytes: whirlpool.toBase58(),
        },
    });

    return await ctx.program.account.position.all([
        positionFilter(whirlpoolAddress),
    ])
}

export function deserializePosition(positionAccount): PositionData {
    return {
        whirlpool: new PublicKey(positionAccount.whirlpool),
        positionMint: new PublicKey(positionAccount.positionMint),
        liquidity: new BN(positionAccount.liquidity),
        tickLowerIndex: parseInt(positionAccount.tickLowerIndex, 10),
        tickUpperIndex: parseInt(positionAccount.tickUpperIndex, 10),
        feeGrowthCheckpointA: new BN(positionAccount.feeGrowthCheckpointA),
        feeOwedA: new BN(positionAccount.feeOwedA),
        feeGrowthCheckpointB: new BN(positionAccount.feeGrowthCheckpointB),
        feeOwedB: new BN(positionAccount.feeOwedB),
        rewardInfos: positionAccount.rewardInfos.map(
            (info: Record<string, any>) =>
                ({
                    growthInsideCheckpoint: new BN(info.growthInsideCheckpoint),
                    amountOwed: new BN(info.amountOwed),
                } as PositionRewardInfoData)
        ),
    };
}

export function deserializeWhirlpool(whirlpoolAccount): WhirlpoolData {
    return {
        whirlpoolsConfig: new PublicKey(whirlpoolAccount.whirlpoolsConfig),
        whirlpoolBump: whirlpoolAccount.whirlpoolBump,
        feeRate: whirlpoolAccount.feeRate,
        protocolFeeRate: whirlpoolAccount.protocolFeeRate,
        liquidity: new BN(whirlpoolAccount.liquidity),
        sqrtPrice: new BN(whirlpoolAccount.sqrtPrice),
        tickCurrentIndex: whirlpoolAccount.tickCurrentIndex,
        protocolFeeOwedA: new BN(whirlpoolAccount.protocolFeeOwedA),
        protocolFeeOwedB: new BN(whirlpoolAccount.protocolFeeOwedB),
        tokenMintA: new PublicKey(whirlpoolAccount.tokenMintA),
        tokenVaultA: new PublicKey(whirlpoolAccount.tokenVaultA),
        feeGrowthGlobalA: new BN(whirlpoolAccount.feeGrowthGlobalA),
        tokenMintB: new PublicKey(whirlpoolAccount.tokenMintB),
        tokenVaultB: new PublicKey(whirlpoolAccount.tokenVaultB),
        feeGrowthGlobalB: new BN(whirlpoolAccount.feeGrowthGlobalA),
        rewardLastUpdatedTimestamp: new BN(whirlpoolAccount.rewardLastUpdatedTimestamp),
        rewardInfos: whirlpoolAccount.rewardInfos.map((infoJson: Record<string, any>) => ({
            mint: new PublicKey(infoJson.mint),
            vault: new PublicKey(infoJson.vault),
            authority: new PublicKey(infoJson.authority),
            emissionsPerSecondX64: new BN(infoJson.emissionsPerSecondX64),
            growthGlobalX64: new BN(infoJson.growthGlobalX64),
        })),
        tickSpacing: whirlpoolAccount.tickSpacing,
    };
}
