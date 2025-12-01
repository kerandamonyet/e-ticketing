/*
  Warnings:

  - The primary key for the `AdminAuditLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EoAuditLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EoVerification` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "EoVerification" DROP CONSTRAINT "EoVerification_userId_fkey";

-- AlterTable
ALTER TABLE "AdminAuditLog" DROP CONSTRAINT "AdminAuditLog_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "adminId" SET DATA TYPE TEXT,
ALTER COLUMN "targetId" SET DATA TYPE TEXT,
ADD CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "AdminAuditLog_id_seq";

-- AlterTable
ALTER TABLE "EoAuditLog" DROP CONSTRAINT "EoAuditLog_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "eoId" SET DATA TYPE TEXT,
ALTER COLUMN "actorId" SET DATA TYPE TEXT,
ADD CONSTRAINT "EoAuditLog_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EoAuditLog_id_seq";

-- AlterTable
ALTER TABLE "EoVerification" DROP CONSTRAINT "EoVerification_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "EoVerification_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EoVerification_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AddForeignKey
ALTER TABLE "EoVerification" ADD CONSTRAINT "EoVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EoAuditLog" ADD CONSTRAINT "EoAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
