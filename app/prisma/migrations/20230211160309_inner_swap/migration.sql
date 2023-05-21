/*
  Warnings:

  - The primary key for the `Transactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[tx_id,inner_swap_index]` on the table `Transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `inner_swap_index` to the `Transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Transactions_tx_id_key";

-- AlterTable
ALTER TABLE "Transactions" DROP CONSTRAINT "Transactions_pkey",
ADD COLUMN     "inner_swap_index" INTEGER NOT NULL,
ADD CONSTRAINT "Transactions_pkey" PRIMARY KEY ("tx_id", "inner_swap_index");

-- CreateIndex
CREATE UNIQUE INDEX "Transactions_tx_id_inner_swap_index_key" ON "Transactions"("tx_id", "inner_swap_index");
