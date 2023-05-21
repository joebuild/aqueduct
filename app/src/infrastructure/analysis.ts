import {
    DEFAULT_INTERVAL_HOURS,
    DEFAULT_MIN_PERCENT_AWAY_FROM_LATEST,
    DEFAULT_RANGE_ADJUSTMENT,
    DEFAULT_QUOTE_TOKEN,
    DEFAULT_QUOTE_TOKEN_DECIMALS,
    DEFAULT_SLIPPAGE_TOLERANCE,
    MY_ACCOUNT,
    OPENBOOK_PROGRAM_ID,
    OPENBOOK_SMALLEST_ORDER_USD,
    PERCENT_OF_TOKENS_FOR_WP_FUDGE_FACTOR,
    MAX_SINGLE_TOKEN_ALLOCATION,
    GREEDY_BLOATED_TOKEN_FORGIVENESS_FACTOR,
    DEFAULT_VOL_TO_LIQ,
    MAX_VOL_TO_LIQ,
    WHIRLPOOL_SMALLEST_POSITION_USD,
    USDC,
    JUPITER_MARKET_ORDER_PROPORTION
} from "./constants";
import {getTokenBalance} from "../utils/tokens";
import BN from "bn.js";
import {getPairPriceStatsOverInterval} from "./database";
import {
    buildWhirlpoolClient,
    increaseLiquidityQuoteByInputTokenWithParams,
    PriceMath,
    TickUtil
} from "@orca-so/whirlpools-sdk";
import {PublicKey} from "@solana/web3.js";
import Decimal from "decimal.js";
import {Market} from "@openbook-dex/openbook";
import {OrderSide, placeOrder, roundReadableTokenAmountToDecimals} from "./openbook";
import {myGetOpenPositionWithOptMetadataTx} from "./whirlpool";
import {jupiterMarketOrder} from "./jupiter";

export function getTokenSummaries(tokensByMint, volumes, tokenPoolLiquidity): any[] {
    let tokenSummaries = []
    for (let mint of Object.getOwnPropertyNames(volumes)){
        if (tokensByMint[mint] && !(tokensByMint[mint].approved_to_trade === false)) {
            let summary = {
                mint: mint,
                volume: volumes[mint],
                liquidity: tokenPoolLiquidity[mint],
                volToLiq: Math.min(volumes[mint] / tokenPoolLiquidity[mint], MAX_VOL_TO_LIQ),
                decimals: tokensByMint[mint].decimals,
                symbol: tokensByMint[mint].symbol,
                name: tokensByMint[mint].name
            }

            if (isNaN(summary.volToLiq)){
                summary.volToLiq = DEFAULT_VOL_TO_LIQ
            }

            tokenSummaries.push(summary)
        }
    }

    return tokenSummaries
}

export function addStrategyAllocationsToTokenSummaries(tokenSummaries, tokensByMint, defaultMaxAllocation = MAX_SINGLE_TOKEN_ALLOCATION): any[] {
    // get allocation according to VOL/LIQ ratio
    let total = tokenSummaries.map((x) => x.volToLiq).reduce((sum, current) => sum + current)
    tokenSummaries = tokenSummaries.map((x) => ({...x, allocation: x.volToLiq/total}))

    let remainingTokenSummaries = tokenSummaries
    let finalizedTokenSummaries = []

    let index = 0
    while (index < 5){
        let anyAllosMaxed = false
        remainingTokenSummaries.forEach((x) => {
            if (tokensByMint[x.mint].max_allocation_percent && x.allocation >= tokensByMint[x.mint].max_allocation_percent){
                finalizedTokenSummaries.push({...x, allocation: tokensByMint[x.mint].max_allocation_percent})
                anyAllosMaxed = true
            } else if (x.allocation >= defaultMaxAllocation){
                finalizedTokenSummaries.push({...x, allocation: defaultMaxAllocation})
                anyAllosMaxed = true
            }
        })

        remainingTokenSummaries = remainingTokenSummaries.filter((x) => !finalizedTokenSummaries.some((y) => y.mint === x.mint))

        let finalizedTotal = finalizedTokenSummaries.map((x) => x.allocation).reduce((sum, current) => sum + current, 0)
        let remainingTotal = remainingTokenSummaries.map((x) => x.allocation).reduce((sum, current) => sum + current, 0)

        remainingTokenSummaries = remainingTokenSummaries.map((x) => ({...x, allocation: (x.allocation/remainingTotal)*(1-finalizedTotal)}))

        if (!anyAllosMaxed){
            finalizedTokenSummaries.push(...remainingTokenSummaries)
            break
        }

        index++
    }

    return finalizedTokenSummaries
}

