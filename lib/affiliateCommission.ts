import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isVendorMode } from "@/lib/vendor";

/**
 * When an event is marked paid, create one affiliate commission row if:
 * - primary deployment (not vendor mode)
 * - event has userId
 * - user has locked affiliate attribution and affiliate is active
 * Idempotent: unique on userId / eventId causes P2002 to be ignored.
 */
export async function recordAffiliateCommissionForPaidEvent(eventId: string): Promise<void> {
  if (isVendorMode) return;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, userId: true },
  });

  if (!event?.userId) return;

  const attribution = await prisma.affiliateAttribution.findUnique({
    where: { userId: event.userId },
    select: {
      affiliateId: true,
      affiliate: { select: { commissionFils: true, active: true } },
    },
  });

  if (!attribution?.affiliate.active) return;

  try {
    await prisma.affiliateCommission.create({
      data: {
        affiliateId: attribution.affiliateId,
        userId: event.userId,
        eventId: event.id,
        amountFils: attribution.affiliate.commissionFils,
        status: "owed",
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return;
    }
    throw e;
  }
}
