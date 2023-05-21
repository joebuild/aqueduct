import type {PublicKey} from '@solana/web3.js'
import {AnchorProvider, Program} from '@project-serum/anchor'
import type {Aqueduct as AqueductIDL} from './idl/aqueduct'
import {IDL} from '$idl/aqueduct'
import {AQV1_PROGRAM_ID} from './infrastructure/constants'
import {getAllUserData, getPositions, getUserData} from './rpc/data'
import {createUser} from './rpc/createUser'
import type BN from "bn.js";
import {deposit} from "./rpc/deposit";
import {openPosition} from "./rpc/openPosition";
import {closePosition} from "./rpc/closePosition";
import {swapToUSDC} from "./rpc/swapToUSDC";
import type {Position} from "@orca-so/whirlpools-sdk/dist/whirlpool-client";
import {deleteUser} from "./rpc/deleteUser";
import {saveUserSettings} from "./rpc/saveUserSettings";
import type {UserData} from "./types/stores";
import { withdrawUSDC } from './rpc/withdrawUSDC'
import {withdrawRewards} from "./rpc/withdrawRewards";

export type AqueductClientOptions = {
    network?: string,
    api?: boolean,
};

const DEFAULT_OPTIONS = {
	network: 'mainnet-beta',
    api: false,
}

export class AqueductClient {
    public readonly provider: AnchorProvider;

    public readonly program: Program<AqueductIDL>;

    public readonly options: AqueductClientOptions;

    constructor (provider: AnchorProvider, options: AqueductClientOptions = DEFAULT_OPTIONS) {
    	this.provider = provider
    	this.program = new Program<AqueductIDL>(IDL, AQV1_PROGRAM_ID, provider)
    	this.options = options
    }

    async createUser () {
        return await createUser(
            this.program,
            this.provider
        )
    }

    async saveSettings (whirlpool: PublicKey, isPaused: boolean) {
        return await saveUserSettings(
            this.program,
            this.provider,
            whirlpool,
            isPaused
        )
    }

    async deleteUser () {
        return await deleteUser(
            this.program,
            this.provider
        )
    }

    async getUser (
        userAddr?: PublicKey
    ): Promise<UserData> {
        return await getUserData(
            this.program,
            userAddr ? userAddr : this.provider.wallet.publicKey
        )
    }

    async getAllUsers (): Promise<UserData[]> {
        return await getAllUserData(this.program)
    }

    async deposit(amount: BN) {
        return await deposit(
            this.program,
            this.provider,
            amount
        )
    }

    async withdrawUSDC(amount: BN) {
        return await withdrawUSDC(
            this.program,
            this.provider,
            amount
        )
    }

    async withdrawRewards() {
        return await withdrawRewards(
            this.program,
            this.provider
        )
    }

    async swapToUSDC(
        whirlpool: PublicKey,
        userAddr?: PublicKey,
    ) {
        return await swapToUSDC(
            this.program,
            this.provider,
            whirlpool,
            userAddr ? userAddr : this.provider.wallet.publicKey
        )
    }

    async openPosition(
        whirlpool: PublicKey,
        userAddr?: PublicKey,
    ) {
        return await openPosition(
            this.program,
            this.provider,
            whirlpool,
            userAddr ? userAddr : this.provider.wallet.publicKey
        )
    }

    async getPositions(
        userAddr?: PublicKey,
    ): Promise<Position[]> {
        return await getPositions(
            this.program,
            this.provider,
            userAddr ? userAddr : this.provider.wallet.publicKey
        )
    }

    async closePosition(
        whirlpool: PublicKey,
        positionMint: PublicKey,
        userAddr?: PublicKey,
    ) {
        return await closePosition(
            this.program,
            this.provider,
            whirlpool,
            positionMint,
            userAddr ? userAddr : this.provider.wallet.publicKey
        )
    }

}