export async function getAccountTokenHoldings(tokenSummaries, pricesByMint, provider, addr): Promise<any[]> {
    tokenSummaries = await Promise.all(tokenSummaries.map(async (summary) => {
        const tokenAmount = await getTokenBalance(provider.connection, new PublicKey(summary.mint), addr)
        const tokenAmountReadable = tokenAmount.toNumber() / 10 ** summary.decimals
        const tokenHoldingsUSD = pricesByMint[summary.mint].price * tokenAmountReadable

        return {
            ...summary,
            tokenHoldingsAmount: tokenAmount,
            tokenHoldingsAmountReadable: tokenAmountReadable,
            tokenHoldingsUSD: tokenHoldingsUSD
        }
    }))

    let defaultQuoteTokenAmount = await getTokenBalance(provider.connection, DEFAULT_QUOTE_TOKEN, addr)
    let defaultQuoteTokenAmountReadable = defaultQuoteTokenAmount.toNumber() / 10 ** DEFAULT_QUOTE_TOKEN_DECIMALS
    let defaultQuoteTokenAmountUSD = pricesByMint[DEFAULT_QUOTE_TOKEN.toBase58()].price * defaultQuoteTokenAmountReadable

    let totalBalance = tokenSummaries.map((x) => x.tokenHoldingsUSD).reduce((sum, current) => sum + current, 0) + defaultQuoteTokenAmountUSD

    console.log(totalBalance)

    tokenSummaries = tokenSummaries.map((x) => ({...x, currentTokenAllocation: (x.tokenHoldingsUSD/totalBalance) || 0}))

    const defaultQuoteTokenStats = {
        tokenHoldingsAmount: defaultQuoteTokenAmount,
        tokenHoldingsAmountReadable: defaultQuoteTokenAmountReadable,
        tokenHoldingsUSD: defaultQuoteTokenAmountUSD,
        totalAccountBalanceUSD: totalBalance
    }

    return [tokenSummaries, defaultQuoteTokenStats]
}

