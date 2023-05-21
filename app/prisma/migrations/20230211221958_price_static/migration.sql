/*
  Warnings:

  - The primary key for the `Prices` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `price_a_per_b` on the `Prices` table. All the data in the column will be lost.
  - You are about to drop the column `token_a_mint` on the `Prices` table. All the data in the column will be lost.
  - You are about to drop the column `token_b_mint` on the `Prices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[epoch_minute,mint]` on the table `Prices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mint` to the `Prices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `Prices` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Prices_epoch_minute_token_a_mint_token_b_mint_key";

-- AlterTable
ALTER TABLE "Prices" DROP CONSTRAINT "Prices_pkey",
DROP COLUMN "price_a_per_b",
DROP COLUMN "token_a_mint",
DROP COLUMN "token_b_mint",
ADD COLUMN     "mint" TEXT NOT NULL,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD CONSTRAINT "Prices_pkey" PRIMARY KEY ("epoch_minute", "mint");

-- CreateIndex
CREATE UNIQUE INDEX "Prices_epoch_minute_mint_key" ON "Prices"("epoch_minute", "mint");
