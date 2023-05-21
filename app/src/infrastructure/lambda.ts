import 'dotenv/config'
import type {ScheduledEvent} from "aws-lambda";
import {MY_WALLET, NETWORK, USDC, WHIRLPOOL_PROGRAM_ID} from "./constants";
import {getSwapTxHistory} from "./helius";
import * as fs from "graceful-fs";
import {
  bulkAddPrices,
  bulkAddTokens,
  bulkAddTransactions, getApprovedTokenInfo, getApprovedWhirlpools,
  getLatestPrices, getOpenbooks,
  getProcessedFiles,
  getRecentSwapVolumes,
  getTokenInfo, getWhirlpools
} from './database'
import type {Prisma} from "@prisma/client";
import {closeAllWhirlpoolPositions, getWhirlpoolLiquidityByToken} from "./whirlpool";
import {Connection, Keypair, PublicKey} from "@solana/web3.js";
import NodeWallet from "@project-serum/anchor/dist/esm/nodewallet";
import {AccountFetcher, buildWhirlpoolClient, WhirlpoolContext} from "@orca-so/whirlpools-sdk";
import {
  addStrategyAllocationsToTokenSummaries, createPositionsAndOrders,
  getAccountTokenHoldings,
  getTokenSummaries,
  hasMatchingOpenbook,
  hasMatchingWhirlpool
} from './analysis';
import {sleep, wrapAllSol} from "./utils";
import {cancelOpenbookOrders, crankAllMarkets, settleOpenbookFunds} from "./openbook";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

const s3 = new AWS.S3();
const BUCKET_NAME = "aqueduct-jupiter-tx-data";

export async function jupDataHandler(event: ScheduledEvent) {
  try {
    await (async () => {
      const now = new Date()
      const secondsEpoch = Math.round(now.getTime() / 1000)

      const fileName = secondsEpoch.toString()

      const txs = await getSwapTxHistory(secondsEpoch - 5 * 60)
      let firstLine = true
      txs.forEach((tx) => {
        const txClean = tx.replace('\n', '')
        writeLineToFile(txClean, fileName, firstLine)
        if (firstLine){
          firstLine = false
        }
      })

      await saveToS3(fileName)

      return
    })();
  } catch (e){
    console.log(e)
  }
}

export async function databaseLoaderHandler(event: ScheduledEvent) {
  try {
    await (async () => {
      const bucketFiles = await listBucketFilesS3()
      const processedFiles = (await getProcessedFiles()).map((x) => x.s3_source_file)
      const latestPricesByMint = await getLatestPrices()
      const tokens = await getTokenInfo()

      let newTokens = {}

      for (let fileName of bucketFiles){
        if (!processedFiles.includes(fileName)){
          const fileContents = await readFromS3(fileName)

          let transactions: Prisma.TransactionsCreateInput[] = []
          let newPrices: Prisma.PricesCreateInput[] = []

          const txLines = fileContents.split('\n')

          for (let txLine of txLines){
            try {
              const tx = JSON.parse(txLine)

              for (let [innerSwapIndex, innerSwap] of tx.events.swap.innerSwaps.entries()){

                if (!innerSwap.tokenInputs || !innerSwap.tokenOutputs){
                  continue
                }

                if (innerSwap.tokenInputs.length > 1 || innerSwap.tokenOutputs.length > 1){
                  continue
                }

                const tokenInput  = innerSwap.tokenInputs[0]
                const tokenOutput = innerSwap.tokenOutputs[0]

                let volume = null

                if (latestPricesByMint[tokenInput.mint]){
                  volume = latestPricesByMint[tokenInput.mint].price * tokenInput.tokenAmount
                } else if (latestPricesByMint[tokenOutput.mint]) {
                  volume = latestPricesByMint[tokenOutput.mint].price * tokenOutput.tokenAmount
                }

                const txRecord = {
                  tx_id: tx.signature,
                  inner_swap_index: innerSwapIndex,
                  slot: tx.slot,
                  timestamp: tx.timestamp,
                  s3_source_file: fileName,
                  token_a_mint: tokenInput.mint,
                  token_a_amount: tokenInput.tokenAmount,
                  token_b_mint: tokenOutput.mint,
                  token_b_amount: tokenOutput.tokenAmount,
                  price_a_per_b: tokenInput.tokenAmount/tokenOutput.tokenAmount,
                  price_b_per_a: tokenOutput.tokenAmount/tokenInput.tokenAmount,
                  volume_usd: volume
                }

                transactions.push(txRecord)

                // == get price if one of the mints is USDC
                if (tokenInput.mint === USDC.toBase58() || tokenOutput.mint === USDC.toBase58()) {
                  let priceRecord = {} as Prisma.PricesCreateInput
                  const epochMinute = Math.floor(tx.timestamp / 60)

                  if (tokenInput.mint === USDC.toBase58()) {
                    priceRecord = {
                      epoch_minute: epochMinute,
                      mint: tokenOutput.mint,
                      price: txRecord.price_a_per_b
                    }
                  } else {
                    priceRecord = {
                      epoch_minute: epochMinute,
                      mint: tokenInput.mint,
                      price: txRecord.price_b_per_a
                    }
                  }

                  newPrices.push(priceRecord)
                }
              }

              // add new tokens
              if (tx.events?.swap?.tokenInputs && tx.events.swap.tokenInputs.length > 0){
                for (let t of tx.events.swap.tokenInputs){
                  if (!tokens[t.mint] && t.rawTokenAmount.decimals){
                    newTokens[t.mint] = {
                      mint: t.mint,
                      decimals: t.rawTokenAmount.decimals
                    }
                  }
                }
              }

            } catch (err){
              console.log(err.stack)
            }
          }

          await bulkAddTransactions(transactions)
          await bulkAddPrices(newPrices)
          await bulkAddTokens(Object.values(newTokens))
        }
      }

      return
    })();
  } catch (err){
    console.log(err.stack)
  }
}

