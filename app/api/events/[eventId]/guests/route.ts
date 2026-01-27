import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

function parseIntParam(value: string | null, fallback: number) {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : fallback;
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
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const skip = (page - 1) * pageSize;

    const normalizedStatuses = (statuses || []).map((s) => String(s || "").trim()).filter(Boolean);
    const hasSearch = Boolean(search);
    const hasStatusFilter = normalizedStatuses.length > 0;

    const whereClause = {
      eventId,
      ...(normalizedStatuses.length ? { status: { in: normalizedStatuses } } : {}),
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
        status: true,
        checkedIn: true,
        whatsappMessageId: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    });

    // Pagination totalCount:
    // - search: must count
    // - statuses-only: count
    // - no filters: use event.guestCountTotal
    const totalCountPromise = hasSearch || hasStatusFilter
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
      // Stat cards should reflect invite totals by status (invite_count sum),
      // which equals guest counts when invite_count=1.
      total: event.inviteCountTotal,
      pending: event.inviteCountPending,
      sent: event.inviteCountSent,
      delivered: event.inviteCountDelivered,
      read: event.inviteCountRead,
      confirmed: event.inviteCountConfirmed,
      declined: event.inviteCountDeclined,
      failed: event.inviteCountFailed,
    };

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

    const inviteAll = event.guestsEnabled ? event.inviteCountTotal : 0;
    const inviteFiltered = event.guestsEnabled
      ? hasSearch
        ? filteredInviteAggOrNull?._sum.inviteCount ?? 0
        : hasStatusFilter
          ? normalizedStatuses.reduce((acc, s) => acc + (inviteCountMap[s] ?? 0), 0)
          : inviteAll
      : 0;

    return NextResponse.json({
      guests: guests.map((g) => ({
        ...g,
        inviteCount: g.inviteCount ?? undefined,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats,
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

