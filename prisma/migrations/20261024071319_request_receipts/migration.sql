-- CreateTable
CREATE TABLE "RequestReceipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestReceipt_createdAt_idx" ON "RequestReceipt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequestReceipt_userId_key_key" ON "RequestReceipt"("userId", "key");

-- AddForeignKey
ALTER TABLE "RequestReceipt" ADD CONSTRAINT "RequestReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
