-- Add status_updated_at column to track when guest status was last changed
ALTER TABLE "guests" ADD COLUMN "status_updated_at" TIMESTAMPTZ(6);

-- Initialize existing rows: set status_updated_at to created_at for pending/no_reply guests,
-- and to now() for guests with other statuses (since we don't know when they changed)
UPDATE "guests" SET "status_updated_at" = "created_at" WHERE "status" IN ('pending', 'no_reply');
UPDATE "guests" SET "status_updated_at" = NOW() WHERE "status" NOT IN ('pending', 'no_reply') AND "status_updated_at" IS NULL;

-- Make the column NOT NULL with a default
ALTER TABLE "guests" ALTER COLUMN "status_updated_at" SET DEFAULT NOW();
ALTER TABLE "guests" ALTER COLUMN "status_updated_at" SET NOT NULL;

-- Add index for querying recent status changes
CREATE INDEX "guests_event_id_status_updated_at_idx" ON "guests"("event_id", "status_updated_at" DESC);
