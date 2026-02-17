import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: "phone is required" },
        { status: 400 }
      );
    }

    // Mark all needsReply messages for this phone as read
    const result = await prisma.whatsAppMessage.updateMany({
      where: {
        phone,
        needsReply: true,
      },
      data: {
        needsReply: false,
      },
    });

    return NextResponse.json({
      success: true,
      cleared: result.count,
    });
  } catch (error) {
    console.error("POST /api/admin/whatsapp/read failed:", error);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
