'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { sendInviteTemplate, type MediaType } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';

export async function createEventAndSendInvites(formData: {
  title: string;
  date: string;
  time: string;
  location: string;
  locationName: string;
  message: string;
  qrEnabled: boolean;
  reminderEnabled: boolean;
  isScheduled: boolean;
  scheduledAt?: string;
  imageUrl?: string;
  mediaType?: MediaType;
  mediaFilename?: string;
  guests: { name: string; phone: string }[]
  locale: 'en' | 'ar';
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 1. Create the event in Prisma
  const event = await prisma.event.create({
    data: {
      userId: user.id,
      title: formData.title,
      date: formData.date ? new Date(formData.date) : null,
      time: formData.time,
      location: formData.location,
      locationName: formData.locationName,
      message: formData.message,
      qrEnabled: formData.qrEnabled,
      reminderEnabled: formData.reminderEnabled,
      isScheduled: formData.isScheduled,
      scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : null,
      imageUrl: formData.imageUrl,
      mediaType: formData.mediaType,
      mediaFilename: formData.mediaFilename,
      guests: {
        create: formData.guests.map(guest => ({
          name: guest.name,
          phone: guest.phone,
          status: 'pending'
        }))
      }
    },
    include: {
      guests: true
    }
  });

  // 2. Trigger WhatsApp messages (if not scheduled)
  if (!formData.isScheduled) {
    // In a real production app, you might want to offload this to a background job/queue
    // to avoid timeout issues if you have many guests.
    const sendResults = await Promise.all(
      event.guests.map(async (guest) => {
        const result = await sendInviteTemplate({
          to: guest.phone,
          locale: formData.locale,
          qrEnabled: formData.qrEnabled,
          invitee: guest.name,
          greetingText: formData.message,
          date: formData.date || 'TBD',
          time: formData.time || 'TBD',
          locationName: formData.locationName || 'See invitation',
          location: formData.location,
          mediaUrl: formData.imageUrl,
          mediaType: formData.mediaType,
          mediaFilename: formData.mediaFilename
        });

        // Update guest with WhatsApp message ID for status tracking
        if (result.success && result.messageId) {
          await prisma.guest.update({
            where: { id: guest.id },
            data: { 
              whatsappMessageId: result.messageId,
              status: 'delivered'
            }
          });
        } else {
          // Mark as failed if sending failed
          await prisma.guest.update({
            where: { id: guest.id },
            data: { status: 'failed' }
          });
        }

        return result;
      })
    );
    
    console.log('WhatsApp send results:', sendResults);
  }

  revalidatePath('/dashboard');
  return { success: true, eventId: event.id };
}