export async function positionsHandler(event: ScheduledEvent) {
  try {
    await (async () => {
      const wallet = new NodeWallet(MY_WALLET);
      const connection = new Connection(NETWORK, 'confirmed');
      const ctx = WhirlpoolContext.from(connection, wallet, WHIRLPOOL_PROGRAM_ID);

      const volumes = await getRecentSwapVolumes()
      const tokensByMint = await getApprovedTokenInfo()
      const latestPricesByMint = await getLatestPrices()

      const whirlpools = await getWhirlpools()
      const openbooks = await getOpenbooks()

      const tokenPoolLiquidity = await getWhirlpoolLiquidityByToken(ctx, tokensByMint, latestPricesByMint, Object.getOwnPropertyNames(volumes), openbooks, true)

      let tokenSummaries = getTokenSummaries(tokensByMint, volumes, tokenPoolLiquidity)
      tokenSummaries = tokenSummaries.filter((ts) => hasMatchingWhirlpool(whirlpools, ts.mint) && hasMatchingOpenbook(openbooks, ts.mint))
      tokenSummaries = addStrategyAllocationsToTokenSummaries(tokenSummaries, tokensByMint)

      tokenSummaries = tokenSummaries.sort((a, b) => (a.volToLiq > b.volToLiq ? -1 : 1))

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

      return
    })();
  } catch (err){
    console.log(err.stack)
  }
}

function writeLineToFile(inputLine: string, fileName: string, firstLine = false){
  const line = firstLine ? inputLine : '\n' + inputLine

  fs.appendFile('/tmp/' + fileName, line, err => {
    if (err) {
      console.log(err.stack)
    }
  });
}

function saveToS3(fileName: string): Promise<any> {
  const readStream = fs.createReadStream('/tmp/' + fileName);

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: readStream
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, function(err, data) {
      readStream.destroy();

      if (err) {
        console.log(err.stack)
        return reject(err);
      }

      return resolve(data);
    });
  });
}

async function readFromS3(fileName: string): Promise<string> {
  console.log('Bucket: ', BUCKET_NAME, ' Key: ', fileName)
  const response = await s3.getObject({Bucket: BUCKET_NAME, Key: fileName}).promise()
  return response.Body.toString('utf-8')
}

async function listBucketFilesS3(): Promise<string[]> {
  const now = new Date()
  const secondsEpoch = Math.round(now.getTime() / 1000) - 24*60*60

  const response = await s3.listObjectsV2({
    Bucket: BUCKET_NAME,
    StartAfter: secondsEpoch.toString()
  }).promise()
  return response.Contents.map((item) => item.Key)
}

const delay = ms => new Promise(res => setTimeout(res, ms));
