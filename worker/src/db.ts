import { Prisma, PrismaClient } from "@prisma/client";
import { broadcastGuestUpdate } from "./broadcast";

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
      // Fetch the guest to get old status and details for broadcasting
      const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        select: {
          id: true,
          eventId: true,
          name: true,
          phone: true,
          status: true,
          inviteCount: true,
          checkedIn: true,
        },
      });

      if (!guest) {
        console.log(`[DB] Guest ${guestId} not found, skipping markSent`);
        return;
      }

      const oldStatus = guest.status;

      await prisma.guest.update({
        where: { id: guestId },
        data: {
          whatsappMessageId: messageId,
          status: "sent",
          sentAt: new Date(),
          whatsappSendLastError: null,
          whatsappSendEnqueuedAt: null,
        },
      });

      // Broadcast the status change
      await broadcastGuestUpdate(guest.eventId, {
        id: guest.id,
        eventId: guest.eventId,
        name: guest.name,
        phone: guest.phone,
        status: "sent",
        inviteCount: guest.inviteCount,
        checkedIn: guest.checkedIn,
        whatsappMessageId: messageId,
        oldStatus,
      });
    },

    async markFailed(guestId: string, error: string): Promise<void> {
      // Fetch the guest to get old status and details for broadcasting
      const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        select: {
          id: true,
          eventId: true,
          name: true,
          phone: true,
          status: true,
          inviteCount: true,
          checkedIn: true,
          whatsappMessageId: true,
        },
      });

      if (!guest) {
        console.log(`[DB] Guest ${guestId} not found, skipping markFailed`);
        return;
      }

      const oldStatus = guest.status;

      await prisma.guest.update({
        where: { id: guestId },
        data: {
          status: "failed",
          whatsappSendLastError: error,
          whatsappSendEnqueuedAt: null,
        },
      });

      // Broadcast the status change
      await broadcastGuestUpdate(guest.eventId, {
        id: guest.id,
        eventId: guest.eventId,
        name: guest.name,
        phone: guest.phone,
        status: "failed",
        inviteCount: guest.inviteCount,
        checkedIn: guest.checkedIn,
        whatsappMessageId: guest.whatsappMessageId,
        oldStatus,
      });
    },
  };
}

export type GuestRepository = ReturnType<typeof createGuestRepository>;
