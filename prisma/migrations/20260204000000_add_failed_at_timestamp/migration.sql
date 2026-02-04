-- Add failedAt timestamp column to track when an invite failed
ALTER TABLE "guests" ADD COLUMN "failed_at" TIMESTAMPTZ(6);