export async function createPositionsAndOrders(tokenSummaries, totalOverAllocation, summaryQuoteAccountStats, pricesByMint, whirlpools, openbooks, whirlpoolCtx): Promise<any[]> {
    console.log('Summary balance stats:')
    console.log(summaryQuoteAccountStats)

    const whirlpoolClient = buildWhirlpoolClient(whirlpoolCtx)

    for (let summary of tokenSummaries){
        console.log('')
        console.log(`================================================  ${summary.symbol}, ${summary.name}  ================================================`)
        console.log(summary)

        try {
            const wp = findMatchingWhirlpool(whirlpools, summary.mint)
            const ob = findMatchingOpenbook(openbooks, summary.mint)

            if (!wp || !ob) {
                console.log('== Cannot find both a Whirlpool + Openbook matching the mint ==')
                continue
            }

            const whirlpool = await whirlpoolClient.getPool(wp.address)
            const whirlpoolData = whirlpool.getData()

            const priceFromWhirlpool = PriceMath.sqrtPriceX64ToPrice(whirlpoolData.sqrtPrice, whirlpool.getTokenAInfo().decimals, whirlpool.getTokenBInfo().decimals).toNumber()
            console.log('priceFromWhirlpool: ', priceFromWhirlpool)

            // the OB quote must always be as expected, but the whirlpool token_a/token_b can be swapped
            const expectedPolarity = wp.token_b === ob.quote_mint && ob.quote_mint === DEFAULT_QUOTE_TOKEN.toBase58()
            const reversePolarity = wp.token_a === ob.quote_mint && ob.quote_mint === DEFAULT_QUOTE_TOKEN.toBase58()

            // not sure that this is necessary, but just to be sure
            if (!expectedPolarity && !reversePolarity) {
                continue
            }

            let priceStatsOB = await getPairPriceStatsOverInterval(ob.base_mint, ob.quote_mint, DEFAULT_INTERVAL_HOURS)
            const [lowerboundOB, upperboundOB] = insideRange(priceStatsOB)
            console.log(priceStatsOB)
            console.log('lowerbound: ', lowerboundOB)
            console.log('upperbound: ', upperboundOB)

            // price stats matter for both the openbook and orca position orders, so grab the reverse for orca (not always needed)
            let priceStatsWP = await getPairPriceStatsOverInterval(wp.token_a, wp.token_b, DEFAULT_INTERVAL_HOURS)
            priceStatsWP.min = Math.min(priceStatsWP.min, priceFromWhirlpool)
            priceStatsWP.max = Math.max(priceStatsWP.max, priceFromWhirlpool)
            const [lowerboundWP, upperboundWP] = outsideRange(priceStatsWP)

            const overAllocated = summary.currentTokenAllocation > summary.allocation

            const tokenADecimals = expectedPolarity ? summary.decimals : DEFAULT_QUOTE_TOKEN_DECIMALS
            const tokenBDecimals = expectedPolarity ? DEFAULT_QUOTE_TOKEN_DECIMALS : summary.decimals

            let tickLowerIndex = TickUtil.getInitializableTickIndex(
                PriceMath.priceToTickIndex(new Decimal(lowerboundWP), tokenADecimals, tokenBDecimals),
                whirlpoolData.tickSpacing
            )

            let tickUpperIndex = TickUtil.getInitializableTickIndex(
                PriceMath.priceToTickIndex(new Decimal(upperboundWP), tokenADecimals, tokenBDecimals),
                whirlpoolData.tickSpacing
            )

            let basePrice = pricesByMint[ob.base_mint].price
            let quotePrice = pricesByMint[ob.quote_mint].price

            let oneHundredUsdQuoteAmount = new BN((100 / quotePrice) * 10 ** DEFAULT_QUOTE_TOKEN_DECIMALS)

            const param = {
                tokenMintA: new PublicKey(wp.token_a),
                tokenMintB: new PublicKey(wp.token_b),
                tickCurrentIndex: whirlpoolData.tickCurrentIndex,
                sqrtPrice: whirlpoolData.sqrtPrice,
                inputTokenMint: expectedPolarity ? whirlpoolData.tokenMintB : whirlpoolData.tokenMintA,
                inputTokenAmount: oneHundredUsdQuoteAmount,
                tickLowerIndex: tickLowerIndex,
                tickUpperIndex: tickUpperIndex,
                slippageTolerance: DEFAULT_SLIPPAGE_TOLERANCE,
            }

            const estimateForRatio = increaseLiquidityQuoteByInputTokenWithParams(param);

            let baseUsdFromEstimate = expectedPolarity ? (
                (estimateForRatio.tokenEstA.toNumber() / 10 ** summary.decimals) * basePrice
            ) : (
                (estimateForRatio.tokenEstB.toNumber() / 10 ** summary.decimals) * basePrice
            )

            const whirlpoolRatioBaseOutOfTotal = baseUsdFromEstimate / (100 + baseUsdFromEstimate)
            const totalAllocationUsd = summary.allocation * summaryQuoteAccountStats.totalAccountBalanceUSD
            const maxDeploymentBaseTokenValueUsd = whirlpoolRatioBaseOutOfTotal * totalAllocationUsd
            const tokenValueDeltaUsd = summary.tokenHoldingsUSD - maxDeploymentBaseTokenValueUsd

            console.log('estimate: ', estimateForRatio)
            console.log('whirlpoolRatioBaseOutOfTotal: ', whirlpoolRatioBaseOutOfTotal)
            console.log('totalAllocationUsd: ', totalAllocationUsd)
            console.log('maxDeploymentBaseTokenValueUsd: ', maxDeploymentBaseTokenValueUsd)
            console.log('tokenValueDeltaUsd: ', tokenValueDeltaUsd)
            console.log('overAllocated: ', overAllocated)

            let finalEstimate;
            let baseUsdForWhirlpool = 0
            let quoteUsdForWhirlpool = 0

            if (tokenValueDeltaUsd > 0 && !overAllocated) { // quote allocation will be the limiting factor
                console.log('=== tokenValueDeltaUsd > 0, quote tokens are the limiting side')

                quoteUsdForWhirlpool = (totalAllocationUsd - summary.tokenHoldingsUSD) * PERCENT_OF_TOKENS_FOR_WP_FUDGE_FACTOR
                baseUsdForWhirlpool = whirlpoolRatioBaseOutOfTotal * quoteUsdForWhirlpool

                if (quoteUsdForWhirlpool < GREEDY_BLOATED_TOKEN_FORGIVENESS_FACTOR * totalAllocationUsd) {
                    quoteUsdForWhirlpool = GREEDY_BLOATED_TOKEN_FORGIVENESS_FACTOR * totalAllocationUsd * PERCENT_OF_TOKENS_FOR_WP_FUDGE_FACTOR
                    baseUsdForWhirlpool = quoteUsdForWhirlpool / (1 - whirlpoolRatioBaseOutOfTotal)

                    if (baseUsdForWhirlpool > maxDeploymentBaseTokenValueUsd) {
                        baseUsdForWhirlpool = maxDeploymentBaseTokenValueUsd * PERCENT_OF_TOKENS_FOR_WP_FUDGE_FACTOR
                        quoteUsdForWhirlpool = baseUsdForWhirlpool * (1 - whirlpoolRatioBaseOutOfTotal)
                    }
                }

                if (quoteUsdForWhirlpool > 0) {
                    let quoteInputAmount = new BN(Math.round((quoteUsdForWhirlpool / quotePrice) * (10 ** DEFAULT_QUOTE_TOKEN_DECIMALS)))

                    finalEstimate = increaseLiquidityQuoteByInputTokenWithParams({
                        tokenMintA: new PublicKey(wp.token_a),
                        tokenMintB: new PublicKey(wp.token_b),
                        tickCurrentIndex: whirlpoolData.tickCurrentIndex,
                        sqrtPrice: whirlpoolData.sqrtPrice,
                        inputTokenMint: expectedPolarity ? whirlpoolData.tokenMintB : whirlpoolData.tokenMintA,
                        inputTokenAmount: quoteInputAmount,
                        tickLowerIndex: tickLowerIndex,
                        tickUpperIndex: tickUpperIndex,
                        slippageTolerance: DEFAULT_SLIPPAGE_TOLERANCE,
                    });
                }
            } else if (tokenValueDeltaUsd < 0 && !overAllocated) { // base tokens held will be the limiting factor
                console.log('=== tokenValueDeltaUsd < 0, base tokens are the limiting side')

                baseUsdForWhirlpool = summary.tokenHoldingsUSD * PERCENT_OF_TOKENS_FOR_WP_FUDGE_FACTOR
                quoteUsdForWhirlpool = baseUsdForWhirlpool * (1 - whirlpoolRatioBaseOutOfTotal)

                console.log('baseUsdForWhirlpool: ', baseUsdForWhirlpool)
                console.log('quoteUsdForWhirlpool: ', quoteUsdForWhirlpool)

                if (baseUsdForWhirlpool > 0) {
                    let baseInputAmount = new BN(Math.round((baseUsdForWhirlpool / basePrice) * (10 ** summary.decimals)))

                    finalEstimate = increaseLiquidityQuoteByInputTokenWithParams({
                        tokenMintA: new PublicKey(wp.token_a),
                        tokenMintB: new PublicKey(wp.token_b),
                        tickCurrentIndex: whirlpoolData.tickCurrentIndex,
                        sqrtPrice: whirlpoolData.sqrtPrice,
                        inputTokenMint: expectedPolarity ? whirlpoolData.tokenMintA : whirlpoolData.tokenMintB,
                        inputTokenAmount: baseInputAmount,
                        tickLowerIndex: tickLowerIndex,
                        tickUpperIndex: tickUpperIndex,
                        slippageTolerance: DEFAULT_SLIPPAGE_TOLERANCE,
                    });
                }
            } else { // we have more base tokens than we want but also want to make use of them, so we need to do some math and fudge it
                console.log('=== overallocated! all bets are off')

                baseUsdForWhirlpool = (summary.tokenHoldingsUSD - tokenValueDeltaUsd) * PERCENT_OF_TOKENS_FOR_WP_FUDGE_FACTOR
                quoteUsdForWhirlpool = baseUsdForWhirlpool * (1 - whirlpoolRatioBaseOutOfTotal)

                let baseInputAmount = new BN(Math.round((baseUsdForWhirlpool / basePrice) * (10 ** summary.decimals)))

                finalEstimate = increaseLiquidityQuoteByInputTokenWithParams({
                    tokenMintA: new PublicKey(wp.token_a),
                    tokenMintB: new PublicKey(wp.token_b),
                    tickCurrentIndex: whirlpoolData.tickCurrentIndex,
                    sqrtPrice: whirlpoolData.sqrtPrice,
                    inputTokenMint: expectedPolarity ? whirlpoolData.tokenMintA : whirlpoolData.tokenMintB,
                    inputTokenAmount: baseInputAmount,
                    tickLowerIndex: tickLowerIndex,
                    tickUpperIndex: tickUpperIndex,
                    slippageTolerance: DEFAULT_SLIPPAGE_TOLERANCE,
                });
            }

            if (finalEstimate) {
                console.log('finalEstimate.tokenMaxA: ', finalEstimate.tokenMaxA.toNumber())
                console.log('finalEstimate.tokenMaxB: ', finalEstimate.tokenMaxB.toNumber())
                console.log('finalEstimate.tokenEstA: ', finalEstimate.tokenEstA.toNumber())
                console.log('finalEstimate.tokenEstB: ', finalEstimate.tokenEstB.toNumber())
                console.log('finalEstimate.liquidityAmount: ', finalEstimate.liquidityAmount.toNumber())
            }

            if (
                finalEstimate &&
                (baseUsdForWhirlpool + quoteUsdForWhirlpool) > WHIRLPOOL_SMALLEST_POSITION_USD &&
                finalEstimate.liquidityAmount.gt(new BN(0))
            ) {
                console.log(' ꩜ ꩜ ꩜ ꩜ ꩜ ꩜ ꩜ ꩜ Opening Whirlpool position ꩜ ꩜ ꩜ ꩜ ꩜ ꩜ ꩜ ꩜ ')

                const openPositionTx = await myGetOpenPositionWithOptMetadataTx(
                    tickLowerIndex,
                    tickUpperIndex,
                    finalEstimate,
                    MY_ACCOUNT.publicKey,
                    MY_ACCOUNT.publicKey,
                    whirlpool,
                    whirlpoolData,
                    whirlpoolCtx
                )
                console.log(finalEstimate)

                const signature = await openPositionTx.tx.buildAndExecute().catch((error) => console.error(error))
                console.log(signature)
            }

            const market = await Market.load(whirlpoolCtx.connection, new PublicKey(ob.address), {}, OPENBOOK_PROGRAM_ID)

            if (tokenValueDeltaUsd > OPENBOOK_SMALLEST_ORDER_USD) {
                let sellSizeReadable = ((tokenValueDeltaUsd / quotePrice) / upperboundOB)
                sellSizeReadable = roundReadableTokenAmountToDecimals(sellSizeReadable, summary.decimals)
                const response = await placeOrder(upperboundOB, sellSizeReadable, OrderSide.SELL, market, MY_ACCOUNT, whirlpoolCtx.connection).catch((error) => console.error(error))
                console.log(response)

                let marketSellSizeBaseAmount = Math.round(sellSizeReadable * JUPITER_MARKET_ORDER_PROPORTION * 10 ** summary.decimals)
                await jupiterMarketOrder(whirlpoolCtx.connection, summary.mint, DEFAULT_QUOTE_TOKEN.toBase58(), marketSellSizeBaseAmount)
            } else if (tokenValueDeltaUsd < -OPENBOOK_SMALLEST_ORDER_USD) {
                let buySizeReadable = (Math.abs(tokenValueDeltaUsd) / quotePrice) / lowerboundOB
                buySizeReadable = roundReadableTokenAmountToDecimals(buySizeReadable, summary.decimals)
                const response = await placeOrder(lowerboundOB, buySizeReadable, OrderSide.BUY, market, MY_ACCOUNT, whirlpoolCtx.connection).catch((error) => console.error(error))
                console.log(response)

                let marketBuySizeQuoteAmount = Math.round((Math.abs(tokenValueDeltaUsd) / quotePrice) * JUPITER_MARKET_ORDER_PROPORTION * 10 ** DEFAULT_QUOTE_TOKEN_DECIMALS)
                await jupiterMarketOrder(whirlpoolCtx.connection, DEFAULT_QUOTE_TOKEN.toBase58(), summary.mint, marketBuySizeQuoteAmount)
            }

        } catch (err) {
            console.log(err)
        }

    }

    return tokenSummaries
}

