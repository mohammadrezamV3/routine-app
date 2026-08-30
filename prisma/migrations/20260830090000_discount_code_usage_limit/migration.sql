-- AlterTable
ALTER TABLE "DiscountCode" ADD COLUMN     "maxUsesPerUser" INTEGER;

-- CreateTable
CREATE TABLE "DiscountCodeUsage" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountCodeUsage_discountCodeId_userId_idx" ON "DiscountCodeUsage"("discountCodeId", "userId");

-- AddForeignKey
ALTER TABLE "DiscountCodeUsage" ADD CONSTRAINT "DiscountCodeUsage_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
