import {HELIUS_API_KEY, JUPITER_PROGRAM_ID} from "./constants";
import type {PublicKey} from "@solana/web3.js";
import axios from "axios";

export const getTxAtTimestamp = async (
    timestamp: number,
    account: PublicKey = JUPITER_PROGRAM_ID,
    apiKey: string = HELIUS_API_KEY
): Promise<void> => {
    const url = `https://api.helius.xyz/v1/raw-transactions?api-key=${apiKey}`

    const { data } = await axios.post(url, {
        query: {
            accounts: [account.toBase58()],
            startTime: timestamp - 30,
            endTime: timestamp
        },
        options: {
            limit: 1,
        }
    });

    return data.result[0].transaction.signatures[0]
}

export const getSwapTxHistory = async (
    timestamp: number,
    account: PublicKey = JUPITER_PROGRAM_ID,
    apiKey: string = HELIUS_API_KEY
): Promise<string[]> => {
    const sinceTx = await getTxAtTimestamp(timestamp, account, apiKey)

    let oldestTransaction = '';
    let transactions = [];

    while (true) {
        try {
            const url = `https://api.helius.xyz/v0/addresses/${account.toBase58()}/transactions?api-key=${apiKey}&until=${sinceTx}&before=${oldestTransaction}&type=SWAP`
            const {data} = await axios.get(url);
            if (data.length === 0) {
                return transactions;
            }
            oldestTransaction = data[data.length - 1].signature;
            data.forEach((d) => transactions.push(JSON.stringify(d, null, 0)))
        } catch (e){
            return transactions;
        }
    }
}


// console.log('\n== Account Data ==')
// console.log(d.accountData)

// let swaps = []
// console.log('\n== Inner Account Data Balance Changes ==')
// d.accountData.forEach((inad) => {
//   if (inad.tokenBalanceChanges.length > 0){
//     swaps.push(inad.tokenBalanceChanges)
//   }
// })
// console.log(JSON.stringify(swaps, null, 0));

// console.log('\n== Instructions ==')
// console.log(d.instructions)
//
// console.log('\n== Inner Instructions ==')
// d.instructions.forEach((inix) => {
//   console.log(inix)
// })

// 1676000255
//
// 1676000530
// 1676000527
// 1676000526
// 1676000524
// 1676000520
// 1676000520
// 1676000520
// 1676000512
