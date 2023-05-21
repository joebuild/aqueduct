-- CreateTable
CREATE TABLE "Transactions" (
    "tx_id" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "s3_source_file" TEXT NOT NULL,
    "token_a_mint" TEXT NOT NULL,
    "token_a_decimals" INTEGER NOT NULL,
    "token_a_amount" BIGINT NOT NULL,
    "token_b_mint" TEXT NOT NULL,
    "token_b_decimals" INTEGER NOT NULL,
    "token_b_amount" BIGINT NOT NULL,
    "price_a_per_b" DOUBLE PRECISION NOT NULL,
    "price_b_per_a" DOUBLE PRECISION NOT NULL,
    "volume_usd" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("tx_id")
);

-- CreateTable
CREATE TABLE "Prices" (
    "epoch_minute" INTEGER NOT NULL,
    "token_a_mint" TEXT NOT NULL,
    "token_b_mint" TEXT NOT NULL,
    "price_a_per_b" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Prices_pkey" PRIMARY KEY ("epoch_minute","token_a_mint","token_b_mint")
);

-- CreateTable
CREATE TABLE "Volumes" (
    "epoch_minute" INTEGER NOT NULL,
    "token_a_mint" TEXT NOT NULL,
    "token_b_mint" TEXT NOT NULL,
    "volume_usd" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Volumes_pkey" PRIMARY KEY ("epoch_minute","token_a_mint","token_b_mint")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transactions_tx_id_key" ON "Transactions"("tx_id");

-- CreateIndex
CREATE UNIQUE INDEX "Prices_epoch_minute_token_a_mint_token_b_mint_key" ON "Prices"("epoch_minute", "token_a_mint", "token_b_mint");

-- CreateIndex
CREATE UNIQUE INDEX "Volumes_epoch_minute_token_a_mint_token_b_mint_key" ON "Volumes"("epoch_minute", "token_a_mint", "token_b_mint");
