-- Add failedAt timestamp column to track when an invite failed
ALTER TABLE "guests" ADD COLUMN "failed_at" TIMESTAMPTZ(6);

-- Backfill existing failed guests with current timestamp
-- (we don't have the actual failure time, so use NOW() to ensure they appear in activity)
UPDATE "guests" 
SET "failed_at" = NOW()
WHERE "status" = 'failed' AND "failed_at" IS NULL;
