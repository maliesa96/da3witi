import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await prisma.event.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        isScheduled: true,
        date: true,
        time: true,
        location: true,
        locationName: true,
        message: true,
        qrEnabled: true,
        guestsEnabled: true,
        reminderEnabled: true,
        imageUrl: true,
        paidAt: true,
        guestCountTotal: true,
        inviteCountTotal: true,
        inviteCountPending: true,
        inviteCountSent: true,
        inviteCountDelivered: true,
        inviteCountRead: true,
        inviteCountConfirmed: true,
        inviteCountDeclined: true,
        inviteCountFailed: true,
        inviteCountNoReply: true,
      },
    });

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        isScheduled: e.isScheduled,
        date: e.date,
        time: e.time,
        location: e.location ?? null,
        locationName: e.locationName ?? null,
        message: e.message ?? null,
        qrEnabled: e.qrEnabled,
        guestsEnabled: e.guestsEnabled,
        reminderEnabled: e.reminderEnabled,
        imageUrl: e.imageUrl ?? null,
        paidAt: e.paidAt ? e.paidAt.toISOString() : null,
        guestCountTotal: e.guestCountTotal,
        inviteCountTotal: e.inviteCountTotal,
        inviteCountPending: e.inviteCountPending,
        inviteCountSent: e.inviteCountSent,
        inviteCountDelivered: e.inviteCountDelivered,
        inviteCountRead: e.inviteCountRead,
        inviteCountConfirmed: e.inviteCountConfirmed,
        inviteCountDeclined: e.inviteCountDeclined,
        inviteCountFailed: e.inviteCountFailed,
        inviteCountNoReply: e.inviteCountNoReply,
      })),
      defaultEventId: events[0]?.id ?? null,
    });
  } catch (error) {
    console.error("GET /api/events failed:", error);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}

