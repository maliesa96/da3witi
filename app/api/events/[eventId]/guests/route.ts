import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { isVendorMode, isVendorAdmin } from "@/lib/vendor";

function parseIntParam(value: string | null, fallback: number) {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseSide(url: URL): string | null {
  const side = (url.searchParams.get("side") || "").trim().toLowerCase();
  if (side === 'bride' || side === 'groom') return side;
  return null;
}

function parseStatuses(url: URL) {
  // Supports:
  // - ?statuses=pending,failed
  // - ?status=pending&status=failed
  const fromCsv = (url.searchParams.get("statuses") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const fromMulti = url.searchParams.getAll("status").map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set([...fromCsv, ...fromMulti]));
}

export async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await context.params;
    const url = new URL(request.url);

    const page = parseIntParam(url.searchParams.get("page"), 1);
    const pageSize = parseIntParam(url.searchParams.get("pageSize"), 50);
    const search = (url.searchParams.get("search") || "").trim();
    const statuses = parseStatuses(url);
    const side = parseSide(url);

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
        userId: true,
        guestsEnabled: true,
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
        attendantEmails: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isOwner = event.userId === user.id;
    const isCustomer =
      event.vendorId &&
      ((event.customerEmail && user.email && event.customerEmail === user.email) ||
       (event.customerUserId && event.customerUserId === user.id));
    const isAttendant =
      event.vendorId && user.email && event.attendantEmails.includes(user.email);
    const isVAdmin = isVendorMode && event.vendorId && (await isVendorAdmin(user.email));

    if (!isOwner && !isAdmin(user.email) && !isCustomer && !isAttendant && !isVAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const skip = (page - 1) * pageSize;

    const normalizedStatuses = (statuses || []).map((s) => String(s || "").trim()).filter(Boolean);
    const hasSearch = Boolean(search);
    const hasStatusFilter = normalizedStatuses.length > 0;

    const whereClause = {
      eventId,
      ...(normalizedStatuses.length ? { status: { in: normalizedStatuses } } : {}),
      ...(side ? { inviteSide: side } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const guestsPromise = prisma.guest.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        inviteCount: true,
        inviteSide: true,
        status: true,
        checkedIn: true,
        whatsappMessageId: true,
        sentAt: true,
        noReplyReminderSentAt: true,
        noReplyReminderDeliveredAt: true,
        noReplyReminderReadAt: true,
        noReplyReminderFailedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    });

    const totalCountPromise = hasSearch || hasStatusFilter || side
      ? prisma.guest.count({ where: whereClause })
      : Promise.resolve<number | null>(null);

    // Filtered invite totals:
    // - search: must aggregate
    // - statuses-only: sum per-status invite counters
    // - no filters: equals all
    const filteredInviteAggPromise =
      event.guestsEnabled && hasSearch
        ? prisma.guest.aggregate({ where: whereClause, _sum: { inviteCount: true } })
        : Promise.resolve<{ _sum: { inviteCount: number | null } } | null>(null);

    const [guests, totalCountFromCountOrNull, filteredInviteAggOrNull] = await Promise.all([
      guestsPromise,
      totalCountPromise,
      filteredInviteAggPromise,
    ]);

    const stats = {
      total: event.inviteCountTotal,
      pending: event.inviteCountPending,
      sent: event.inviteCountSent,
      delivered: event.inviteCountDelivered,
      read: event.inviteCountRead,
      confirmed: event.inviteCountConfirmed,
      declined: event.inviteCountDeclined,
      failed: event.inviteCountFailed,
    };

    let sideStats: typeof stats | null = null;
    if (side) {
      const statusCountsBySide = await prisma.guest.groupBy({
        by: ['status'],
        where: { eventId, inviteSide: side },
        _count: { status: true },
        _sum: { inviteCount: true },
      });

      sideStats = {
        total: 0,
        pending: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        confirmed: 0,
        declined: 0,
        failed: 0,
      };

      for (const sc of statusCountsBySide) {
        const invites = sc._sum.inviteCount ?? sc._count.status;
        sideStats.total += invites;
        const key = sc.status;
        if (key in sideStats && key !== 'total') {
          sideStats[key as keyof Omit<typeof sideStats, 'total'>] += invites;
        }
      }
    }

    const inviteCountMap: Record<string, number> = {
      pending: event.inviteCountPending,
      sent: event.inviteCountSent,
      delivered: event.inviteCountDelivered,
      read: event.inviteCountRead,
      confirmed: event.inviteCountConfirmed,
      declined: event.inviteCountDeclined,
      failed: event.inviteCountFailed,
      no_reply: event.inviteCountNoReply,
    };

    const totalCount =
      totalCountFromCountOrNull ??
      event.guestCountTotal;

    const totalPages = Math.ceil(totalCount / pageSize);

    const inviteAll = event.guestsEnabled
      ? (sideStats ? sideStats.total : event.inviteCountTotal)
      : 0;
    const inviteFiltered = event.guestsEnabled
      ? hasSearch
        ? filteredInviteAggOrNull?._sum.inviteCount ?? 0
        : hasStatusFilter
          ? sideStats
            ? normalizedStatuses.reduce((acc, s) => {
                const key = s as keyof typeof sideStats;
                return acc + (key in sideStats && key !== 'total' ? sideStats[key] : 0);
              }, 0)
            : normalizedStatuses.reduce((acc, s) => acc + (inviteCountMap[s] ?? 0), 0)
          : inviteAll
      : 0;

    return NextResponse.json({
      guests: guests.map((g) => ({
        ...g,
        inviteCount: g.inviteCount ?? undefined,
        inviteSide: g.inviteSide ?? null,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: sideStats ?? stats,
      inviteTotals: {
        filtered: inviteFiltered,
        all: inviteAll,
      },
    });
  } catch (error) {
    console.error("GET /api/events/[eventId]/guests failed:", error);
    return NextResponse.json({ error: "Failed to load guests" }, { status: 500 });
  }
}

