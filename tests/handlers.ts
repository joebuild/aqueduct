import BN from "bn.js";
import {Connection, GetProgramAccountsFilter, Keypair, PublicKey, sendAndConfirmTransaction} from "@solana/web3.js";
import {
  DEFAULT_QUOTE_TOKEN,
  MY_ACCOUNT,
  MY_WALLET,
  NETWORK,
  WHIRLPOOL_PROGRAM_ID
} from "../app/src/infrastructure/constants";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import {AccountFetcher, buildWhirlpoolClient, WhirlpoolContext,} from "@orca-so/whirlpools-sdk";
import {getSwapTxHistory, getTxAtTimestamp} from "../app/src/infrastructure/helius";
import {
  closeAllWhirlpoolPositions,
  deserializePosition,
  getPositionLiquidityInPriceRange,
  getWhirlpoolLiquidityByToken
} from "../app/src/infrastructure/whirlpool";
import {
  getApprovedTokenInfo, getApprovedWhirlpools,
  getLatestPrices,
  getOpenbooks,
  getPairPriceStatsOverInterval,
  getRecentSwapVolumes,
  getWhirlpools
} from "../app/src/infrastructure/database";
import {
  addStrategyAllocationsToTokenSummaries, createPositionsAndOrders, getAccountTokenHoldings,
  getTokenSummaries,
  hasMatchingOpenbook,
  hasMatchingWhirlpool,
} from "../app/src/infrastructure/analysis";
import {
  cancelOpenbookOrders,
  crankAllMarkets,
  getMarket,
  roundReadableTokenAmountToDecimals, settleOpenbookFunds
} from "../app/src/infrastructure/openbook";
import {getTokenBalance} from "../app/src/utils/tokens";
import {sleep, wrapAllSol, wrapSol} from "../app/src/infrastructure/utils";

