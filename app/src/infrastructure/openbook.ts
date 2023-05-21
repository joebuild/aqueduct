import {type Account, PublicKey, sendAndConfirmTransaction, Transaction} from '@solana/web3.js';
import {decodeEventQueue, DexInstructions, Market} from '@openbook-dex/openbook';
import {MY_ACCOUNT, MY_WALLET, OPENBOOK_PROGRAM_ID} from "./constants";
import {getATA} from "../utils/tokens";
import BN from "bn.js";
// @ts-ignore
import {getOrCreateAssociatedTokenAccount, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {getMultipleAccounts, sleep} from "./utils";

export enum OrderSide {
    BUY = 'buy',
    SELL = 'sell',
}

export async function cancelOpenbookOrders(openbooks, connection): Promise<any> {
    for (let ob of openbooks){
        let market = await getMarket(connection, new PublicKey(ob.address))
        let myOrders = await market.loadOrdersForOwner(connection, MY_ACCOUNT.publicKey);
        for (let order of myOrders) {
            await market.cancelOrder(connection, MY_ACCOUNT, order);
        }
    }

    console.log('Cancelled standing Openbook orders..')
}

export async function settleOpenbookFunds(openbooks, connection): Promise<any> {
    for (let ob of openbooks) {
        let market = await getMarket(connection, new PublicKey(ob.address))
        for (let openOrders of await market.findOpenOrdersAccountsForOwner(
            connection,
            MY_ACCOUNT.publicKey,
        )) {
            if (openOrders.baseTokenFree.gt(new BN(0)) || openOrders.quoteTokenFree.gt(new BN(0))) {
                let baseTokenAccount = getATA(new PublicKey(ob.base_mint), MY_ACCOUNT.publicKey)[0]
                let quoteTokenAccount = getATA(new PublicKey(ob.quote_mint), MY_ACCOUNT.publicKey)[0]

                let retryIndex = 0
                let numRetries = 3
                let failed = true

                if (retryIndex > 0){
                    console.log('Retry #', retryIndex)
                }

                while (failed && retryIndex < numRetries){
                    await market.settleFunds(
                        connection,
                        MY_ACCOUNT,
                        openOrders,
                        baseTokenAccount,
                        quoteTokenAccount,
                    ).then(
                        (value) => { failed = false },
                        (error) => {
                            console.error(`Settle funds on market ${ob.address} failed! Retrying..`)
                            console.log(error)
                        },
                    )

                    retryIndex += 1
                }


            }
        }
    }

    console.log('Settled Openbook funds..')
}

export async function crankAllMarkets(openbooks, connection): Promise<any> {
    const markets = await Promise.all(openbooks.map((ob) => getMarket(connection, new PublicKey(ob.address))))

    const quoteWallets = (await Promise.all(
        markets.map((m) => {
            return getOrCreateAssociatedTokenAccount(
                connection,
                MY_WALLET,
                m.quoteMintAddress,
                MY_WALLET.publicKey
            )
        }),
    )).map((x) => x.address)

    const baseWallets = (await Promise.all(
        markets.map((m) => {
            return getOrCreateAssociatedTokenAccount(
                connection,
                MY_WALLET,
                m.baseMintAddress,
                MY_WALLET.publicKey
            )
        }),
    )).map((x) => x.address)

    const eventQueuePks = markets.map((market) => market['_decoded'].eventQueue)
    const eventQueueAccts = await getMultipleAccounts(connection, eventQueuePks);

    for (let i = 0; i < eventQueueAccts.length; i++) {
        const accountInfo = eventQueueAccts[i].accountInfo;
        const events = decodeEventQueue(accountInfo.data);

        if (events.length === 0) {
            continue;
        }

        const accounts: Set<string> = new Set()
        for (const event of events) {
            accounts.add(event.openOrders.toBase58());
            if (accounts.size >= 10) {
                break;
            }
        }

        const openOrdersAccounts = [...accounts]
            .map((s) => new PublicKey(s))
            .sort((a, b) => a.toBuffer().swap64().compare(b.toBuffer().swap64()))

        const instr = DexInstructions.consumeEvents({
            market: markets[i].publicKey,
            eventQueue: markets[i]['_decoded'].eventQueue,
            coinFee: baseWallets[i],
            pcFee: quoteWallets[i],
            openOrdersAccounts,
            limit: new BN(30),
            programId: OPENBOOK_PROGRAM_ID,
        })

        let tx = new Transaction()
        tx = tx.add(instr)

        console.log(`About to crank market ${i}:${markets[i].publicKey.toBase58()}..`)

        try {
            await sendAndConfirmTransaction(
                connection,
                tx,
                [MY_WALLET],
            )
        } catch (err){
            console.log(err)
        }

        console.log(`Cranked market ${i}:${markets[i].publicKey.toBase58()}..`)

        await sleep(500)
    }
}

export async function placeOrder(priceReadable: number, sizeReadable: number, side: OrderSide, market: Market, account: Account, connection): Promise<string> {
    priceReadable = side == OrderSide.BUY ? market.tickSize * Math.floor(priceReadable/market.tickSize) : market.tickSize * Math.ceil(priceReadable/market.tickSize)

    const ata = side === OrderSide.BUY ? getATA(market.quoteMintAddress, account.publicKey)[0] : getATA(market.baseMintAddress, account.publicKey)[0]

    const orderParams = {
        side: side,
        price: priceReadable,
        size: sizeReadable,
        orderType: 'postOnly',
    }

    console.log(orderParams)

    return await market.placeOrder(connection, {
        owner: account,
        payer: ata,
        side: side,
        price: priceReadable,
        size: sizeReadable,
        orderType: 'postOnly',
    });
}

export async function getMarket(connection, marketAddress){
    return await Market.load(connection, marketAddress, {}, OPENBOOK_PROGRAM_ID);
}

export function roundReadableTokenAmountToDecimals(amountReadable: number, tokenDecimals: number): number {
    return Math.round(amountReadable * 10 ** tokenDecimals) / 10 ** tokenDecimals
}
