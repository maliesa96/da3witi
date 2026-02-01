-- Add individual timestamp columns for each status to preserve full history
ALTER TABLE "guests" ADD COLUMN "sent_at" TIMESTAMPTZ(6);
ALTER TABLE "guests" ADD COLUMN "delivered_at" TIMESTAMPTZ(6);
ALTER TABLE "guests" ADD COLUMN "read_at" TIMESTAMPTZ(6);
ALTER TABLE "guests" ADD COLUMN "confirmed_at" TIMESTAMPTZ(6);
ALTER TABLE "guests" ADD COLUMN "declined_at" TIMESTAMPTZ(6);

-- Migrate data from status_updated_at to the appropriate column based on current status
UPDATE "guests" SET "sent_at" = "status_updated_at" WHERE "status" = 'sent';
UPDATE "guests" SET "delivered_at" = "status_updated_at" WHERE "status" = 'delivered';
UPDATE "guests" SET "read_at" = "status_updated_at" WHERE "status" = 'read';
UPDATE "guests" SET "confirmed_at" = "status_updated_at" WHERE "status" = 'confirmed';
UPDATE "guests" SET "declined_at" = "status_updated_at" WHERE "status" = 'declined';

-- Drop the old status_updated_at column and its index
DROP INDEX IF EXISTS "guests_event_id_status_updated_at_idx";
ALTER TABLE "guests" DROP COLUMN "status_updated_at";

-- Add partial indexes for querying recent activity by each status type
CREATE INDEX "guests_event_id_sent_at_idx" ON "guests"("event_id", "sent_at" DESC) WHERE "sent_at" IS NOT NULL;
CREATE INDEX "guests_event_id_delivered_at_idx" ON "guests"("event_id", "delivered_at" DESC) WHERE "delivered_at" IS NOT NULL;
CREATE INDEX "guests_event_id_read_at_idx" ON "guests"("event_id", "read_at" DESC) WHERE "read_at" IS NOT NULL;
CREATE INDEX "guests_event_id_confirmed_at_idx" ON "guests"("event_id", "confirmed_at" DESC) WHERE "confirmed_at" IS NOT NULL;
CREATE INDEX "guests_event_id_declined_at_idx" ON "guests"("event_id", "declined_at" DESC) WHERE "declined_at" IS NOT NULL;
