-- CreateTable
CREATE TABLE "affiliates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "commission_fils" INTEGER NOT NULL DEFAULT 10000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "click_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_attributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,

    CONSTRAINT "affiliate_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "affiliate_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "amount_fils" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'owed',
    "paid_at" TIMESTAMPTZ(6),
    "payout_note" TEXT,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_code_key" ON "affiliates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_attributions_user_id_key" ON "affiliate_attributions"("user_id");

-- CreateIndex
CREATE INDEX "affiliate_attributions_affiliate_id_idx" ON "affiliate_attributions"("affiliate_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_commissions_user_id_key" ON "affiliate_commissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_commissions_event_id_key" ON "affiliate_commissions"("event_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_affiliate_id_status_idx" ON "affiliate_commissions"("affiliate_id", "status");

-- AddForeignKey
ALTER TABLE "affiliate_attributions" ADD CONSTRAINT "affiliate_attributions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
