import {MY_WALLET} from "./constants";
import {PublicKey, sendAndConfirmRawTransaction} from '@solana/web3.js';
const cluster = "mainnet-beta"

export async function jupiterMarketOrder(connection, inputMintString, outputMintString, inputAmount){
    let { Jupiter } = require('@jup-ag/core')
    let JSBI = require('jsbi')

    const jupiter = await Jupiter.load({
        connection,
        cluster,
        user: MY_WALLET, // or public key
        // platformFeeAndAccounts:  NO_PLATFORM_FEE,
        // routeCacheDuration: CACHE_DURATION_MS
        // wrapUnwrapSOL: true (default) | false
    });

    const routes = await jupiter.computeRoutes({
        inputMint: new PublicKey(inputMintString),
        outputMint: new PublicKey(outputMintString),
        amount: JSBI.BigInt(inputAmount), // 1000000 => 1 USDC if inputToken.address is USDC mint.
        slippageBps: 5  // 1 bps = 0.01%.
        // forceFetch (optional) => to force fetching routes and not use the cache.
        // intermediateTokens => if provided will only find routes that use the intermediate tokens.
        // feeBps => the extra fee in BPS you want to charge on top of this swap.
        // onlyDirectRoutes =>  Only show single hop routes.
        // swapMode => "ExactIn" | "ExactOut" Defaults to "ExactIn"  "ExactOut" is to support use cases like payments when you want an exact output amount.
        // enforceSingleTx =>  Only show routes where only one single transaction is used to perform the Jupiter swap.
    });

    let bestRoute = routes.routesInfos[0]
    const { execute } = await jupiter.exchange({
        routeInfo: bestRoute
    });

    // Execute swap
    const swapResult: any = await execute();

    if (swapResult.error) {
        console.log(swapResult.error);
    } else {
        console.log(`https://explorer.solana.com/tx/${swapResult.txid}`);
        console.log(`inputAddress=${swapResult.inputAddress.toString()} outputAddress=${swapResult.outputAddress.toString()}`);
        console.log(`inputAmount=${swapResult.inputAmount} outputAmount=${swapResult.outputAmount}`);
    }
}
