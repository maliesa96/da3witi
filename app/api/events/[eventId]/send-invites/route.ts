import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { buildInviteTemplatePayload, type MediaType } from "@/lib/whatsapp";
import { enqueueWhatsAppOutboxBatch, RedisConfigError } from "@/lib/queue/whatsappOutbox";
import { shouldEnqueueWhatsAppInvite } from "@/lib/whatsappSendEligibility";

export async function POST(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { locale?: "en" | "ar" };
    const locale = body?.locale === "ar" ? "ar" : "en";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { guests: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!event.paidAt) {
      return NextResponse.json({ error: "Payment required to send invites" }, { status: 402 });
    }

    const guestsToSend = event.guests.filter((g) => shouldEnqueueWhatsAppInvite(g));

    if (guestsToSend.length === 0) {
      return NextResponse.json({ success: true, queued: 0 });
    }

    const now = new Date();
    const jobs = guestsToSend.map((guest) => ({
      payload: buildInviteTemplatePayload({
        to: guest.phone,
        locale,
        qrEnabled: event.qrEnabled,
        guestsEnabled: event.guestsEnabled ?? false,
        inviteCount: guest.inviteCount,
        invitee: guest.name,
        greetingText: event.message || "",
        date: event.date,
        time: event.time,
        locationName: event.locationName || "See invitation",
        location: event.location || "",
        mediaUrl: event.imageUrl || "",
        mediaType: (event.mediaType as MediaType) || "image",
        mediaFilename: event.mediaFilename || undefined,
      }),
      meta: { kind: "invite" as const, guestId: guest.id, eventId, locale },
    }));

    // Enqueue first; only mark as enqueued if Redis enqueue succeeded.
    await enqueueWhatsAppOutboxBatch(jobs);
    await prisma.guest.updateMany({
      where: { id: { in: guestsToSend.map((g) => g.id) } },
      data: {
        whatsappSendEnqueuedAt: now,
        whatsappSendLastError: null,
      },
    });

    return NextResponse.json({ success: true, queued: guestsToSend.length });
  } catch (error) {
    console.error("POST /api/events/[eventId]/send-invites failed:", error);
    if (error instanceof RedisConfigError) {
      return NextResponse.json(
        {
          error: "Invite queue is not configured",
          details: error.message,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
  }
}

