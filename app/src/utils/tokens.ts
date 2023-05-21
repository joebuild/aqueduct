import {Connection, PublicKey} from '@solana/web3.js'
import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import BN from "bn.js";
import type {AnchorProvider} from "@project-serum/anchor";

export const getTokenBalance = async (
    connection: Connection,
    mint: PublicKey,
    walletAddr: PublicKey
): Promise<BN> => {
    try {
        const [ata] = getATA(mint, walletAddr);

        return new BN((
            await connection.getTokenAccountBalance(ata)
        ).value.amount);
    } catch (err){
        // if the ATA doesn't exist?
        return new BN(0)
    }
};

export const getNativeTokenBalance = async (
    connection: Connection,
    walletAddr: PublicKey
): Promise<BN> => {
    return new BN((
        await connection.getBalance(walletAddr)
    ));
};

export const getATA = (mint: PublicKey, owner: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
}

