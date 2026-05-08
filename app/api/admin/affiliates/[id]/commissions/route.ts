import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdmin } from "@/lib/admin";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireAdmin();
    if (response) return response;
    if (!isAdmin(user!.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: affiliateId } = await context.params;

    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      select: { id: true },
    });

    if (!affiliate) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    const commissions = await prisma.affiliateCommission.findMany({
      where: { affiliateId },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: {
            title: true,
            customerEmail: true,
          },
        },
      },
    });

    return NextResponse.json({
      commissions: commissions.map((c) => ({
        id: c.id,
        createdAt: c.createdAt.toISOString(),
        amountFils: c.amountFils,
        status: c.status,
        paidAt: c.paidAt?.toISOString() ?? null,
        payoutNote: c.payoutNote,
        userId: c.userId,
        eventId: c.eventId,
        eventTitle: c.event.title,
        customerEmail: c.event.customerEmail,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/affiliates/[id]/commissions failed:", error);
    return NextResponse.json(
      { error: "Failed to load commissions" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireAdmin();
    if (response) return response;
    if (!isAdmin(user!.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: affiliateId } = await context.params;
    const body = (await request.json()) as {
      commissionId?: string;
      status?: string;
      payoutNote?: string | null;
    };

    if (!body.commissionId) {
      return NextResponse.json(
        { error: "commissionId is required" },
        { status: 400 }
      );
    }

    if (body.status !== "paid" && body.status !== "void") {
      return NextResponse.json(
        { error: "status must be paid or void" },
        { status: 400 }
      );
    }

    const row = await prisma.affiliateCommission.findFirst({
      where: { id: body.commissionId, affiliateId },
      select: { id: true },
    });

    if (!row) {
      return NextResponse.json(
        { error: "Commission not found for this affiliate" },
        { status: 404 }
      );
    }

    const updated = await prisma.affiliateCommission.update({
      where: { id: body.commissionId },
      data: {
        status: body.status,
        paidAt: body.status === "paid" ? new Date() : null,
        payoutNote:
          body.payoutNote !== undefined
            ? body.payoutNote?.trim() || null
            : undefined,
      },
    });

    return NextResponse.json({
      commission: {
        id: updated.id,
        status: updated.status,
        paidAt: updated.paidAt?.toISOString() ?? null,
        payoutNote: updated.payoutNote,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/affiliates/[id]/commissions failed:", error);
    return NextResponse.json(
      { error: "Failed to update commission" },
      { status: 500 }
    );
  }
}
