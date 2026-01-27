import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
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
        userId: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: event.id,
      title: event.title,
      isScheduled: event.isScheduled,
      date: event.date,
      time: event.time,
      location: event.location ?? null,
      locationName: event.locationName ?? null,
      message: event.message ?? null,
      qrEnabled: event.qrEnabled,
      guestsEnabled: event.guestsEnabled,
      reminderEnabled: event.reminderEnabled,
      imageUrl: event.imageUrl ?? null,
      paidAt: event.paidAt ? event.paidAt.toISOString() : null,
    });
  } catch (error) {
    console.error("GET /api/events/[eventId] failed:", error);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
  }
}

