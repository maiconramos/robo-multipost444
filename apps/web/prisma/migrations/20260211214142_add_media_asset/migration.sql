-- CreateTable
CREATE TABLE "media_asset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT,
    "provider" TEXT,
    "filename" TEXT,
    "contentType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_asset_workspaceId_createdAt_idx" ON "media_asset"("workspaceId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
