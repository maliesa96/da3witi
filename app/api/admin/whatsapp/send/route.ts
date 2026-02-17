import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { buildWhatsAppTextPayload } from "@/lib/whatsapp";
import { enqueueWhatsAppOutbox } from "@/lib/queue/whatsappOutbox";
import { broadcastWhatsAppMessage } from "@/lib/supabase/broadcast";

const ADMIN_EMAILS = ["mashari7@yahoo.com"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: "phone and message are required" },
        { status: 400 }
      );
    }

    // Enqueue the outbound message via BullMQ -> worker
    const payload = buildWhatsAppTextPayload(phone, message);
    await enqueueWhatsAppOutbox(payload, {
      kind: "webhook_followup",
    });

    // Store the outbound message in the chat history
    const stored = await prisma.whatsAppMessage.create({
      data: {
        phone,
        direction: "outbound",
        body: message,
        messageType: "text",
        status: "sent",
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
      createdAt: stored.createdAt.toISOString(),
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
