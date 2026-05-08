import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdmin } from "@/lib/admin";
import { normalizeAffiliateRef } from "@/lib/affiliateRef";

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

async function generateUniqueCode(baseName: string): Promise<string> {
  const base = slugFromName(baseName) || "ref";
  for (let i = 0; i < 20; i++) {
    const suffix = randomBytes(3).toString("hex").slice(0, 4);
    const candidate = `${base}-${suffix}`;
    const taken = await prisma.affiliate.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${randomBytes(8).toString("hex")}`;
}

export async function GET() {
  try {
    const { user, response } = await requireAdmin();
    if (response) return response;
    if (!isAdmin(user!.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const affiliates = await prisma.affiliate.findMany({
      orderBy: { createdAt: "desc" },
    });

    const enriched = await Promise.all(
      affiliates.map(async (a) => {
        const signups = await prisma.affiliateAttribution.count({
          where: { affiliateId: a.id },
        });

        const conversions = await prisma.affiliateCommission.count({
          where: { affiliateId: a.id, status: { not: "void" } },
        });

        const owedAgg = await prisma.affiliateCommission.aggregate({
          where: { affiliateId: a.id, status: "owed" },
          _sum: { amountFils: true },
        });

        const paidAgg = await prisma.affiliateCommission.aggregate({
          where: { affiliateId: a.id, status: "paid" },
          _sum: { amountFils: true },
        });

        return {
          id: a.id,
          createdAt: a.createdAt.toISOString(),
          code: a.code,
          name: a.name,
          contactEmail: a.contactEmail,
          contactPhone: a.contactPhone,
          commissionFils: a.commissionFils,
          active: a.active,
          notes: a.notes,
          clickCount: a.clickCount,
          signups,
          conversions,
          owedFils: owedAgg._sum.amountFils ?? 0,
          paidFils: paidAgg._sum.amountFils ?? 0,
        };
      })
    );

    return NextResponse.json({ affiliates: enriched });
  } catch (error) {
    console.error("GET /api/admin/affiliates failed:", error);
    return NextResponse.json(
      { error: "Failed to load affiliates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAdmin();
    if (response) return response;
    if (!isAdmin(user!.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      code?: string;
      contactEmail?: string;
      contactPhone?: string;
      commissionFils?: number;
      notes?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let code: string;
    if (body.code?.trim()) {
      const normalized = normalizeAffiliateRef(body.code);
      if (!normalized) {
        return NextResponse.json(
          { error: "Invalid code (use letters, numbers, - or _)" },
          { status: 400 }
        );
      }
      const taken = await prisma.affiliate.findUnique({
        where: { code: normalized },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { error: `Code "${normalized}" is already taken` },
          { status: 409 }
        );
      }
      code = normalized;
    } else {
      code = await generateUniqueCode(body.name);
    }

    const commissionFils =
      typeof body.commissionFils === "number" && Number.isFinite(body.commissionFils)
        ? Math.max(0, Math.floor(body.commissionFils))
        : 10000;

    const affiliate = await prisma.affiliate.create({
      data: {
        name: body.name.trim(),
        code,
        contactEmail: body.contactEmail?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
        commissionFils,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/affiliates failed:", error);
    return NextResponse.json(
      { error: "Failed to create affiliate" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, response } = await requireAdmin();
    if (response) return response;
    if (!isAdmin(user!.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      id?: string;
      name?: string;
      code?: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
      commissionFils?: number;
      active?: boolean;
      notes?: string | null;
    };

    if (!body.id) {
      return NextResponse.json({ error: "Affiliate ID is required" }, { status: 400 });
    }

    const existing = await prisma.affiliate.findUnique({
      where: { id: body.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      data.name = body.name.trim();
    }

    if (body.code !== undefined) {
      const normalized = normalizeAffiliateRef(body.code);
      if (!normalized) {
        return NextResponse.json(
          { error: "Invalid code (use letters, numbers, - or _)" },
          { status: 400 }
        );
      }
      const slugTaken = await prisma.affiliate.findFirst({
        where: { code: normalized, id: { not: body.id } },
        select: { id: true },
      });
      if (slugTaken) {
        return NextResponse.json(
          { error: `Code "${normalized}" is already taken` },
          { status: 409 }
        );
      }
      data.code = normalized;
    }

    if (body.contactEmail !== undefined) {
      data.contactEmail = body.contactEmail?.trim() || null;
    }

    if (body.contactPhone !== undefined) {
      data.contactPhone = body.contactPhone?.trim() || null;
    }

    if (body.commissionFils !== undefined) {
      if (
        typeof body.commissionFils !== "number" ||
        !Number.isFinite(body.commissionFils) ||
        body.commissionFils < 0
      ) {
        return NextResponse.json({ error: "Invalid commission amount" }, { status: 400 });
      }
      data.commissionFils = Math.floor(body.commissionFils);
    }

    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }

    if (body.notes !== undefined) {
      data.notes = body.notes?.trim() || null;
    }

    const affiliate = await prisma.affiliate.update({
      where: { id: body.id },
      data,
    });

    return NextResponse.json({ affiliate });
  } catch (error) {
    console.error("PUT /api/admin/affiliates failed:", error);
    return NextResponse.json(
      { error: "Failed to update affiliate" },
      { status: 500 }
    );
  }
}
