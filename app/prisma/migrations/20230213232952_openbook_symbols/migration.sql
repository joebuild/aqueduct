/*
  Warnings:

  - Added the required column `base_symbol` to the `Openbooks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quote_symbol` to the `Openbooks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Openbooks" ADD COLUMN     "base_symbol" TEXT NOT NULL,
ADD COLUMN     "quote_symbol" TEXT NOT NULL;
