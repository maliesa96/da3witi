import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const { user, response } = await requireAdmin();
    if (response) return response;

    if (!isAdmin(user!.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        faviconUrl: true,
        adminEmails: true,
        defaultLocale: true,
        whatsappPhoneNumberId: true,
        wabaId: true,
        whatsappVerifyToken: true,
        supportWhatsapp: true,
        createdAt: true,
        _count: {
          select: { events: true },
        },
      },
    });

    const vendorStats = await Promise.all(
      vendors.map(async (v) => {
        const [guestCount, paidCount] = await Promise.all([
          prisma.guest.count({
            where: { event: { vendorId: v.id } },
          }),
          prisma.event.count({
            where: { vendorId: v.id, paidAt: { not: null } },
          }),
        ]);

        return {
          id: v.id,
          name: v.name,
          slug: v.slug,
          logoUrl: v.logoUrl,
          faviconUrl: v.faviconUrl,
          adminEmails: v.adminEmails,
          defaultLocale: v.defaultLocale,
          whatsappPhoneNumberId: v.whatsappPhoneNumberId,
          wabaId: v.wabaId,
          whatsappVerifyToken: v.whatsappVerifyToken,
          supportWhatsapp: v.supportWhatsapp,
          createdAt: v.createdAt.toISOString(),
          eventCount: v._count.events,
          paidEventCount: paidCount,
          guestCount,
        };
      })
    );

    return NextResponse.json({ vendors: vendorStats });
  } catch (error) {
    console.error("GET /api/admin/vendors failed:", error);
    return NextResponse.json(
      { error: "Failed to load vendors" },
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

    const body = await request.json();
    const { id, name, slug, adminEmails, logoUrl, faviconUrl, defaultLocale, whatsappPhoneNumberId, wabaId, whatsappVerifyToken, supportWhatsapp } = body as {
      id: string;
      name?: string;
      slug?: string;
      adminEmails?: string[];
      logoUrl?: string;
      faviconUrl?: string;
      defaultLocale?: string;
      whatsappPhoneNumberId?: string;
      wabaId?: string;
      whatsappVerifyToken?: string;
      supportWhatsapp?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 });
    }

    const existing = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      data.name = name.trim();
    }

    if (slug !== undefined) {
      if (!slug.trim()) {
        return NextResponse.json({ error: "Slug cannot be empty" }, { status: 400 });
      }
      const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const slugTaken = await prisma.vendor.findFirst({
        where: { slug: normalizedSlug, id: { not: id } },
        select: { id: true },
      });
      if (slugTaken) {
        return NextResponse.json({ error: `Slug "${normalizedSlug}" is already taken` }, { status: 409 });
      }
      data.slug = normalizedSlug;
    }

    if (adminEmails !== undefined) {
      const cleanEmails = adminEmails.map((e) => e.trim().toLowerCase()).filter(Boolean);
      if (cleanEmails.length === 0) {
        return NextResponse.json({ error: "At least one admin email is required" }, { status: 400 });
      }
      data.adminEmails = cleanEmails;
    }

    if (logoUrl !== undefined) {
      data.logoUrl = logoUrl.trim() || null;
    }

    if (faviconUrl !== undefined) {
      data.faviconUrl = faviconUrl.trim() || null;
    }

    if (whatsappPhoneNumberId !== undefined) {
      data.whatsappPhoneNumberId = whatsappPhoneNumberId.trim() || null;
    }

    if (wabaId !== undefined) {
      data.wabaId = wabaId.trim() || null;
    }

    if (whatsappVerifyToken !== undefined) {
      data.whatsappVerifyToken = whatsappVerifyToken.trim() || null;
    }

    if (supportWhatsapp !== undefined) {
      data.supportWhatsapp = supportWhatsapp.trim() || null;
    }

    if (defaultLocale !== undefined) {
      data.defaultLocale = defaultLocale === "en" ? "en" : "ar";
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data,
    });

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error("PUT /api/admin/vendors failed:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
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

    const body = await request.json();
    const { name, slug, adminEmails, logoUrl, faviconUrl, defaultLocale, whatsappPhoneNumberId, wabaId, whatsappVerifyToken, supportWhatsapp } = body as {
      name?: string;
      slug?: string;
      adminEmails?: string[];
      logoUrl?: string;
      faviconUrl?: string;
      defaultLocale?: string;
      whatsappPhoneNumberId?: string;
      wabaId?: string;
      whatsappVerifyToken?: string;
      supportWhatsapp?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!slug || !slug.trim()) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

    if (!adminEmails || adminEmails.length === 0) {
      return NextResponse.json(
        { error: "At least one admin email is required" },
        { status: 400 }
      );
    }

    const cleanEmails = adminEmails
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (cleanEmails.length === 0) {
      return NextResponse.json(
        { error: "At least one valid admin email is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.vendor.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Slug "${normalizedSlug}" is already taken` },
        { status: 409 }
      );
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        slug: normalizedSlug,
        adminEmails: cleanEmails,
        logoUrl: logoUrl?.trim() || null,
        faviconUrl: faviconUrl?.trim() || null,
        defaultLocale: defaultLocale === "en" ? "en" : "ar",
        whatsappPhoneNumberId: whatsappPhoneNumberId?.trim() || null,
        wabaId: wabaId?.trim() || null,
        whatsappVerifyToken: whatsappVerifyToken?.trim() || null,
        supportWhatsapp: supportWhatsapp?.trim() || null,
      },
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/vendors failed:", error);
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
