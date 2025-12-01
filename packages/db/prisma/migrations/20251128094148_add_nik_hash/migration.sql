/*
  Warnings:

  - A unique constraint covering the columns `[nikHash]` on the table `EoVerification` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nikHash` to the `EoVerification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EoVerification" ADD COLUMN     "nikHash" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EoAuditLog" (
    "id" SERIAL NOT NULL,
    "eoId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" INTEGER,
    "actorRole" TEXT,
    "note" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EoAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EoVerification_nikHash_key" ON "EoVerification"("nikHash");
