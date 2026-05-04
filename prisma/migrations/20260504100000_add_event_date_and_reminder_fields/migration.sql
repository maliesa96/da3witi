-- Add machine-parseable event date and reminder scheduling fields
ALTER TABLE "events" ADD COLUMN "event_date" DATE;
ALTER TABLE "events" ADD COLUMN "reminder_days_before" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "events" ADD COLUMN "reminder_sent_at" TIMESTAMPTZ(6);

-- Index for cron query: find events needing reminders by date
CREATE INDEX "events_event_date_reminder_enabled_idx" ON "events" ("event_date", "reminder_enabled");
