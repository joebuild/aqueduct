import {Account, Keypair, PublicKey} from '@solana/web3.js'
import web3 from "@solana/web3.js";
import {Percentage} from "@orca-so/common-sdk";

export const HELIUS_API_KEY = '6c6fca26-5cd8-40f5-a255-02c9cbe3143a'
export const NETWORK = `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`

export const JUPITER_PROGRAM_ID = new PublicKey('JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB')
export const WHIRLPOOL_PROGRAM_ID = new PublicKey("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");
export const OPENBOOK_PROGRAM_ID = new PublicKey("srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX");

export const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const USDC_DECIMALS = 6

const USDT      = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")
const whUSDT    = new PublicKey("Dn4noZ5jgGfkntzcQSUZ8czkreiZ1ForXYoV2H8Dm7S1")
const whUSDC    = new PublicKey("A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM")
const USP       = new PublicKey("UXPhBoR3qG4UCiGNJfV7MqhHyFqKN68g45GoYvAeL2M")
const USDH      = new PublicKey("USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX")
const USDr      = new PublicKey("USDrbBQwQbQ2oWHUPfA8QBHcyVxKUq1xHyXsSLKdUq2")
const UXD       = new PublicKey("7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT")
const abUSDT    = new PublicKey("E77cpQ4VncGmcAXX16LHFFzNBEBb2U7Ar7LBmZNfCgwL")

export const STABLE_COINS = [USDC, USDT, whUSDT, whUSDC, USP, USDH, USDr, UXD, abUSDT]

export const WRAPPED_SOL = new PublicKey("So11111111111111111111111111111111111111112")
export const WRAPPED_SOL_DECIMALS = 9

const mSOL      = new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So")
const lidoSOL   = new PublicKey("7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj")
const jitoSOL   = new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn")
const bSOL      = new PublicKey("bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1")

export const LIQUID_SOL = [lidoSOL, mSOL, jitoSOL, bSOL]

export const DEFAULT_QUOTE_TOKEN = USDC
export const DEFAULT_QUOTE_TOKEN_DECIMALS = USDC_DECIMALS

export const MIN_JUPITER_VOLUME_USD = 10000
export const JUPITER_VOLUME_INTERVAL_HOURS = 24

export const DEFAULT_INTERVAL_HOURS = 24 * 30

export const DEFAULT_RANGE_ADJUSTMENT = 0.1
export const DEFAULT_MIN_PERCENT_AWAY_FROM_LATEST = 0.01

export const DEFAULT_SLIPPAGE_TOLERANCE = Percentage.fromFraction(5, 100)

export const OPENBOOK_SMALLEST_ORDER_USD = 50
export const WHIRLPOOL_SMALLEST_POSITION_USD = 50

export const PERCENT_OF_TOKENS_FOR_WP_FUDGE_FACTOR = 0.75

export const MAX_SINGLE_TOKEN_ALLOCATION = 0.15

export const GREEDY_BLOATED_TOKEN_FORGIVENESS_FACTOR = 0.1

export const DEFAULT_VOL_TO_LIQ = 1.0
export const MAX_VOL_TO_LIQ = 50

export const JUPITER_MARKET_ORDER_PROPORTION = 0.01

export const MY_WALLET = Keypair.fromSecretKey(new Uint8Array([62,112,245,118,248,169,104,208,219,171,171,216,117,20,78,7,117,59,213,11,35,28,141,59,219,33,93,37,188,102,169,248,10,201,13,3,180,114,251,6,85,210,92,2,208,147,54,47,255,177,162,110,223,38,161,140,195,144,171,237,174,44,198,222]));
export const MY_ACCOUNT = new Account(MY_WALLET.secretKey)
