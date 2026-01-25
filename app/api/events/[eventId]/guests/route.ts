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
      select: { id: true, userId: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const skip = (page - 1) * pageSize;

    const normalizedStatuses = (statuses || []).map((s) => String(s || "").trim()).filter(Boolean);

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

    const [guests, totalCount, statusCounts, filteredInviteAgg, allInviteAgg] = await Promise.all([
      prisma.guest.findMany({
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
      }),
      prisma.guest.count({ where: whereClause }),
      prisma.guest.groupBy({
        by: ["status"],
        where: { eventId },
        _count: { status: true },
      }),
      prisma.guest.aggregate({
        where: whereClause,
        _sum: { inviteCount: true },
      }),
      prisma.guest.aggregate({
        where: { eventId },
        _sum: { inviteCount: true },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const stats = {
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      confirmed: 0,
      declined: 0,
      failed: 0,
    };

    for (const sc of statusCounts) {
      const count = sc._count.status;
      stats.total += count;
      if (sc.status in stats) {
        stats[sc.status as keyof typeof stats] = count;
      }
    }

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
        filtered: filteredInviteAgg._sum.inviteCount ?? 0,
        all: allInviteAgg._sum.inviteCount ?? 0,
      },
    });
  } catch (error) {
    console.error("GET /api/events/[eventId]/guests failed:", error);
    return NextResponse.json({ error: "Failed to load guests" }, { status: 500 });
  }
}

