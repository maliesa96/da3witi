import { Prisma, PrismaClient } from "@prisma/client";

function isNotFoundError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";
}

export function createGuestRepository(prisma: PrismaClient) {
  return {
    async incrementAttempts(guestId: string): Promise<number> {
      try {
        const updated = await prisma.guest.update({
          where: { id: guestId },
          data: { whatsappSendAttempts: { increment: 1 } },
          select: { whatsappSendAttempts: true },
        });
        return updated.whatsappSendAttempts;
      } catch (err) {
        // Keep the old behavior (no row updated => no crash).
        if (isNotFoundError(err)) return 0;
        throw err;
      }
    },

    async setError(guestId: string, error: string): Promise<void> {
      await prisma.guest.updateMany({
        where: { id: guestId },
        data: { whatsappSendLastError: error },
      });
    },

    async markSent(guestId: string, messageId: string | null): Promise<void> {
      await prisma.guest.updateMany({
        where: { id: guestId },
        data: {
          whatsappMessageId: messageId,
          status: "sent",
          sentAt: new Date(),
          whatsappSendLastError: null,
          whatsappSendEnqueuedAt: null,
        },
      });
    },

    async markFailed(guestId: string, error: string): Promise<void> {
      await prisma.guest.updateMany({
        where: { id: guestId },
        data: {
          status: "failed",
          whatsappSendLastError: error,
          whatsappSendEnqueuedAt: null,
        },
      });
    },
  };
}

export type GuestRepository = ReturnType<typeof createGuestRepository>;
