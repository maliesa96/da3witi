-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "location" TEXT,
    "message" TEXT,
    "qr_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMPTZ(6),
    "image_url" TEXT,
    "location_name" TEXT,
    "media_filename" TEXT,
    "media_type" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "stripe_payment_id" TEXT,
    "guests_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'no_reply',
    "whatsapp_message_id" TEXT,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMPTZ(6),
    "qr_code_id" TEXT,
    "invite_count" INTEGER NOT NULL DEFAULT 1,
    "whatsapp_send_attempts" INTEGER NOT NULL DEFAULT 0,
    "whatsapp_send_enqueued_at" TIMESTAMPTZ(6),
    "whatsapp_send_last_error" TEXT,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_stripe_payment_id_key" ON "public"."events"("stripe_payment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "guests_qr_code_id_key" ON "public"."guests"("qr_code_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "guests_whatsapp_message_id_key" ON "public"."guests"("whatsapp_message_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."guests" ADD CONSTRAINT "guests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

