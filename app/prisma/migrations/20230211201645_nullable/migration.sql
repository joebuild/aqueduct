-- AlterTable
ALTER TABLE "Transactions" ALTER COLUMN "token_a_decimals" DROP NOT NULL,
ALTER COLUMN "token_b_decimals" DROP NOT NULL,
ALTER COLUMN "volume_usd" DROP NOT NULL;
