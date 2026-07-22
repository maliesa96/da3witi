import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isVendorMode, isVendorAdmin, VENDOR_ID } from "@/lib/vendor";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorAdmin = isVendorMode && await isVendorAdmin(user.email);

    // Build query: owner events OR customer events OR attendant events
    // Vendor admins (and platform super-admins on vendor sites) see all vendor events
    const orConditions: Prisma.EventWhereInput[] = [{ userId: user.id }];
    if (isVendorMode && user.email) {
      orConditions.push({ customerEmail: user.email, vendorId: { not: null } });
      orConditions.push({ customerUserId: user.id, vendorId: { not: null } });
      orConditions.push({ attendantEmails: { has: user.email }, vendorId: { not: null } });
    }
    if (vendorAdmin && VENDOR_ID) {
      orConditions.push({ vendorId: VENDOR_ID });
    }

    const events = await prisma.event.findMany({
      where: { OR: orConditions },
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
        reminderDaysBefore: true,
        reminderSentAt: true,
        imageUrl: true,
        mediaType: true,
        mediaFilename: true,
        locale: true,
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
        vendorId: true,
        customerEmail: true,
        customerUserId: true,
        customerPermissions: true,
        editingUnlocked: true,
        attendantEmails: true,
      },
    });

    // Auto-link: if customer accessed by email but customerUserId is not set, set it
    const unlinked = events.filter(
      (e) =>
        e.vendorId &&
        e.customerEmail === user.email &&
        !e.customerUserId
    );
    if (unlinked.length > 0) {
      await prisma.event.updateMany({
        where: { id: { in: unlinked.map((e) => e.id) } },
        data: { customerUserId: user.id },
      });
    }

    return NextResponse.json({
      isVendorAdmin: vendorAdmin,
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
        reminderDaysBefore: e.reminderDaysBefore,
        reminderSentAt: e.reminderSentAt ? e.reminderSentAt.toISOString() : null,
        imageUrl: e.imageUrl ?? null,
        mediaType: e.mediaType ?? null,
        mediaFilename: e.mediaFilename ?? null,
        locale: e.locale ?? null,
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
        customerPermissions: e.customerPermissions ?? null,
        customerEmail: e.customerEmail ?? null,
        editingUnlocked: e.editingUnlocked,
        isAttendant: !!(isVendorMode && user.email && e.attendantEmails.includes(user.email)),
        attendantEmails: vendorAdmin ? e.attendantEmails : undefined,
      })),
      defaultEventId: events[0]?.id ?? null,
    });
  } catch (error) {
    console.error("GET /api/events failed:", error);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}

