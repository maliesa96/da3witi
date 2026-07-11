-- AlterTable
ALTER TABLE "guests" ADD COLUMN "invite_side" TEXT;

-- CreateIndex
CREATE INDEX "guests_event_id_invite_side_idx" ON "guests"("event_id", "invite_side");
