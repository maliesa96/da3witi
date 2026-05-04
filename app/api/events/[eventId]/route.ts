import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { isVendorMode, isVendorAdmin as checkVendorAdmin } from "@/lib/vendor";

function canAccessEvent(
  event: { userId: string | null; customerEmail: string | null; customerUserId: string | null; vendorId: string | null },
  user: { id: string; email?: string | undefined }
): boolean {
  if (event.userId === user.id) return true;
  if (isAdmin(user.email)) return true;
  if (event.vendorId && event.customerEmail && user.email && event.customerEmail === user.email) return true;
  if (event.vendorId && event.customerUserId && event.customerUserId === user.id) return true;
  return false;
}

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
        vendorId: true,
        customerEmail: true,
        customerUserId: true,
        customerPermissions: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!canAccessEvent(event, user)) {
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
      customerPermissions: event.customerPermissions ?? null,
    });
  } catch (error) {
    console.error("GET /api/events/[eventId] failed:", error);
    return NextResponse.json({ error: "Failed to load event" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
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
        id: true, userId: true, vendorId: true,
        customerEmail: true, customerUserId: true,
        inviteCountSent: true, inviteCountDelivered: true, inviteCountRead: true,
        inviteCountConfirmed: true, inviteCountDeclined: true, inviteCountNoReply: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Only the owner or vendor admin can edit
    const isOwner = event.userId === user.id;
    const isAdminUser = isAdmin(user.email);
    const isVAdmin = isVendorMode && await checkVendorAdmin(user.email);

    if (!isOwner && !isAdminUser && !isVAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // In vendor mode, customers cannot edit
    if (isVendorMode && !isVAdmin && !isOwner && !isAdminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Block editing if any invites have been sent
    const sentInvites = event.inviteCountSent + event.inviteCountDelivered +
      event.inviteCountRead + event.inviteCountConfirmed +
      event.inviteCountDeclined + event.inviteCountNoReply;

    if (sentInvites > 0) {
      return NextResponse.json({ error: "Cannot edit event after invites have been sent" }, { status: 400 });
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (typeof body.title === "string") updateData.title = body.title;
    if (typeof body.date === "string") updateData.date = body.date;
    if (typeof body.time === "string") updateData.time = body.time;
    if (typeof body.location === "string") updateData.location = body.location;
    if (typeof body.locationName === "string") updateData.locationName = body.locationName;
    if (typeof body.message === "string") updateData.message = body.message;
    if (typeof body.qrEnabled === "boolean") updateData.qrEnabled = body.qrEnabled;
    if (typeof body.guestsEnabled === "boolean") updateData.guestsEnabled = body.guestsEnabled;
    if (typeof body.reminderEnabled === "boolean") updateData.reminderEnabled = body.reminderEnabled;
    if (typeof body.imageUrl === "string") updateData.imageUrl = body.imageUrl;
    if (typeof body.mediaType === "string") updateData.mediaType = body.mediaType;
    if (typeof body.mediaFilename === "string") updateData.mediaFilename = body.mediaFilename;
    if (typeof body.locale === "string") updateData.locale = body.locale;
    if (typeof body.customerEmail === "string") updateData.customerEmail = body.customerEmail || null;
    if (body.customerPermissions !== undefined) updateData.customerPermissions = body.customerPermissions;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      select: {
        id: true, title: true, date: true, time: true,
        location: true, locationName: true, message: true,
        qrEnabled: true, guestsEnabled: true, reminderEnabled: true,
        imageUrl: true, locale: true, mediaType: true, mediaFilename: true,
        customerEmail: true, customerPermissions: true,
      },
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error("PATCH /api/events/[eventId] failed:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
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
      select: {
        id: true, userId: true, paidAt: true, imageUrl: true,
        vendorId: true, customerEmail: true, customerUserId: true,
        inviteCountSent: true, inviteCountDelivered: true, inviteCountRead: true,
        inviteCountConfirmed: true, inviteCountDeclined: true, inviteCountNoReply: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Only the owner (or admin) can delete; customers cannot
    if (event.userId !== user.id && !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sentInvites = event.inviteCountSent + event.inviteCountDelivered +
      event.inviteCountRead + event.inviteCountConfirmed +
      event.inviteCountDeclined + event.inviteCountNoReply;

    if (isVendorMode) {
      if (sentInvites > 0) {
        return NextResponse.json({ error: "Cannot delete an event after invites have been sent" }, { status: 400 });
      }
    } else {
      if (event.paidAt) {
        return NextResponse.json({ error: "Cannot delete a paid event" }, { status: 400 });
      }
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

