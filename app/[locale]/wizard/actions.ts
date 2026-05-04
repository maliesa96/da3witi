'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { type MediaType } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';
import { normalizePhoneToE164 } from '@/lib/phone';
import { MAX_INVITE_MESSAGE_CHARS, countMessageChars, renderInviteMessage, validateWhatsAppText } from '@/lib/inviteMessage';
import { MAX_GUESTS_PER_EVENT } from '@/lib/limits';
import { VENDOR_ID, isVendorMode, isVendorAdmin, SITE_NAME, type CustomerPermissions, DEFAULT_CUSTOMER_PERMISSIONS } from '@/lib/vendor';
import { sendCustomerInvitationEmail, sendExistingCustomerInvitationEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppOrigin } from '@/lib/getAppOrigin';

export async function createEvent(formData: {
  title: string;
  date: string;
  time: string;
  location: string;
  locationName: string;
  message: string;
  qrEnabled: boolean;
  guestsEnabled: boolean;
  reminderEnabled: boolean;
  imageUrl?: string;
  mediaType?: MediaType;
  mediaFilename?: string;
  guests: { name: string; phone: string; inviteCount?: number }[]
  locale: 'en' | 'ar';
  customerEmail?: string;
  customerPermissions?: CustomerPermissions;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // In vendor mode, only vendor admins can create events
  if (isVendorMode && !(await isVendorAdmin(user.email))) {
    throw new Error('Forbidden');
  }

  const guestsValidated = (formData.guests || []).map((guest) => {
    const name = String(guest.name || '').trim();
    const phoneRaw = String(guest.phone || '').trim();
    if (name.length > 0 && name.length < 2) throw new Error('NAME_TOO_SHORT');
    const res = normalizePhoneToE164(phoneRaw);
    if (!name || !phoneRaw || !res.ok) throw new Error('INVALID_PHONE');
    return {
      name,
      phone: res.phone,
      inviteCount: guest.inviteCount || 1,
    };
  });

  // Enforce max guest limit (guest rows, not invitees)
  if (guestsValidated.length > MAX_GUESTS_PER_EVENT) {
    throw new Error(`GUEST_LIMIT_EXCEEDED:${MAX_GUESTS_PER_EVENT}`);
  }

  // Check for duplicate phone numbers within the batch
  const phonesInBatch = guestsValidated.map(g => g.phone);
  const uniquePhones = new Set(phonesInBatch);
  if (uniquePhones.size < phonesInBatch.length) {
    const seen = new Set<string>();
    const dupPhone = phonesInBatch.find(p => {
      if (seen.has(p)) return true;
      seen.add(p);
      return false;
    })!;
    throw new Error(`DUPLICATE_PHONE:${dupPhone}`);
  }

  // Validate WhatsApp text restrictions (no newlines, tabs, or 5+ consecutive spaces)
  const messageViolation = validateWhatsAppText(formData.message ?? '');
  if (messageViolation) {
    throw new Error(`MESSAGE_INVALID_TEXT:${messageViolation}`);
  }

  // Validate rendered invite message length (includes template wrapper + parameters)
  const mediaType: MediaType = formData.mediaType ?? 'image';
  const inviteesToValidate =
    guestsValidated.length > 0
      ? guestsValidated.map(g => ({ name: g.name, inviteCount: g.inviteCount }))
      : [{ name: formData.locale === 'ar' ? 'ضيف' : 'Guest', inviteCount: 2 }];

  for (const g of inviteesToValidate) {
    const rendered = renderInviteMessage({
      locale: formData.locale,
      qrEnabled: formData.qrEnabled,
      guestsEnabled: formData.guestsEnabled,
      mediaType,
      invitee: g.name,
      greetingText: formData.message ?? '',
      date: formData.date ?? '',
      time: formData.time ?? '',
      locationName: formData.locationName ?? '',
      inviteCount: g.inviteCount,
    });

    if (countMessageChars(rendered) > MAX_INVITE_MESSAGE_CHARS) {
      throw new Error('MESSAGE_TOO_LONG');
    }
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        userId: user.id,
        title: formData.title,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        locationName: formData.locationName,
        message: formData.message,
        qrEnabled: formData.qrEnabled,
        guestsEnabled: formData.guestsEnabled,
        reminderEnabled: formData.reminderEnabled,
        imageUrl: formData.imageUrl,
        mediaType: formData.mediaType,
        mediaFilename: formData.mediaFilename,
        locale: formData.locale,
        ...(isVendorMode && VENDOR_ID ? {
          vendorId: VENDOR_ID,
          customerEmail: formData.customerEmail || null,
          customerPermissions: formData.customerPermissions ?? DEFAULT_CUSTOMER_PERMISSIONS,
          paidAt: new Date(),
        } : {}),
        guests: {
          create: guestsValidated.map(guest => ({
            name: guest.name,
            phone: guest.phone,
            inviteCount: guest.inviteCount,
            status: 'pending'
          }))
        }
      },
      include: {
        guests: true
      }
    });

    if (isVendorMode && formData.customerEmail) {
      const appUrl = await getAppOrigin();
      const setPasswordPath = `/${formData.locale}/setup-password?eventId=${created.id}`;

      const adminSupabase = createAdminClient();

      let linkData;
      const inviteRedirectTo = `${appUrl}/${formData.locale}/auth/callback?next=${encodeURIComponent(setPasswordPath)}`;

      const inviteResult = await adminSupabase.auth.admin.generateLink({
        type: 'invite',
        email: formData.customerEmail,
        options: { redirectTo: inviteRedirectTo },
      });

      if (inviteResult.error) {
        const loginUrl = `${appUrl}/${formData.locale}/login`;

        await sendExistingCustomerInvitationEmail({
          customerEmail: formData.customerEmail,
          eventTitle: formData.title,
          loginUrl,
          siteName: SITE_NAME || 'Da3witi',
          locale: formData.locale,
        });
      } else {
        linkData = inviteResult.data;

        if (!linkData?.properties?.action_link) {
          throw new Error('Auth link generation returned no action link');
        }

        const supabaseLink = new URL(linkData.properties.action_link);
        const token_hash = supabaseLink.searchParams.get('token_hash') || supabaseLink.searchParams.get('token');
        const type = supabaseLink.searchParams.get('type') || 'invite';

        const inviteUrl = `${appUrl}/${formData.locale}/auth/confirm?token_hash=${token_hash}&type=${type}&next=${encodeURIComponent(setPasswordPath)}`;

        await sendCustomerInvitationEmail({
          customerEmail: formData.customerEmail,
          eventTitle: formData.title,
          inviteUrl,
          siteName: SITE_NAME || 'Da3witi',
          locale: formData.locale,
        });
      }
    }

    return created;
  });

  revalidatePath('/dashboard');
  return { success: true, eventId: event.id };
}
