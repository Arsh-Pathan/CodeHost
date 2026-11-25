-- Reconcile live PostgreSQL schema with Prisma schema and convert RESTRICT FKs to CASCADE/SET NULL.
-- All statements are written idempotently so `prisma migrate deploy` succeeds safely on existing databases.

-- Reconcile User columns that may have been added via db push without migration
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tierExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "serverLimit" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "acceptedTos" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "marketingEmails" BOOLEAN NOT NULL DEFAULT true;

-- Create missing tables matching database/prisma/schema.prisma if not already created
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "tier" TEXT NOT NULL DEFAULT 'free',
    "containerId" TEXT,
    "port" INTEGER,
    "buildCommand" TEXT DEFAULT '',
    "startCommand" TEXT DEFAULT '',
    "dockerfileOverride" TEXT DEFAULT '',
    "envVars" JSONB DEFAULT '{}',
    "repoUrl" TEXT,
    "repoBranch" TEXT DEFAULT 'main',
    "repoSubdir" TEXT,
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Deployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT DEFAULT 'zip',
    "logs" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "referrerReward" INTEGER NOT NULL DEFAULT 50,
    "refereeReward" INTEGER NOT NULL DEFAULT 25,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "projectName" TEXT,
    "recipientName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Certified Cloud Deployer',
    "description" TEXT NOT NULL DEFAULT 'Demonstrated practical competence in cloud deployment, container orchestration, and web service management on CodeHost cloud infrastructure.',
    "framework" TEXT DEFAULT 'Cloud Virtualization & Production Services',
    "liveUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "customDomain" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- Clean empty customDomain strings before enforcing unique index
UPDATE "Project" SET "customDomain" = NULL WHERE "customDomain" = '';

-- Unique & secondary indexes
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_name_key" ON "Project"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_customDomain_key" ON "Project"("customDomain");
CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");
CREATE INDEX IF NOT EXISTS "Deployment_projectId_idx" ON "Deployment"("projectId");
CREATE INDEX IF NOT EXISTS "Deployment_status_idx" ON "Deployment"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "Referral_refereeId_key" ON "Referral"("refereeId");
CREATE INDEX IF NOT EXISTS "Referral_referrerId_idx" ON "Referral"("referrerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_certNumber_key" ON "Certificate"("certNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_userId_key" ON "Certificate"("userId");
CREATE INDEX IF NOT EXISTS "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX IF NOT EXISTS "Certificate_certNumber_idx" ON "Certificate"("certNumber");

-- Deduplicate any hypothetical duplicate razorpayPaymentId before enforcing unique index
DROP INDEX IF EXISTS "Transaction_razorpayPaymentId_idx";
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'Transaction_razorpayPaymentId_key'
    ) THEN
        UPDATE "Transaction" t
        SET "razorpayPaymentId" = t."razorpayPaymentId" || '_dup_' || t."id"
        WHERE t."razorpayPaymentId" IS NOT NULL
          AND t."id" NOT IN (
              SELECT DISTINCT ON ("razorpayPaymentId") "id"
              FROM "Transaction"
              WHERE "razorpayPaymentId" IS NOT NULL
              ORDER BY "razorpayPaymentId", "createdAt" ASC
          );
        CREATE UNIQUE INDEX "Transaction_razorpayPaymentId_key" ON "Transaction"("razorpayPaymentId");
    END IF;
END $$;

-- Convert RESTRICT foreign keys to ON DELETE CASCADE / SET NULL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Wallet_userId_fkey') THEN
        ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";
    END IF;
    ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Transaction_walletId_fkey') THEN
        ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_walletId_fkey";
    END IF;
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey"
        FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Session_userId_fkey') THEN
        ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";
    END IF;
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Project_userId_fkey') THEN
        ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";
    END IF;
    ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Deployment_projectId_fkey') THEN
        ALTER TABLE "Deployment" DROP CONSTRAINT "Deployment_projectId_fkey";
    END IF;
    ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Referral_referrerId_fkey') THEN
        ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referrerId_fkey";
    END IF;
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey"
        FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Referral_refereeId_fkey') THEN
        ALTER TABLE "Referral" DROP CONSTRAINT "Referral_refereeId_fkey";
    END IF;
    ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey"
        FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Certificate_userId_fkey') THEN
        ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_userId_fkey";
    END IF;
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Certificate_projectId_fkey') THEN
        ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_projectId_fkey";
    END IF;
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;
