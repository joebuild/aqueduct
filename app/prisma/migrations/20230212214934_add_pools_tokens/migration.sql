/*
  Warnings:

  - You are about to drop the column `token_a_decimals` on the `Transactions` table. All the data in the column will be lost.
  - You are about to drop the column `token_b_decimals` on the `Transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Transactions" DROP COLUMN "token_a_decimals",
DROP COLUMN "token_b_decimals";

-- CreateTable
CREATE TABLE "Whirlpools" (
    "address" TEXT NOT NULL,
    "token_a" TEXT NOT NULL,
    "token_b" TEXT NOT NULL,
    "total_liquidity_usd" DOUBLE PRECISION,

    CONSTRAINT "Whirlpools_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Tokens" (
    "mint" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "approved_to_trade" BOOLEAN,
    "max_allocation_percent" DOUBLE PRECISION,

    CONSTRAINT "Tokens_pkey" PRIMARY KEY ("mint")
);

-- CreateIndex
CREATE UNIQUE INDEX "Whirlpools_address_key" ON "Whirlpools"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Tokens_mint_key" ON "Tokens"("mint");
