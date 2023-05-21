import {writable} from 'svelte/store';
import type {AqueductClient} from "../AqueductClient";
import type {WhirlpoolClient} from "@orca-so/whirlpools-sdk";

export const client = writable<AqueductClient>(undefined);

export const whirlpoolClient = writable<WhirlpoolClient>(undefined);
