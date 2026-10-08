-- CreateTable
CREATE TABLE "AdminUserNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSegment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminUserNote_userId_createdAt_idx" ON "AdminUserNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserTag_tag_idx" ON "UserTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "UserTag_userId_tag_key" ON "UserTag"("userId", "tag");

-- CreateIndex
CREATE INDEX "AdminSegment_createdAt_idx" ON "AdminSegment"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminUserNote" ADD CONSTRAINT "AdminUserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserNote" ADD CONSTRAINT "AdminUserNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTag" ADD CONSTRAINT "UserTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
