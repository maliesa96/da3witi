import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { sendInviteTemplate, type MediaType } from "@/lib/whatsapp";

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

    const guestsToSend = event.guests.filter(
      (g) => (g.status === "pending" || g.status === "failed") && !g.whatsappMessageId
    );

    if (guestsToSend.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0 });
    }

    const results = await Promise.all(
      guestsToSend.map(async (guest) => {
        const result = await sendInviteTemplate({
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
        });

        if (result.success && result.messageId) {
          await prisma.guest.update({
            where: { id: guest.id },
            data: {
              whatsappMessageId: result.messageId,
              status: "sent",
            },
          });
          return { ok: true };
        }

        await prisma.guest.update({
          where: { id: guest.id },
          data: { status: "failed" },
        });

        return { ok: false };
      })
    );

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;

    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    console.error("POST /api/events/[eventId]/send-invites failed:", error);
    return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
  }
}

