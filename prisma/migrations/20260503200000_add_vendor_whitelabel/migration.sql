-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "admin_emails" TEXT[],

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_slug_key" ON "vendors"("slug");

-- AlterTable
ALTER TABLE "events" ADD COLUMN "vendor_id" UUID;
ALTER TABLE "events" ADD COLUMN "customer_email" TEXT;
ALTER TABLE "events" ADD COLUMN "customer_user_id" UUID;
ALTER TABLE "events" ADD COLUMN "customer_permissions" JSONB;

-- CreateIndex
CREATE INDEX "events_vendor_id_idx" ON "events"("vendor_id");
CREATE INDEX "events_customer_email_idx" ON "events"("customer_email");
CREATE INDEX "events_customer_user_id_idx" ON "events"("customer_user_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
