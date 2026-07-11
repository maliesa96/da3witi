import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdmin } from "@/lib/admin";
import { VENDOR_ID } from "@/lib/vendor";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { user, response } = await requireAdmin();
    if (response) return response;

    if (!isAdmin(user!.email)) {
      return NextResponse.json({ error: "Only platform admins can unlock editing" }, { status: 403 });
    }

    const { eventId } = await context.params;
    const body = await request.json();

    if (typeof body.editingUnlocked !== "boolean") {
      return NextResponse.json({ error: "editingUnlocked must be a boolean" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { editingUnlocked: body.editingUnlocked },
    });

    return NextResponse.json({ success: true, editingUnlocked: body.editingUnlocked });
  } catch (error) {
    console.error("PATCH /api/admin/events/[eventId] failed:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { eventId } = await context.params;

    const whereClause: { id: string; vendorId?: string } = { id: eventId };
    if (VENDOR_ID) whereClause.vendorId = VENDOR_ID;

    const event = await prisma.event.findUnique({
      where: whereClause,
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
        reminderDaysBefore: true,
        reminderSentAt: true,
        imageUrl: true,
        mediaType: true,
        mediaFilename: true,
        locale: true,
        paidAt: true,
        userId: true,
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
        editingUnlocked: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch owner info from Supabase auth
    let ownerEmail: string | null = null;
    let ownerName: string | null = null;

    if (event.userId) {
      const result = await prisma.$queryRaw<
        { email: string | null; name: string | null }[]
      >`
        SELECT u.email,
               COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'name') as name
        FROM auth.users u
        WHERE u.id = ${event.userId}::uuid
        LIMIT 1
      `;
      if (result[0]) {
        ownerEmail = result[0].email ?? null;
        ownerName = result[0].name ?? null;
      }
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
      reminderDaysBefore: event.reminderDaysBefore,
      reminderSentAt: event.reminderSentAt ? event.reminderSentAt.toISOString() : null,
      imageUrl: event.imageUrl ?? null,
      mediaType: event.mediaType ?? null,
      mediaFilename: event.mediaFilename ?? null,
      locale: event.locale ?? null,
      paidAt: event.paidAt ? event.paidAt.toISOString() : null,
      guestCountTotal: event.guestCountTotal,
      inviteCountTotal: event.inviteCountTotal,
      inviteCountPending: event.inviteCountPending,
      inviteCountSent: event.inviteCountSent,
      inviteCountDelivered: event.inviteCountDelivered,
      inviteCountRead: event.inviteCountRead,
      inviteCountConfirmed: event.inviteCountConfirmed,
      inviteCountDeclined: event.inviteCountDeclined,
      inviteCountFailed: event.inviteCountFailed,
      inviteCountNoReply: event.inviteCountNoReply,
      editingUnlocked: event.editingUnlocked,
      ownerEmail,
      ownerName,
    });
  } catch (error) {
    console.error("GET /api/admin/events/[eventId] failed:", error);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
  }
}
