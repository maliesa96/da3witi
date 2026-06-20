import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWhatsAppTextPayload } from "@/lib/whatsapp";
import { enqueueWhatsAppOutbox } from "@/lib/queue/whatsappOutbox";
import { broadcastWhatsAppMessage } from "@/lib/supabase/broadcast";
import { requireAdmin } from "@/lib/admin";

const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: "phone and message are required" },
        { status: 400 }
      );
    }

    // Check 24h messaging window + resolve vendor from conversation history
    const lastInbound = await prisma.whatsAppMessage.findFirst({
      where: { phone, direction: "inbound" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, vendorId: true },
    });

    const windowOpen =
      lastInbound &&
      Date.now() - lastInbound.createdAt.getTime() < TWENTY_FOUR_H;

    if (!windowOpen) {
      return NextResponse.json(
        { error: "24h messaging window is closed. Cannot send until the customer messages again." },
        { status: 403 }
      );
    }

    const vendorId = lastInbound?.vendorId ?? null;
    let vendorName: string | null = null;
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { name: true },
      });
      vendorName = vendor?.name ?? null;
    }

    // Enqueue the outbound message via BullMQ -> worker
    const payload = buildWhatsAppTextPayload(phone, message);
    await enqueueWhatsAppOutbox(payload, {
      kind: "webhook_followup",
      vendorId: vendorId || undefined,
    });

    // Store the outbound message in the chat history
    const stored = await prisma.whatsAppMessage.create({
      data: {
        phone,
        direction: "outbound",
        body: message,
        messageType: "text",
        status: "sent",
        vendorId: vendorId || undefined,
      },
    });

    const messagePayload = {
      id: stored.id,
      phone: stored.phone,
      direction: stored.direction as "outbound",
      body: stored.body,
      messageType: stored.messageType,
      whatsappMessageId: stored.whatsappMessageId,
      contextMessageId: stored.contextMessageId,
      guestId: stored.guestId,
      guestName: stored.guestName,
      status: stored.status,
      needsReply: false,
      createdAt: stored.createdAt.toISOString(),
      vendorId: vendorId,
      vendorName: vendorName,
    };

    // Broadcast to admin chat UI via Supabase Realtime
    await broadcastWhatsAppMessage(messagePayload);

    return NextResponse.json({
      success: true,
      message: messagePayload,
    });
  } catch (error) {
    console.error("POST /api/admin/whatsapp/send failed:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
