import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

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
        needsReply: m.needsReply,
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
