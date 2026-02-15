-- Prevent duplicate phone numbers within the same event
CREATE UNIQUE INDEX "guests_event_id_phone_key" ON "guests"("event_id", "phone");
