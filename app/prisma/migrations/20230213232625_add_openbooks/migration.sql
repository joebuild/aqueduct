-- CreateTable
CREATE TABLE "Openbooks" (
    "address" TEXT NOT NULL,
    "quote_mint" TEXT NOT NULL,
    "base_mint" TEXT NOT NULL,

    CONSTRAINT "Openbooks_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "Openbooks_address_key" ON "Openbooks"("address");
