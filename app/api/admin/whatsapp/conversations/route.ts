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

    // Get conversations grouped by phone number with the latest message
    const conversations = await prisma.$queryRaw<
      {
        phone: string;
        guest_name: string | null;
        last_message: string;
        last_message_at: Date;
        last_direction: string;
        last_inbound_at: Date | null;
        unread_count: number;
        total_count: number;
      }[]
    >`
      SELECT
        m.phone,
        (
          SELECT wm.guest_name FROM whatsapp_messages wm
          WHERE wm.phone = m.phone AND wm.guest_name IS NOT NULL
          ORDER BY wm.created_at DESC LIMIT 1
        ) as guest_name,
        (
          SELECT wm.body FROM whatsapp_messages wm
          WHERE wm.phone = m.phone
          ORDER BY wm.created_at DESC LIMIT 1
        ) as last_message,
        MAX(m.created_at) as last_message_at,
        (
          SELECT wm.direction FROM whatsapp_messages wm
          WHERE wm.phone = m.phone
          ORDER BY wm.created_at DESC LIMIT 1
        ) as last_direction,
        MAX(m.created_at) FILTER (WHERE m.direction = 'inbound') as last_inbound_at,
        COUNT(*) FILTER (WHERE m.needs_reply = true)::int as unread_count,
        COUNT(*)::int as total_count
      FROM whatsapp_messages m
      GROUP BY m.phone
      ORDER BY MAX(m.created_at) DESC
    `;

    return NextResponse.json(
      conversations.map((c) => ({
        phone: c.phone,
        guestName: c.guest_name,
        lastMessage: c.last_message,
        lastMessageAt: c.last_message_at,
        lastDirection: c.last_direction,
        lastInboundAt: c.last_inbound_at,
        unreadCount: c.unread_count,
        totalCount: c.total_count,
      }))
    );
  } catch (error) {
    console.error("GET /api/admin/whatsapp/conversations failed:", error);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 }
    );
  }
}
