'use server';

import { prisma } from '@/lib/prisma';

export async function checkInGuest(data: { guestIdentifier: string, eventId: string }) {
  const { guestIdentifier, eventId } = data;
  
  // Try finding by qrCodeId first, then by id
  let guest = await prisma.guest.findUnique({
    where: { qrCodeId: guestIdentifier },
    include: { event: true }
  });

  if (!guest) {
    // If not found by qrCodeId, try as UUID if it looks like one
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestIdentifier);
    if (isUuid) {
      guest = await prisma.guest.findUnique({
        where: { id: guestIdentifier },
        include: { event: true }
      });
    }
  }

  if (!guest) {
    return { success: false, error: 'Guest not found' };
  }

  // Verify the guest belongs to this specific event
  if (guest.eventId !== eventId) {
    return { 
      success: false, 
      error: 'WRONG_EVENT',
      guestName: guest.name,
      eventName: guest.event.title
    };
  }

  if (guest.checkedIn) {
    return { 
      success: false, 
      error: 'ALREADY_CHECKED_IN', 
      guestName: guest.name,
      checkedInAt: guest.checkedInAt 
    };
  }

  await prisma.guest.update({
    where: { id: guest.id },
    data: {
      checkedIn: true,
      checkedInAt: new Date()
    }
  });

  return { 
    success: true, 
    guestName: guest.name, 
    eventName: guest.event.title 
  };
}

