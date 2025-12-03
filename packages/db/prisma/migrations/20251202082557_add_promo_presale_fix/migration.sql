/*
  Warnings:

  - You are about to drop the column `eOId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `eOTeamMemberId` on the `ScanLog` table. All the data in the column will be lost.
  - Added the required column `type` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketTypeId` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('OFFLINE', 'ONLINE');

-- CreateEnum
CREATE TYPE "PromoDiscountType" AS ENUM ('PERCENT', 'AMOUNT');

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_eOId_fkey";

-- DropForeignKey
ALTER TABLE "ScanLog" DROP CONSTRAINT "ScanLog_eOTeamMemberId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_eventId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "eOId",
DROP COLUMN "location",
ADD COLUMN     "banner" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "saleEnd" TIMESTAMP(3),
ADD COLUMN     "saleStart" TIMESTAMP(3),
ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ticketLimit" INTEGER,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
ADD COLUMN     "type" "EventType" NOT NULL;

-- AlterTable
ALTER TABLE "ScanLog" DROP COLUMN "eOTeamMemberId";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "ticketTypeId" TEXT NOT NULL,
ALTER COLUMN "eventId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EventLocation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mapLink" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOnlineLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOnlineLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketType" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quota" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presale" (
    "id" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quota" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promo" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "PromoDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "quota" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoTicketType" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,

    CONSTRAINT "PromoTicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoUser" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PromoUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketType_eventId_idx" ON "TicketType"("eventId");

-- CreateIndex
CREATE INDEX "Presale_ticketTypeId_idx" ON "Presale"("ticketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Promo_code_key" ON "Promo"("code");

-- CreateIndex
CREATE INDEX "Promo_eventId_idx" ON "Promo"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoTicketType_promoId_ticketTypeId_key" ON "PromoTicketType"("promoId", "ticketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoUser_promoId_userId_key" ON "PromoUser"("promoId", "userId");

-- CreateIndex
CREATE INDEX "Event_eoId_idx" ON "Event"("eoId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_startDate_status_idx" ON "Event"("startDate", "status");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_ticketTypeId_idx" ON "Ticket"("ticketTypeId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_eoId_fkey" FOREIGN KEY ("eoId") REFERENCES "EO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLocation" ADD CONSTRAINT "EventLocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventOnlineLink" ADD CONSTRAINT "EventOnlineLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presale" ADD CONSTRAINT "Presale_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promo" ADD CONSTRAINT "Promo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoTicketType" ADD CONSTRAINT "PromoTicketType_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "Promo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoTicketType" ADD CONSTRAINT "PromoTicketType_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoUser" ADD CONSTRAINT "PromoUser_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "Promo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoUser" ADD CONSTRAINT "PromoUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "EOTeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
