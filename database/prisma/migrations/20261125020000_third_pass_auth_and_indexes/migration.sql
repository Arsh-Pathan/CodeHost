-- Third-pass audit: auth revocation, password reset, missing indexes, and Transaction->Project FK.
-- All statements are written idempotently so `prisma migrate deploy` runs cleanly on any database state.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetPasswordExpiry" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_resetPasswordToken_key" ON "User"("resetPasswordToken");
CREATE INDEX IF NOT EXISTS "User_tierExpiresAt_idx" ON "User"("tierExpiresAt");
CREATE INDEX IF NOT EXISTS "Project_tier_status_updatedAt_idx" ON "Project"("tier", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "Transaction_walletId_idx" ON "Transaction"("walletId");
CREATE INDEX IF NOT EXISTS "Transaction_walletId_type_projectId_createdAt_idx"
    ON "Transaction"("walletId", "type", "projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "Deployment_projectId_createdAt_idx" ON "Deployment"("projectId", "createdAt" DESC);

DROP INDEX IF EXISTS "Certificate_userId_idx";
DROP INDEX IF EXISTS "Certificate_certNumber_idx";

UPDATE "Transaction" t
SET "projectId" = NULL
WHERE t."projectId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = t."projectId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Transaction_projectId_fkey'
    ) THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
