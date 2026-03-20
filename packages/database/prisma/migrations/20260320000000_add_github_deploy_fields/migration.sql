-- AlterTable
ALTER TABLE "Project" ADD COLUMN "repoUrl" TEXT,
ADD COLUMN "repoBranch" TEXT DEFAULT 'main',
ADD COLUMN "repoSubdir" TEXT;

-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN "source" TEXT DEFAULT 'zip';
