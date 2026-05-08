import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAffiliateRef } from "@/lib/affiliateRef";

/**
 * Best-effort click counter for affiliate links. Public, no auth.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { code?: string };
    const code = normalizeAffiliateRef(body?.code);
    if (!code) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await prisma.affiliate.updateMany({
      where: { code, active: true },
      data: { clickCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
