'use server';

import { prisma } from '@/lib/prisma';
import { sendInviteTemplate, type MediaType } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';

export async function addGuest(eventId: string, guestData: { name: string; phone: string }, locale: 'en' | 'ar') {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // 1. Create guest
  const guest = await prisma.guest.create({
    data: {
      eventId,
      name: guestData.name,
      phone: guestData.phone,
      status: 'pending'
    }
  });

  // 2. Send WhatsApp message
  const result = await sendInviteTemplate({
    to: guest.phone,
    locale,
    qrEnabled: event.qrEnabled,
    invitee: guest.name,
    greetingText: event.message || '',
    date: event.date?.toLocaleDateString() || 'TBD',
    time: event.time || 'TBD',
    locationName: event.locationName || 'See invitation',
    location: event.location || undefined,
    mediaUrl: event.imageUrl || undefined,
    mediaType: (event.mediaType as MediaType) || 'image',
    mediaFilename: event.mediaFilename || undefined,
  });

  // 3. Update guest status
  if (result.success && result.messageId) {
    await prisma.guest.update({
      where: { id: guest.id },
      data: { 
        whatsappMessageId: result.messageId,
        status: 'delivered'
      }
    });
  } else {
    await prisma.guest.update({
      where: { id: guest.id },
      data: { status: 'failed' }
    });
  }

  revalidatePath('/dashboard');
  return { success: true };
}

