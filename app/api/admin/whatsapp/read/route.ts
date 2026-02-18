import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

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
