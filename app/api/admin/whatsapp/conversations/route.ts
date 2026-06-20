import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

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
        vendor_id: string | null;
        vendor_name: string | null;
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
        COUNT(*)::int as total_count,
        (
          SELECT wm.vendor_id FROM whatsapp_messages wm
          WHERE wm.phone = m.phone AND wm.vendor_id IS NOT NULL
          ORDER BY wm.created_at DESC LIMIT 1
        ) as vendor_id,
        (
          SELECT v.name FROM whatsapp_messages wm
          JOIN vendors v ON v.id = wm.vendor_id
          WHERE wm.phone = m.phone AND wm.vendor_id IS NOT NULL
          ORDER BY wm.created_at DESC LIMIT 1
        ) as vendor_name
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
        vendorId: c.vendor_id,
        vendorName: c.vendor_name,
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
