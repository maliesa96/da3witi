-- Denormalized guest stats + invite totals on events (maintained by triggers)

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "guest_count_total" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_total" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_pending" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_sent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_delivered" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_read" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_confirmed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_declined" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_failed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "invite_count_no_reply" INTEGER NOT NULL DEFAULT 0;

-- Backfill counts/sums from existing guests.
UPDATE "events" e
SET
  "guest_count_total" = COALESCE(s."guest_count_total", 0),
  "invite_count_total" = COALESCE(s."invite_count_total", 0),
  "invite_count_pending" = COALESCE(s."invite_count_pending", 0),
  "invite_count_sent" = COALESCE(s."invite_count_sent", 0),
  "invite_count_delivered" = COALESCE(s."invite_count_delivered", 0),
  "invite_count_read" = COALESCE(s."invite_count_read", 0),
  "invite_count_confirmed" = COALESCE(s."invite_count_confirmed", 0),
  "invite_count_declined" = COALESCE(s."invite_count_declined", 0),
  "invite_count_failed" = COALESCE(s."invite_count_failed", 0),
  "invite_count_no_reply" = COALESCE(s."invite_count_no_reply", 0)
FROM (
  SELECT
    "event_id" AS "event_id",
    COUNT(*)::INT AS "guest_count_total",
    COALESCE(SUM("invite_count"), 0)::INT AS "invite_count_total",
    COALESCE(SUM("invite_count") FILTER (WHERE "status" = 'pending'), 0)::INT AS "invite_count_pending",
    COALESCE(SUM("invite_count") FILTER (WHERE "status" = 'sent'), 0)::INT AS "invite_count_sent",
    COALESCE(SUM("invite_count") FILTER (WHERE "status" = 'delivered'), 0)::INT AS "invite_count_delivered",
    COALESCE(SUM("invite_count") FILTER (WHERE "status" = 'read'), 0)::INT AS "invite_count_read",
    COALESCE(SUM("invite_count") FILTER (WHERE "status" = 'confirmed'), 0)::INT AS "invite_count_confirmed",
    COALESCE(SUM("invite_count") FILTER (WHERE "status" = 'declined'), 0)::INT AS "invite_count_declined",
    COALESCE(SUM("invite_count") FILTER (WHERE "status" = 'failed'), 0)::INT AS "invite_count_failed",
    COALESCE(SUM("invite_count") FILTER (WHERE "status" = 'no_reply'), 0)::INT AS "invite_count_no_reply"
  FROM "guests"
  GROUP BY "event_id"
) s
WHERE e."id" = s."event_id";

-- Helper to apply a delta to an event for a given guest status.
CREATE OR REPLACE FUNCTION "apply_event_guest_delta"(
  p_event_id UUID,
  p_status TEXT,
  p_guest_delta INTEGER,
  p_invite_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE "events"
  SET
    "guest_count_total" = GREATEST(0, "guest_count_total" + p_guest_delta),
    "invite_count_total" = GREATEST(0, "invite_count_total" + p_invite_delta),

    "invite_count_pending" = GREATEST(0, "invite_count_pending" + CASE WHEN p_status = 'pending' THEN p_invite_delta ELSE 0 END),
    "invite_count_sent" = GREATEST(0, "invite_count_sent" + CASE WHEN p_status = 'sent' THEN p_invite_delta ELSE 0 END),
    "invite_count_delivered" = GREATEST(0, "invite_count_delivered" + CASE WHEN p_status = 'delivered' THEN p_invite_delta ELSE 0 END),
    "invite_count_read" = GREATEST(0, "invite_count_read" + CASE WHEN p_status = 'read' THEN p_invite_delta ELSE 0 END),
    "invite_count_confirmed" = GREATEST(0, "invite_count_confirmed" + CASE WHEN p_status = 'confirmed' THEN p_invite_delta ELSE 0 END),
    "invite_count_declined" = GREATEST(0, "invite_count_declined" + CASE WHEN p_status = 'declined' THEN p_invite_delta ELSE 0 END),
    "invite_count_failed" = GREATEST(0, "invite_count_failed" + CASE WHEN p_status = 'failed' THEN p_invite_delta ELSE 0 END),
    "invite_count_no_reply" = GREATEST(0, "invite_count_no_reply" + CASE
      WHEN p_status IN ('pending','sent','delivered','read','confirmed','declined','failed') THEN 0
      ELSE p_invite_delta
    END)
  WHERE "id" = p_event_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "guests_event_counters_trg"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM "apply_event_guest_delta"(NEW."event_id", NEW."status", 1, NEW."invite_count");
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM "apply_event_guest_delta"(OLD."event_id", OLD."status", -1, -OLD."invite_count");
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- guest moved to another event
    IF OLD."event_id" IS DISTINCT FROM NEW."event_id" THEN
      PERFORM "apply_event_guest_delta"(OLD."event_id", OLD."status", -1, -OLD."invite_count");
      PERFORM "apply_event_guest_delta"(NEW."event_id", NEW."status", 1, NEW."invite_count");
      RETURN NEW;
    END IF;

    -- status changed within same event
    IF OLD."status" IS DISTINCT FROM NEW."status" THEN
      PERFORM "apply_event_guest_delta"(NEW."event_id", OLD."status", -1, -OLD."invite_count");
      PERFORM "apply_event_guest_delta"(NEW."event_id", NEW."status", 1, NEW."invite_count");
      RETURN NEW;
    END IF;

    -- invite count changed within same event+status
    IF OLD."invite_count" IS DISTINCT FROM NEW."invite_count" THEN
      PERFORM "apply_event_guest_delta"(NEW."event_id", NEW."status", 0, (NEW."invite_count" - OLD."invite_count"));
      RETURN NEW;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_guests_event_counters" ON "guests";
CREATE TRIGGER "trg_guests_event_counters"
AFTER INSERT OR UPDATE OR DELETE ON "guests"
FOR EACH ROW EXECUTE FUNCTION "guests_event_counters_trg"();

