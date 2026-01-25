'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { sendInviteTemplate, type MediaType } from '@/lib/whatsapp';
import { normalizePhoneToE164 } from '@/lib/phone';

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function addGuest(eventId: string, guestData: { name: string; phone: string }) {
  const user = await getAuthedUser();

  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.userId !== user.id) {
    throw new Error('Forbidden');
  }

  const name = String(guestData.name || '').trim();
  const phoneRaw = String(guestData.phone || '').trim();
  if (name.length > 0 && name.length < 2) {
    throw new Error('NAME_TOO_SHORT');
  }
  const phoneRes = normalizePhoneToE164(phoneRaw);
  if (!name || !phoneRaw || !phoneRes.ok) {
    throw new Error('INVALID_PHONE');
  }

  // 1. Create guest
  const guest = await prisma.guest.create({
    data: {
      eventId,
      name,
      phone: phoneRes.phone,
      status: 'pending'
    }
  });

  // Note: Not calling revalidatePath - client state handles updates
  return { success: true, guestId: guest.id };
}

export async function addGuests(eventId: string, guests: { name: string; phone: string }[]) {
  const user = await getAuthedUser();

  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.userId !== user.id) {
    throw new Error('Forbidden');
  }

  const cleaned = (guests || [])
    .map(g => ({
      name: String(g.name || '').trim(),
      phone: String(g.phone || '').trim(),
    }))
    .filter(g => g.name && g.phone);

  if (cleaned.length === 0) {
    return { success: true, created: 0, guests: [] as Array<{ id: string; name: string; phone: string; status: string; checkedIn: boolean; whatsappMessageId: string | null }> };
  }

  const validated = cleaned.map((g) => {
    if (g.name.length < 2) throw new Error('NAME_TOO_SHORT');
    const res = normalizePhoneToE164(g.phone);
    if (!res.ok) throw new Error('INVALID_PHONE');
    return { ...g, phone: res.phone };
  });

  // Bulk create guests and return the created records
  const createdGuests = await prisma.guest.createManyAndReturn({
    data: validated.map((g) => ({
      eventId,
      name: g.name,
      phone: g.phone,
      status: 'pending',
    })),
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      checkedIn: true,
      whatsappMessageId: true,
    },
  });

  return { success: true, created: createdGuests.length, guests: createdGuests };
}

export async function sendInvitesForEvent(eventId: string, locale: 'en' | 'ar') {
  const user = await getAuthedUser();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { guests: true }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.userId !== user.id) {
    throw new Error('Forbidden');
  }

  // Check if event has been paid for
  if (!event.paidAt) {
    throw new Error('Payment required to send invites');
  }

  // Only send to guests that haven't been successfully sent yet.
  // - pending: never sent
  // - failed: previously attempted but failed
  const guestsToSend = event.guests.filter(
    (g) => (g.status === 'pending' || g.status === 'failed') && !g.whatsappMessageId
  );

  if (guestsToSend.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const results = await Promise.all(
    guestsToSend.map(async (guest) => {
      const result = await sendInviteTemplate({
        to: guest.phone,
        locale,
        qrEnabled: event.qrEnabled,
        guestsEnabled: event.guestsEnabled ?? false,
        inviteCount: guest.inviteCount,
        invitee: guest.name,
        greetingText: event.message || '',
        date: event.date,
        time: event.time,
        locationName: event.locationName || 'See invitation',
        location: event.location || '',
        mediaUrl: event.imageUrl || '',
        mediaType: (event.mediaType as MediaType) || 'image',
        mediaFilename: event.mediaFilename || undefined,
      });

      if (result.success && result.messageId) {
        await prisma.guest.update({
          where: { id: guest.id },
          data: {
            whatsappMessageId: result.messageId,
            status: 'sent',
          },
        });
        return { ok: true };
      }

      await prisma.guest.update({
        where: { id: guest.id },
        data: { status: 'failed' },
      });
      return { ok: false };
    })
  );

  const sent = results.filter(r => r.ok).length;
  const failed = results.length - sent;

  return { success: true, sent, failed };
}

export async function getGuestsPaginated(
  eventId: string,
  options: { page?: number; pageSize?: number; search?: string } = {}
) {
  const user = await getAuthedUser();
  const { page = 1, pageSize = 50, search = '' } = options;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.userId !== user.id) {
    throw new Error('Forbidden');
  }

  const skip = (page - 1) * pageSize;

  // Build where clause for search
  const whereClause = {
    eventId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  // Fetch guests and total count in parallel
  const [guests, totalCount, statusCounts] = await Promise.all([
    prisma.guest.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        inviteCount: true,
        status: true,
        checkedIn: true,
        whatsappMessageId: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.guest.count({ where: whereClause }),
    // Get status counts for the entire event (not filtered by search)
    prisma.guest.groupBy({
      by: ['status'],
      where: { eventId },
      _count: { status: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Convert status counts to a more usable format
  const stats = {
    total: 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    confirmed: 0,
    declined: 0,
    failed: 0,
  };

  for (const sc of statusCounts) {
    const count = sc._count.status;
    stats.total += count;
    if (sc.status in stats) {
      stats[sc.status as keyof typeof stats] = count;
    }
  }

  return {
    guests,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    stats,
  };
}

export async function deleteGuest(guestId: string) {
  const user = await getAuthedUser();

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { event: true }
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  if (guest.event.userId !== user.id) {
    throw new Error('Forbidden');
  }

  // Only allow deleting if not sent or failed
  if (guest.status !== 'pending' && guest.status !== 'failed') {
    throw new Error('Cannot delete guest who has already been invited');
  }

  await prisma.guest.delete({
    where: { id: guestId }
  });

  return;
}

export async function deleteAllGuests(eventId: string) {
  const user = await getAuthedUser();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.userId !== user.id) {
    throw new Error('Forbidden');
  }

  // Delete all guests for this event (only pending/failed ones for safety)
  const result = await prisma.guest.deleteMany({
    where: {
      eventId,
      status: { in: ['pending', 'failed'] },
    },
  });

  return { success: true, deleted: result.count };
}

