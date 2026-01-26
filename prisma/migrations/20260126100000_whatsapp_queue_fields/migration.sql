-- Add WhatsApp queue tracking fields to guests

ALTER TABLE "guests"
  ADD COLUMN IF NOT EXISTS "whatsapp_send_enqueued_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "whatsapp_send_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "whatsapp_send_last_error" TEXT;

