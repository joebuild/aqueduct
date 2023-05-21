import {Prisma, PrismaClient} from '@prisma/client'
import {
    JUPITER_VOLUME_INTERVAL_HOURS,
    LIQUID_SOL,
    MIN_JUPITER_VOLUME_USD,
    STABLE_COINS,
    USDC
} from "./constants";
import {mean, stdDev} from "../utils/math";

const prisma = new PrismaClient()

export async function getProcessedFiles(): Promise<any[]> {
    return await prisma.transactions.findMany({
        select: {
            s3_source_file: true,
        },
        distinct: ['s3_source_file'],
    })
}

export async function getLatestPrices(): Promise<any> {
    const latestPrices = await prisma.prices.findMany({
        distinct: ['mint'],
        orderBy: {
            epoch_minute: 'desc',
        },
    })

    let latestPricesByMint = {}
    latestPrices.forEach((x) => latestPricesByMint[x.mint] = x)

    return latestPricesByMint
}

export async function getTokenInfo(): Promise<any> {
    const tokens = await prisma.tokens.findMany()

    const tokensByMint = {}
    tokens.forEach((x) => tokensByMint[x.mint] = x)

    return tokensByMint
}

export async function getApprovedTokenInfo(): Promise<any> {
    const tokens = await prisma.tokens.findMany()

    const tokensByMint = {}
    tokens.forEach((x) => {
        if (!(x.approved_to_trade === false)){
            tokensByMint[x.mint] = x
        }
    })

    return tokensByMint
}

export async function getWhirlpools(): Promise<any> {
    return await prisma.whirlpools.findMany()
}

export async function getApprovedWhirlpools(): Promise<any> {
    return await prisma.whirlpools.findMany({
        where: {
            approved: true
        },
    })
}

export async function getOpenbooks(): Promise<any> {
    return await prisma.openbooks.findMany()
}

export async function getRecentSwapVolumes(hoursAgo = JUPITER_VOLUME_INTERVAL_HOURS, min_volume = MIN_JUPITER_VOLUME_USD): Promise<any> {
    const timeStart = Math.round((new Date()).getTime() / 1000) - 60*60*hoursAgo

    const tokenAVolumes = await prisma.transactions.groupBy({
        by: ['token_a_mint'],
        // @ts-ignore
        select: {
            token_a_mint: true,
        },
        where: {
            volume_usd: {
                not: null,
            },
            timestamp: {
                gte: timeStart
            },
        },
        _sum: {
            volume_usd: true,
        },
        orderBy: {
            _sum: {
                volume_usd: 'desc',
            },
        },
    })


    const tokenBVolumes = await prisma.transactions.groupBy({
        by: ['token_b_mint'],
        // @ts-ignore
        select: {
            token_b_mint: true,
        },
        where: {
            volume_usd: {
                not: null,
            },
            timestamp: {
                gte: timeStart
            },
        },
        _sum: {
            volume_usd: true,
        },
        orderBy: {
            _sum: {
                volume_usd: 'desc',
            },
        },
    })

    let volumes = {}

    tokenAVolumes.forEach((x) => {
        volumes[x.token_a_mint] = x._sum.volume_usd
    })

    tokenBVolumes.forEach((x) => {
        if (!volumes[x.token_b_mint]){
            volumes[x.token_b_mint] = x._sum.volume_usd
        } else {
            volumes[x.token_b_mint] = x._sum.volume_usd + volumes[x.token_b_mint]
        }
    })

    for (let [mint, volume] of Object.entries(volumes)) {
        if (volume < min_volume){
            delete volumes[mint]
        }
        if (STABLE_COINS.map((x) => x.toBase58()).includes(mint)){
            delete volumes[mint]
        }
        if (LIQUID_SOL.map((x) => x.toBase58()).includes(mint)){
            delete volumes[mint]
        }
        if (mint === "So11111111111111111111111111111111111111112"){
            delete volumes[mint]
        }
    }

    return volumes
}

export async function getPairPriceStatsOverInterval(mintA: string, mintB: string, hours: number): Promise<any> {
    const timeStart = Math.round((new Date()).getTime() / 1000) - 60*60*hours
    const epochMinute = Math.floor(timeStart / 60)

    const mintAPrices = await prisma.prices.findMany({
        where: {
            mint: mintA,
            epoch_minute: {
                gte: epochMinute
            },
        },
        orderBy: {
            epoch_minute: 'desc',
        },
    })

    const mintBPrices = await prisma.prices.findMany({
        where: {
            mint: mintB,
            epoch_minute: {
                gte: epochMinute
            },
        },
        orderBy: {
            epoch_minute: 'desc',
        },
    })

    const intervalMin = 1

    let intervalDict = {}
    mintAPrices.forEach((x) => intervalDict[Math.round(x.epoch_minute / intervalMin)] = {epoch_minute: x.epoch_minute, mint_a: x.mint, price_a: x.price})
    mintBPrices.forEach((x) => {
        const i = Math.round(x.epoch_minute / intervalMin)

        if (i in intervalDict) {
            intervalDict[i].mint_b = x.mint
            intervalDict[i].price_b = x.price
        } else {
            intervalDict[i] = {epoch_minute: x.epoch_minute, mint_b: x.mint, price_b: x.price}
        }
    })

    // since we're pricing off of USDC, we don't actually track the price of it, so just manually add it if needed
    if (mintA === USDC.toBase58()){
        for (let i of Object.keys(intervalDict)){
            intervalDict[i].mint_a = mintA
            intervalDict[i].price_a = 1.0
        }
    } else if (mintB === USDC.toBase58()){
        for (let i of Object.keys(intervalDict)){
            intervalDict[i].mint_b = mintB
            intervalDict[i].price_b = 1.0
        }
    }

    for (let i of Object.keys(intervalDict)){
        if (intervalDict[i].price_a && intervalDict[i].price_b){
            intervalDict[i].price_a_over_b = intervalDict[i].price_a/intervalDict[i].price_b
        }
    }

    // @ts-ignore
    const priceAOverB: number[] = Object.values(intervalDict).filter((x) => x.price_a_over_b).map((x) => x.price_a_over_b)

    return {
        min: Math.min(...priceAOverB),
        max: Math.max(...priceAOverB),
        mean: mean(priceAOverB),
        std_dev: stdDev(priceAOverB),
        latest: priceAOverB.at(-1)
    }
}

export async function bulkAddTransactions(transactions: Prisma.TransactionsCreateInput[]): Promise<void> {
    await prisma.transactions.createMany({ data: transactions, skipDuplicates: true })
}

export async function bulkAddPrices(prices: Prisma.PricesCreateInput[]): Promise<void> {
    await prisma.prices.createMany({ data: prices, skipDuplicates: true })
}

export async function bulkAddTokens(tokens: Prisma.TokensCreateInput[]): Promise<void> {
    await prisma.tokens.createMany({ data: tokens, skipDuplicates: true })
}

export async function bulkAddWhirlpools(tokens: Prisma.WhirlpoolsCreateInput[]): Promise<void> {
    await prisma.whirlpools.createMany({ data: tokens, skipDuplicates: true })
}