describe("handlers", () => {
  // let provider = anchor.AnchorProvider.local();
  // anchor.setProvider(provider);

  // const now = new Date()
  // const secondsEpoch = Math.round(now.getTime() / 1000)
  //
  // it("get tx sig at timestamp", async () => {
  //   await getTxAtTimestamp(secondsEpoch - 24 * 60 * 60)
  // });
  //
  // it("get transactions since timestamp", async () => {
  //   const txs = await getSwapTxHistory(secondsEpoch - 2 * 60)
  //   txs.forEach((tx) => console.log(tx))
  // });
  //
  // it("get orca whirlpools", async () => {
  //   const keypair = Keypair.generate();
  //   const wallet = new NodeWallet(keypair);
  //   const connection = new Connection(NETWORK, 'confirmed');
  //   const ctx = WhirlpoolContext.from(connection, wallet, WHIRLPOOL_PROGRAM_ID);
  //
  //   let whirlpools = await ctx.program.account.whirlpool.all()
  //
  //   whirlpools = whirlpools.filter((x) => {
  //     return x.account.tokenMintA.toBase58() === DEFAULT_QUOTE_TOKEN.toBase58() || x.account.tokenMintB.toBase58() === DEFAULT_QUOTE_TOKEN.toBase58()
  //   })
  //
  //   for (let wp of whirlpools){
  //     console.log(JSON.stringify(wp))
  //   }
  // });
  //
  // it("calculate total liquidity in a price range for a pool", async () => {
  //   const keypair = Keypair.generate()
  //   const wallet = new NodeWallet(keypair)
  //   const connection = new Connection(NETWORK, 'confirmed')
  //   const ctx = WhirlpoolContext.from(connection, wallet, WHIRLPOOL_PROGRAM_ID)
  //   const whirlpoolClient = buildWhirlpoolClient(ctx)
  //
  //   const whirlpoolAddress = new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ")
  //   const whirlpool = await whirlpoolClient.getPool(whirlpoolAddress)
  //
  //   const whirlpoolData = whirlpool.getData()
  //
  //   const positionFilter = (whirlpool: PublicKey): GetProgramAccountsFilter => ({
  //     memcmp: {
  //       offset: 8, // discriminator
  //       bytes: whirlpool.toBase58(),
  //     },
  //   });
  //
  //   let positions = await ctx.program.account.position.all([
  //     positionFilter(whirlpoolAddress),
  //   ])
  //
  //   let liquidityInPriceRange = 0
  //
  //   for (let p of positions){
  //     const positionData = deserializePosition(p.account)
  //
  //     let positionLiquidity = getPositionLiquidityInPriceRange(
  //         whirlpoolData,
  //         positionData,
  //         21.5 * 0.9,
  //         21.5 * 1.1,
  //         {
  //           "So11111111111111111111111111111111111111112": {decimals: 9},
  //           "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {decimals: 6},
  //         },
  //         {
  //           "So11111111111111111111111111111111111111112": 21.5,
  //           "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": 1.0,
  //         },
  //     )
  //
  //     liquidityInPriceRange += positionLiquidity
  //   }
  //
  //   console.log('Liquidity in price range: ', liquidityInPriceRange)
  // });
  //
  // it("get std of pair prices over interval", async () => {
  //   const valuesSummary = await getPairPriceStatsOverInterval("RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a", "So11111111111111111111111111111111111111112", 24)
  //   console.log(valuesSummary)
  // });
  //
  // it("test utils", async () => {
  //   const connection = new Connection(NETWORK, 'confirmed');
  //
  //   const SOL_USDC_OPENBOOK_MARKET_ADDR = new PublicKey("8BnEgHoWFysVcuFFX7QztDmzuH8r5ZFvyP3sYwn1XTh6")
  //   await getMarket(connection, SOL_USDC_OPENBOOK_MARKET_ADDR)
  // });
  //
  // it("wrap sol", async () => {
  //   const connection = new Connection(NETWORK, 'confirmed');
  //   const signature = await wrapSol(0.05 * 10 ** 9, MY_WALLET, connection)
  //
  //   console.log(signature)
  // });
  //
  // it("check wSOL balance", async () => {
  //   const connection = new Connection(NETWORK, 'confirmed');
  //   let defaultQuoteTokenAmount = await getTokenBalance(connection, DEFAULT_QUOTE_TOKEN, MY_WALLET.publicKey)
  //
  //   console.log(defaultQuoteTokenAmount.toNumber() / 10 ** 9)
  // });
  //
  // it("crank ze markets!!", async () => {
  //   const connection = new Connection(NETWORK, 'confirmed');
  //   const openbooks = await getOpenbooks()
  //   await crankAllMarkets(openbooks, connection)
  // });

  // it("get token balances", async () => {
  //   const wallet = new NodeWallet(MY_WALLET);
  //   const connection = new Connection(NETWORK, 'confirmed');
  //   const ctx = WhirlpoolContext.from(connection, wallet, WHIRLPOOL_PROGRAM_ID);
  //
  //   const latestPricesByMint = await getLatestPrices()
  //
  //   let tokenSummaries = [
  //     {
  //       mint: 'RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a',
  //       volume: 143400.69290016382,
  //       liquidity: 123447.96024042342,
  //       volToLiq: 1.1616286945598864,
  //       decimals: 2,
  //       symbol: 'RLB',
  //       name: 'Rollbit',
  //       allocation: 0.5,
  //       tokenHoldingsAmount: new BN(0),
  //       tokenHoldingsAmountReadable: 0,
  //       tokenHoldingsUSD: 0,
  //       currentTokenAllocation: 0
  //     },
  //     {
  //       mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  //       volume: 16793.82369371318,
  //       liquidity: 28135.524761764387,
  //       volToLiq: 0.5968903667485758,
  //       decimals: 5,
  //       symbol: 'BONK',
  //       name: 'Bonk',
  //       allocation: 0.1,
  //       tokenHoldingsAmount: new BN(0),
  //       tokenHoldingsAmountReadable: 0,
  //       tokenHoldingsUSD: 0,
  //       currentTokenAllocation: 0
  //     }
  //   ]
  //
  //   let getAccountTokenHoldingsObj = await getAccountTokenHoldings(tokenSummaries, latestPricesByMint, ctx.provider, MY_WALLET.publicKey)
  //   tokenSummaries = getAccountTokenHoldingsObj[0]
  //   let defaultQuoteTokenStats = getAccountTokenHoldingsObj[1]
  //
  //   console.log(tokenSummaries)
  //
  //   for (let summary of tokenSummaries){
  //     const tokenAmount = await getTokenBalance(connection, new PublicKey(summary.mint), MY_WALLET.publicKey)
  //     const tokenAmountReadable = (tokenAmount.toNumber() / 10 ** summary.decimals)
  //
  //     console.log(summary)
  //     console.log(tokenAmount.toNumber())
  //     console.log(tokenAmountReadable)
  //   }
  // });

  // it("find best vol/liq opportunities", async () => {
  //   const wallet = new NodeWallet(MY_WALLET);
  //   const connection = new Connection(NETWORK, 'confirmed');
  //   const ctx = WhirlpoolContext.from(connection, wallet, WHIRLPOOL_PROGRAM_ID);
  //
  //   const volumes = await getRecentSwapVolumes()
  //   const tokensByMint = await getApprovedTokenInfo()
  //   const latestPricesByMint = await getLatestPrices()
  //
  //   const openbooks = await getOpenbooks()
  //
  //   const tokenPoolLiquidity = await getWhirlpoolLiquidityByToken(ctx, tokensByMint, latestPricesByMint, Object.getOwnPropertyNames(volumes), openbooks, false)
  //   let tokenSummaries = getTokenSummaries(tokensByMint, volumes, tokenPoolLiquidity)
  //   tokenSummaries = tokenSummaries.sort((a, b) => (a.volToLiq > b.volToLiq ? -1 : 1))
  //
  //   console.log(tokenSummaries)
  // });

  it("get all pool liquidity and assign token allocations", async () => {
    const wallet = new NodeWallet(MY_WALLET);
    const connection = new Connection(NETWORK, 'confirmed');
    const ctx = WhirlpoolContext.from(connection, wallet, WHIRLPOOL_PROGRAM_ID);

    const volumes = await getRecentSwapVolumes()
    const tokensByMint = await getApprovedTokenInfo()
    const latestPricesByMint = await getLatestPrices()

    const whirlpools = await getWhirlpools()
    const openbooks = await getOpenbooks()

    // const tokenPoolLiquidity = await getWhirlpoolLiquidityByToken(ctx, tokensByMint, latestPricesByMint, Object.getOwnPropertyNames(volumes), openbooks, true)
    //
    // let tokenSummaries = getTokenSummaries(tokensByMint, volumes, tokenPoolLiquidity)
    // tokenSummaries = tokenSummaries.filter((ts) => hasMatchingWhirlpool(whirlpools, ts.mint) && hasMatchingOpenbook(openbooks, ts.mint))
    // tokenSummaries = addStrategyAllocationsToTokenSummaries(tokenSummaries, tokensByMint)
    // tokenSummaries = tokenSummaries.sort((a, b) => (a.volToLiq > b.volToLiq ? -1 : 1))
    //
    // console.log(tokenSummaries)

    await closeAllWhirlpoolPositions(ctx).catch((error) => console.error(error))
    await sleep(10000)

    await cancelOpenbookOrders(openbooks, connection).catch((error) => console.error(error))
    await sleep(10000)

    await crankAllMarkets(openbooks, connection).catch((error) => console.error(error))
    await sleep(10000)

    await settleOpenbookFunds(openbooks, connection).catch((error) => console.error(error))
    await sleep(10000)

    let getAccountTokenHoldingsObj = await getAccountTokenHoldings(tokenSummaries, latestPricesByMint, ctx.provider, MY_WALLET.publicKey)
    tokenSummaries = getAccountTokenHoldingsObj[0]
    let defaultQuoteTokenStats = getAccountTokenHoldingsObj[1]

    console.log(tokenSummaries)

    const approvedWhirlpools = await getApprovedWhirlpools()

    const totalOverAllocation = tokenSummaries.map((x) => x.currentTokenAllocation > x.allocation ? x.currentTokenAllocation - x.allocation : 0)
    await createPositionsAndOrders(tokenSummaries, totalOverAllocation, defaultQuoteTokenStats, latestPricesByMint, approvedWhirlpools, openbooks, ctx)
  });

});

