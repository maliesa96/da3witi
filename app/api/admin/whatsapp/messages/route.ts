import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["mashari7@yahoo.com"];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json(
        { error: "phone parameter is required" },
        { status: 400 }
      );
    }

    const messages = await prisma.whatsAppMessage.findMany({
      where: { phone },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return NextResponse.json(
      messages.map((m) => ({
        id: m.id,
        phone: m.phone,
        direction: m.direction,
        body: m.body,
        messageType: m.messageType,
        whatsappMessageId: m.whatsappMessageId,
        contextMessageId: m.contextMessageId,
        guestId: m.guestId,
        guestName: m.guestName,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("GET /api/admin/whatsapp/messages failed:", error);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
