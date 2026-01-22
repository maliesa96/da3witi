'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { type MediaType } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';

export async function createEvent(formData: {
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

  revalidatePath('/dashboard');
  return { success: true, eventId: event.id };
}