export function hasMatchingWhirlpool(whirlpools, mint, defaultQuoteMint = DEFAULT_QUOTE_TOKEN.toBase58()): boolean {
    return whirlpools.some((wp) => {
        const combo1 = (wp.token_a === mint && wp.token_b === defaultQuoteMint)
        const combo2 = (wp.token_a === defaultQuoteMint && wp.token_b === mint)
        return combo1 || combo2
    })
}

export function hasMatchingOpenbook(openbooks, mint, defaultQuoteMint = DEFAULT_QUOTE_TOKEN.toBase58()): boolean {
    return openbooks.some((ob) => {
        const combo1 = (ob.quote_mint === mint && ob.base_mint === defaultQuoteMint)
        const combo2 = (ob.quote_mint === defaultQuoteMint && ob.base_mint === mint)
        return combo1 || combo2
    })
}

export function findMatchingWhirlpool(whirlpools, mint, defaultQuoteMint = DEFAULT_QUOTE_TOKEN.toBase58()): any {
    return whirlpools.find((wp) => {
        const combo1 = (wp.token_a === mint && wp.token_b === defaultQuoteMint)
        const combo2 = (wp.token_a === defaultQuoteMint && wp.token_b === mint)
        return combo1 || combo2
    })
}

export function findMatchingOpenbook(openbooks, mint, defaultQuoteMint = DEFAULT_QUOTE_TOKEN.toBase58()): any {
    return openbooks.find((ob) => {
        return ob.quote_mint ===defaultQuoteMint && ob.base_mint === mint
    })
}

function insideRange(stats, percentInsideRange = DEFAULT_RANGE_ADJUSTMENT, percentAwayFromLatest = DEFAULT_MIN_PERCENT_AWAY_FROM_LATEST){
    const min = stats.min
    const max = stats.max

    const range = max - min

    let lb = min + percentInsideRange * range
    let ub = max - percentInsideRange * range

    lb = Math.min(lb, stats.latest * (1 - percentAwayFromLatest))
    ub = Math.max(ub, stats.latest * (1 + percentAwayFromLatest))

    return [lb, ub]
}

function outsideRange(stats, percentOutsideRange = DEFAULT_RANGE_ADJUSTMENT, percentAwayFromLatest = DEFAULT_MIN_PERCENT_AWAY_FROM_LATEST){
    const min = stats.min
    const max = stats.max

    const range = max - min

    let lb = min - percentOutsideRange * range
    let ub = max + percentOutsideRange * range

    lb = Math.min(lb, stats.latest * (1 - percentAwayFromLatest))
    ub = Math.max(ub, stats.latest * (1 + percentAwayFromLatest))

    return [lb, ub]
}
