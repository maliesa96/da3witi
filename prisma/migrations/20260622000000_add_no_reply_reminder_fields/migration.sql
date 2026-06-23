-- AlterTable
ALTER TABLE "guests" ADD COLUMN "no_reply_reminder_sent_at" TIMESTAMPTZ(6);
ALTER TABLE "guests" ADD COLUMN "no_reply_reminder_delivered_at" TIMESTAMPTZ(6);
ALTER TABLE "guests" ADD COLUMN "no_reply_reminder_read_at" TIMESTAMPTZ(6);
ALTER TABLE "guests" ADD COLUMN "no_reply_reminder_failed_at" TIMESTAMPTZ(6);
ALTER TABLE "guests" ADD COLUMN "no_reply_reminder_message_id" TEXT;
