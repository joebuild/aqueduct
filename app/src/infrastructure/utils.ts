// @ts-ignore
import {createAssociatedTokenAccountInstruction, createSyncNativeInstruction, NATIVE_MINT} from "@solana/spl-token";
import {
    type AccountInfo,
    type Commitment,
    Connection,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction
} from "@solana/web3.js";
import {getATA, getNativeTokenBalance} from "../utils/tokens";
import {MY_WALLET} from "./constants";

export async function wrapAllSol(wallet, provider){
    const lamportsAbove1Sol = (await getNativeTokenBalance(provider.connection, wallet.publicKey)).toNumber() - 10 ** 9
    if (lamportsAbove1Sol > 0){
        return await wrapSol(lamportsAbove1Sol, wallet, provider.connection)
    }
}

export async function wrapSol(lamports, wallet, connection){
    const address = MY_WALLET.publicKey
    const ata = getATA(NATIVE_MINT, address)[0]
    const balance = (await connection.getTokenAccountBalance(ata)).value.uiAmount

    let createAccount = false
    if (balance == 0){
        createAccount = true
    }

    let tx = new Transaction()

    if (createAccount){
        tx = tx.add(
            createAssociatedTokenAccountInstruction(
                address,
                ata,
                address,
                NATIVE_MINT
            )
        )
    }
    tx = tx.add(
        SystemProgram.transfer({
            fromPubkey: address,
            toPubkey: ata,
            lamports: lamports,
        }),
        createSyncNativeInstruction(ata)
    )

    return await sendAndConfirmTransaction(
        connection,
        tx,
        [MY_WALLET],
    )
}

export async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getMultipleAccounts(
    connection: Connection,
    publicKeys: PublicKey[],
    commitment?: Commitment,
): Promise<
    {
        publicKey: PublicKey;
        context: { slot: number };
        accountInfo: AccountInfo<Buffer>;
    }[]
    > {
    const len = publicKeys.length;
    if (len === 0) {
        return [];
    }
    if (len > 100) {
        const mid = Math.floor(publicKeys.length / 2);
        return Promise.all([
            getMultipleAccounts(connection, publicKeys.slice(0, mid), commitment),
            getMultipleAccounts(connection, publicKeys.slice(mid, len), commitment),
        ]).then((a) => a[0].concat(a[1]));
    }
    const publicKeyStrs = publicKeys.map((pk) => pk.toBase58());
    // load connection commitment as a default
    commitment ||= connection.commitment;

    const args = commitment ? [publicKeyStrs, { commitment }] : [publicKeyStrs];
    // @ts-ignore
    const resp = await connection._rpcRequest('getMultipleAccounts', args);
    if (resp.error) {
        throw new Error(resp.error.message);
    }
    if (resp.result) {
        const nullResults = resp.result.value.filter((r) => r?.account === null);
        if (nullResults.length > 0)
            throw new Error(
                `gma returned ${
                    nullResults.length
                } null results. ex: ${nullResults[0]?.pubkey.toString()}`,
            );
    }
    return resp.result.value.map(
        ({ data, executable, lamports, owner }, i: number) => ({
            publicKey: publicKeys[i],
            context: resp.result.context,
            accountInfo: {
                data: Buffer.from(data[0], 'base64'),
                executable,
                owner: new PublicKey(owner),
                lamports,
            },
        }),
    );
}
