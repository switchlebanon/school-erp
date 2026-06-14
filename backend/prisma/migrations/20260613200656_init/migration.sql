/*
  Warnings:

  - You are about to drop the column `paidAmount` on the `fee_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `paidDate` on the `fee_invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fee_invoices" DROP COLUMN "paidAmount",
DROP COLUMN "paidDate",
ADD COLUMN     "totalPaid" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fee_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
