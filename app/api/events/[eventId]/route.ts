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
        locale: true,
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
      locale: event.locale ?? null,
      paidAt: event.paidAt ? event.paidAt.toISOString() : null,
    });
  } catch (error) {
    console.error("GET /api/events/[eventId] failed:", error);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
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
      select: { id: true, userId: true, paidAt: true, imageUrl: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (event.paidAt) {
      return NextResponse.json({ error: "Cannot delete a paid event" }, { status: 400 });
    }

    // Clean up media from Supabase Storage if present
    if (event.imageUrl) {
      const bucketName = "event-media";
      const idx = event.imageUrl.indexOf(`${bucketName}/`);
      if (idx !== -1) {
        const path = event.imageUrl.substring(idx + bucketName.length + 1);
        await supabase.storage.from(bucketName).remove([path]);
      }
    }

    // Delete the event (guests cascade via DB FK)
    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events/[eventId] failed:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

