import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["mashari7@yahoo.com"];

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalEvents,
      totalPaidEvents,
      totalGuests,
      distinctUsers,
      inviteAgg,
      eventsPerDay,
      paymentsPerDay,
      guestsPerDay,
      signupsPerDay,
      recentEvents,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { paidAt: { not: null } } }),
      prisma.guest.count(),
      prisma.event.findMany({
        where: { userId: { not: null } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.event.aggregate({
        _sum: {
          inviteCountTotal: true,
          inviteCountSent: true,
          inviteCountDelivered: true,
          inviteCountRead: true,
          inviteCountConfirmed: true,
          inviteCountDeclined: true,
          inviteCountFailed: true,
          inviteCountPending: true,
          inviteCountNoReply: true,
        },
      }),
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT DATE(created_at)::text as date, COUNT(*)::int as count
        FROM events
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT DATE(paid_at)::text as date, COUNT(*)::int as count
        FROM events
        WHERE paid_at IS NOT NULL AND paid_at >= ${thirtyDaysAgo}
        GROUP BY DATE(paid_at)
        ORDER BY date
      `,
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT DATE(created_at)::text as date, COUNT(*)::int as count
        FROM guests
        WHERE created_at >= ${thirtyDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      prisma.$queryRaw<{ date: string; count: number }[]>`
        SELECT DATE(first_event)::text as date, COUNT(*)::int as count
        FROM (
          SELECT user_id, MIN(created_at) as first_event
          FROM events
          WHERE user_id IS NOT NULL
          GROUP BY user_id
        ) sub
        WHERE first_event >= ${thirtyDaysAgo}
        GROUP BY DATE(first_event)
        ORDER BY date
      `,
      prisma.$queryRaw<
        {
          id: string;
          title: string;
          created_at: Date;
          guest_count_total: number;
          invite_count_total: number;
          paid_at: Date | null;
          owner_email: string | null;
          owner_name: string | null;
        }[]
      >`
        SELECT
          e.id,
          e.title,
          e.created_at,
          e.guest_count_total,
          e.invite_count_total,
          e.paid_at,
          u.email as owner_email,
          COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'name') as owner_name
        FROM events e
        LEFT JOIN auth.users u ON e.user_id = u.id
        ORDER BY e.created_at DESC
        LIMIT 10
      `,
    ]);

    // Build 30-day time series
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const toMap = (rows: { date: string; count: number }[]) =>
      Object.fromEntries(rows.map((r) => [r.date, r.count]));

    const eventsByDay = toMap(eventsPerDay);
    const paymentsByDay = toMap(paymentsPerDay);
    const guestsByDay = toMap(guestsPerDay);
    const signupsByDay = toMap(signupsPerDay);

    const timeSeries = days.map((date) => ({
      date,
      events: eventsByDay[date] || 0,
      payments: paymentsByDay[date] || 0,
      invites: guestsByDay[date] || 0,
      signups: signupsByDay[date] || 0,
    }));

    const statusBreakdown = [
      { status: "confirmed", count: inviteAgg._sum.inviteCountConfirmed || 0 },
      { status: "sent", count: inviteAgg._sum.inviteCountSent || 0 },
      { status: "delivered", count: inviteAgg._sum.inviteCountDelivered || 0 },
      { status: "read", count: inviteAgg._sum.inviteCountRead || 0 },
      { status: "pending", count: inviteAgg._sum.inviteCountPending || 0 },
      { status: "declined", count: inviteAgg._sum.inviteCountDeclined || 0 },
      { status: "failed", count: inviteAgg._sum.inviteCountFailed || 0 },
      { status: "no_reply", count: inviteAgg._sum.inviteCountNoReply || 0 },
    ].filter((s) => s.count > 0);

    return NextResponse.json({
      overview: {
        totalUsers: distinctUsers.length,
        totalEvents,
        totalPaidEvents,
        totalGuests,
        totalInvitesSent: inviteAgg._sum.inviteCountTotal || 0,
      },
      timeSeries,
      statusBreakdown,
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        title: e.title,
        createdAt: e.created_at.toISOString(),
        guestCountTotal: e.guest_count_total,
        inviteCountTotal: e.invite_count_total,
        paidAt: e.paid_at?.toISOString() ?? null,
        ownerEmail: e.owner_email ?? null,
        ownerName: e.owner_name ?? null,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/stats failed:", error);
    return NextResponse.json(
      { error: "Failed to load admin stats" },
      { status: 500 }
    );
  }
}
