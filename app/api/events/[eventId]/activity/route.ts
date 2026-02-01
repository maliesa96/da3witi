import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type ActivityItem = {
  id: string;
  type: "guest_added" | "invite_sent" | "invite_delivered" | "invite_read" | "confirmed" | "declined" | "checked_in";
  guestId: string;
  guestName: string;
  timestamp: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify event ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { userId: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities: ActivityItem[] = [];

    // Get guests with any activity, selecting all timestamp columns
    // This allows us to build the full activity history for each guest
    const guests = await prisma.guest.findMany({
      where: { eventId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        confirmedAt: true,
        declinedAt: true,
        checkedIn: true,
        checkedInAt: true,
      },
    });

    // Build activity items from all timestamp columns
    for (const guest of guests) {
      // Guest added activity
      activities.push({
        id: `${guest.id}-added`,
        type: "guest_added",
        guestId: guest.id,
        guestName: guest.name,
        timestamp: guest.createdAt.toISOString(),
      });

      // Sent activity
      if (guest.sentAt) {
        activities.push({
          id: `${guest.id}-sent`,
          type: "invite_sent",
          guestId: guest.id,
          guestName: guest.name,
          timestamp: guest.sentAt.toISOString(),
        });
      }

      // Delivered activity
      if (guest.deliveredAt) {
        activities.push({
          id: `${guest.id}-delivered`,
          type: "invite_delivered",
          guestId: guest.id,
          guestName: guest.name,
          timestamp: guest.deliveredAt.toISOString(),
        });
      }

      // Read activity
      if (guest.readAt) {
        activities.push({
          id: `${guest.id}-read`,
          type: "invite_read",
          guestId: guest.id,
          guestName: guest.name,
          timestamp: guest.readAt.toISOString(),
        });
      }

      // Confirmed activity
      if (guest.confirmedAt) {
        activities.push({
          id: `${guest.id}-confirmed`,
          type: "confirmed",
          guestId: guest.id,
          guestName: guest.name,
          timestamp: guest.confirmedAt.toISOString(),
        });
      }

      // Declined activity
      if (guest.declinedAt) {
        activities.push({
          id: `${guest.id}-declined`,
          type: "declined",
          guestId: guest.id,
          guestName: guest.name,
          timestamp: guest.declinedAt.toISOString(),
        });
      }

      // Check-in activity
      if (guest.checkedIn && guest.checkedInAt) {
        activities.push({
          id: `${guest.id}-checkedin`,
          type: "checked_in",
          guestId: guest.id,
          guestName: guest.name,
          timestamp: guest.checkedInAt.toISOString(),
        });
      }
    }

    // Sort all activities by timestamp descending and take the limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentActivities = activities.slice(0, limit);

    return NextResponse.json({ activities: recentActivities });
  } catch (error) {
    console.error("GET /api/events/[eventId]/activity failed:", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
