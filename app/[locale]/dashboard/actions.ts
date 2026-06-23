'use server';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { buildInviteTemplatePayload, buildNoReplyReminderPayload, type MediaType } from '@/lib/whatsapp';
import { normalizePhoneToE164 } from '@/lib/phone';
import { enqueueWhatsAppOutbox, enqueueWhatsAppOutboxBatch } from '@/lib/queue/whatsappOutbox';
import { shouldEnqueueWhatsAppInvite } from '@/lib/whatsappSendEligibility';
import { broadcastGuestInsert } from '@/lib/supabase/broadcast';
import { MAX_GUESTS_PER_EVENT } from '@/lib/limits';
import { isAdmin } from '@/lib/admin';
import { parseCustomerPermissions, isVendorMode, isVendorAdmin, SITE_NAME } from '@/lib/vendor';
import { sendCustomerInvitationEmail, sendExistingCustomerInvitationEmail } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppOrigin } from '@/lib/getAppOrigin';

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

function canAccessEvent(
  event: { userId: string | null; customerEmail: string | null; customerUserId: string | null; vendorId: string | null; attendantEmails?: string[] },
  user: { id: string; email?: string | undefined }
): boolean {
  if (event.userId === user.id) return true;
  if (isAdmin(user.email)) return true;
  if (event.vendorId && event.customerEmail && user.email && event.customerEmail === user.email) return true;
  if (event.vendorId && event.customerUserId && event.customerUserId === user.id) return true;
  if (event.vendorId && user.email && event.attendantEmails?.includes(user.email)) return true;
  return false;
}

async function canWriteEvent(
  event: { userId: string | null; customerEmail: string | null; customerUserId: string | null; vendorId: string | null },
  user: { id: string; email?: string | undefined }
): Promise<boolean> {
  if (!canAccessEvent(event, user)) return false;
  if (isVendorMode && event.vendorId) {
    if (event.userId === user.id) return true;
    if (isAdmin(user.email)) return true;
    return isVendorAdmin(user.email);
  }
  return true;
}

export async function addGuests(
  eventId: string,
  guests: { name: string; phone: string; inviteCount?: number | string }[]
) {
  const user = await getAuthedUser();

  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (!(await canWriteEvent(event, user))) {
    throw new Error('Forbidden');
  }

  // Enforce max guest limit (guest rows, not invitees)
  const currentGuestCount = event.guestCountTotal;

  const cleaned = (guests || [])
    .map(g => ({
      name: String(g.name || '').trim(),
      phone: String(g.phone || '').trim(),
      inviteCount: g.inviteCount,
    }))
    .filter(g => g.name && g.phone);

  if (cleaned.length === 0) {
    return {
      success: true,
      created: 0,
      guests: [] as Array<{
        id: string;
        name: string;
        phone: string;
        inviteCount: number;
        status: string;
        checkedIn: boolean;
        whatsappMessageId: string | null;
      }>,
    };
  }

  if (currentGuestCount + cleaned.length > MAX_GUESTS_PER_EVENT) {
    const remaining = MAX_GUESTS_PER_EVENT - currentGuestCount;
    throw new Error(`GUEST_LIMIT_EXCEEDED:${remaining}`);
  }

  const validated = cleaned.map((g) => {
    if (g.name.length < 2) throw new Error('NAME_TOO_SHORT');
    const res = normalizePhoneToE164(g.phone);
    if (!res.ok) throw new Error('INVALID_PHONE');

    let inviteCount: number | undefined = undefined;
    if (event.guestsEnabled && typeof g.inviteCount !== 'undefined') {
      const n = typeof g.inviteCount === 'string' ? Number(g.inviteCount) : g.inviteCount;
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 50) {
        throw new Error('INVALID_INVITE_COUNT');
      }
      inviteCount = n;
    }

    return { ...g, phone: res.phone, inviteCount };
  });

  // Check for duplicate phone numbers within the submitted batch
  const phonesInBatch = validated.map(g => g.phone);
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

  // Check for duplicate phone numbers against existing guests in the event
  const existingGuests = await prisma.guest.findMany({
    where: { eventId, phone: { in: [...uniquePhones] } },
    select: { phone: true },
  });
  if (existingGuests.length > 0) {
    throw new Error(`DUPLICATE_PHONE:${existingGuests[0].phone}`);
  }

  // Bulk create guests and return the created records
  const createdGuests = await prisma.guest.createManyAndReturn({
    data: validated.map((g) => ({
      eventId,
      name: g.name,
      phone: g.phone,
      status: 'pending',
      ...(event.guestsEnabled ? { inviteCount: g.inviteCount ?? 1 } : {}),
    })),
    select: {
      id: true,
      name: true,
      phone: true,
      inviteCount: true,
      status: true,
      checkedIn: true,
      whatsappMessageId: true,
    },
  });

  // Broadcast guest insert events for realtime updates
  await Promise.all(
    createdGuests.map((guest) =>
      broadcastGuestInsert(eventId, {
        id: guest.id,
        eventId,
        name: guest.name,
        phone: guest.phone,
        status: guest.status,
        inviteCount: guest.inviteCount,
        checkedIn: guest.checkedIn,
        whatsappMessageId: guest.whatsappMessageId,
      })
    )
  );

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

  if (!canAccessEvent(event, user)) {
    throw new Error('Forbidden');
  }

  // For vendor customers, check if they have permission to send invites
  const isOwner = event.userId === user.id;
  if (!isOwner && event.vendorId) {
    const perms = parseCustomerPermissions(event.customerPermissions);
    if (!perms.canSendInvites) {
      throw new Error('Forbidden');
    }
  }

  // Check if event has been paid for
  if (!event.paidAt) {
    throw new Error('Payment required to send invites');
  }

  // Only send to guests that haven't been successfully sent yet.
  // - pending: never sent
  // - failed: previously attempted but failed
  const guestsToSend = event.guests.filter((g) => shouldEnqueueWhatsAppInvite(g));

  if (guestsToSend.length === 0) {
    return { success: true, queued: 0 };
  }

  const now = new Date();
  const jobs = guestsToSend.map((guest) => ({
    payload: buildInviteTemplatePayload({
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
    }),
    meta: { kind: 'invite' as const, guestId: guest.id, eventId, locale, vendorId: event.vendorId },
  }));

  await Promise.all([
    enqueueWhatsAppOutboxBatch(jobs),
    prisma.guest.updateMany({
      where: { id: { in: guestsToSend.map((g) => g.id) } },
      data: {
        whatsappSendEnqueuedAt: now,
        whatsappSendLastError: null,
      },
    }),
  ]);

  return { success: true, queued: guestsToSend.length };
}

export async function getGuestsPaginated(
  eventId: string,
  options: { page?: number; pageSize?: number; search?: string; statuses?: string[] } = {}
) {
  const user = await getAuthedUser();
  const { page = 1, pageSize = 50, search = '', statuses = [] } = options;
  const normalizedStatuses = (statuses || [])
    .map((s) => String(s || '').trim())
    .filter(Boolean);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (!canAccessEvent(event, user)) {
    throw new Error('Forbidden');
  }

  const skip = (page - 1) * pageSize;

  // Build where clause for search
  const whereClause = {
    eventId,
    ...(normalizedStatuses.length ? { status: { in: normalizedStatuses } } : {}),
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
  const [guests, totalCount, statusCounts, filteredInviteAgg, allInviteAgg] = await Promise.all([
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
        sentAt: true,
        noReplyReminderSentAt: true,
        noReplyReminderDeliveredAt: true,
        noReplyReminderReadAt: true,
        noReplyReminderFailedAt: true,
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
    prisma.guest.aggregate({
      where: whereClause,
      _sum: { inviteCount: true },
    }),
    prisma.guest.aggregate({
      where: { eventId },
      _sum: { inviteCount: true },
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
    inviteTotals: {
      filtered: filteredInviteAgg._sum.inviteCount ?? 0,
      all: allInviteAgg._sum.inviteCount ?? 0,
    },
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

  if (!(await canWriteEvent(guest.event, user))) {
    throw new Error('Forbidden');
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

  if (!(await canWriteEvent(event, user))) {
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

export async function updateGuest(
  guestId: string,
  guestData: { name: string; phone: string; inviteCount?: number | string }
) {
  const user = await getAuthedUser();

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: { event: true },
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  if (!(await canWriteEvent(guest.event, user))) {
    throw new Error('Forbidden');
  }

  // Only allow editing if pending/failed (i.e., not successfully invited yet)
  if (guest.status !== 'pending' && guest.status !== 'failed') {
    throw new Error('Cannot edit guest who has already been invited');
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

  // Check for duplicate phone number against other guests in the same event
  if (phoneRes.phone !== guest.phone) {
    const existingWithPhone = await prisma.guest.findFirst({
      where: { eventId: guest.eventId, phone: phoneRes.phone, id: { not: guestId } },
      select: { id: true },
    });
    if (existingWithPhone) {
      throw new Error(`DUPLICATE_PHONE:${phoneRes.phone}`);
    }
  }

  let inviteCount: number | undefined = undefined;
  if (typeof guestData.inviteCount !== 'undefined') {
    const n = typeof guestData.inviteCount === 'string' ? Number(guestData.inviteCount) : guestData.inviteCount;
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 50) {
      throw new Error('INVALID_INVITE_COUNT');
    }
    inviteCount = n;
  }

  const updated = await prisma.guest.update({
    where: { id: guestId },
    data: {
      name,
      phone: phoneRes.phone,
      ...(typeof inviteCount === 'number' ? { inviteCount } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      inviteCount: true,
      status: true,
      checkedIn: true,
      whatsappMessageId: true,
    },
  });

  return { success: true, guest: updated };
}

export async function resendCustomerEmail(eventId: string, locale: 'en' | 'ar') {
  const user = await getAuthedUser();

  if (!isVendorMode || !(await isVendorAdmin(user.email))) {
    throw new Error('Forbidden');
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      vendorId: true,
      customerEmail: true,
      userId: true,
    },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (!event.vendorId || !event.customerEmail) {
    throw new Error('No customer email on this event');
  }

  const appUrl = await getAppOrigin();
  const setPasswordPath = `/${locale}/setup-password?eventId=${event.id}`;

  const adminSupabase = createAdminClient();

  let linkData;
  const inviteRedirectTo = `${appUrl}/${locale}/auth/callback?next=${encodeURIComponent(setPasswordPath)}`;

  const inviteResult = await adminSupabase.auth.admin.generateLink({
    type: 'invite',
    email: event.customerEmail,
    options: { redirectTo: inviteRedirectTo },
  });

  if (inviteResult.error) {
    const loginUrl = `${appUrl}/${locale}/login`;

    await sendExistingCustomerInvitationEmail({
      customerEmail: event.customerEmail,
      eventTitle: event.title,
      loginUrl,
      siteName: SITE_NAME || 'Da3witi',
      locale,
    });
  } else {
    linkData = inviteResult.data;

    if (!linkData?.properties?.action_link) {
      throw new Error('Auth link generation returned no action link');
    }

    const supabaseLink = new URL(linkData.properties.action_link);
    const token_hash = supabaseLink.searchParams.get('token_hash') || supabaseLink.searchParams.get('token');
    const type = supabaseLink.searchParams.get('type') || 'invite';

    const inviteUrl = `${appUrl}/${locale}/auth/confirm?token_hash=${token_hash}&type=${type}&next=${encodeURIComponent(setPasswordPath)}`;

    await sendCustomerInvitationEmail({
      customerEmail: event.customerEmail,
      eventTitle: event.title,
      inviteUrl,
      siteName: SITE_NAME || 'Da3witi',
      locale,
    });
  }

  return { success: true };
}

export async function addAttendant(eventId: string, email: string, locale: 'en' | 'ar') {
  const user = await getAuthedUser();

  if (!isVendorMode || !(await isVendorAdmin(user.email))) {
    throw new Error('Forbidden');
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, vendorId: true, attendantEmails: true },
  });

  if (!event || !event.vendorId) {
    throw new Error('Event not found');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('INVALID_EMAIL');
  }

  if (event.attendantEmails.includes(normalizedEmail)) {
    throw new Error('ALREADY_ADDED');
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { attendantEmails: { push: normalizedEmail } },
  });

  const appUrl = await getAppOrigin();
  const adminSupabase = createAdminClient();

  const loginPath = `/${locale}/login`;
  const inviteRedirectTo = `${appUrl}/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/dashboard`)}`;

  const inviteResult = await adminSupabase.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
    options: { redirectTo: inviteRedirectTo },
  });

  if (inviteResult.error) {
    await sendExistingCustomerInvitationEmail({
      customerEmail: normalizedEmail,
      eventTitle: event.title,
      loginUrl: `${appUrl}${loginPath}`,
      siteName: SITE_NAME || 'Da3witi',
      locale,
    });
  } else {
    const linkData = inviteResult.data;
    if (linkData?.properties?.action_link) {
      const supabaseLink = new URL(linkData.properties.action_link);
      const token_hash = supabaseLink.searchParams.get('token_hash') || supabaseLink.searchParams.get('token');
      const type = supabaseLink.searchParams.get('type') || 'invite';
      const inviteUrl = `${appUrl}/${locale}/auth/confirm?token_hash=${token_hash}&type=${type}&next=${encodeURIComponent(`/${locale}/dashboard`)}`;

      await sendCustomerInvitationEmail({
        customerEmail: normalizedEmail,
        eventTitle: event.title,
        inviteUrl,
        siteName: SITE_NAME || 'Da3witi',
        locale,
      });
    }
  }

  return { success: true };
}

export async function removeAttendant(eventId: string, email: string) {
  const user = await getAuthedUser();

  if (!isVendorMode || !(await isVendorAdmin(user.email))) {
    throw new Error('Forbidden');
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, vendorId: true, attendantEmails: true },
  });

  if (!event || !event.vendorId) {
    throw new Error('Event not found');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const updated = event.attendantEmails.filter((e) => e !== normalizedEmail);

  await prisma.event.update({
    where: { id: eventId },
    data: { attendantEmails: updated },
  });

  return { success: true };
}

export async function getAttendants(eventId: string) {
  const user = await getAuthedUser();

  if (!isVendorMode || !(await isVendorAdmin(user.email))) {
    throw new Error('Forbidden');
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { attendantEmails: true, vendorId: true },
  });

  if (!event || !event.vendorId) {
    throw new Error('Event not found');
  }

  return { attendantEmails: event.attendantEmails };
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export async function sendNoReplyReminder(guestId: string, locale: 'en' | 'ar') {
  const user = await getAuthedUser();

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: {
      id: true,
      phone: true,
      status: true,
      sentAt: true,
      noReplyReminderSentAt: true,
      noReplyReminderDeliveredAt: true,
      noReplyReminderFailedAt: true,
      event: {
        select: {
          id: true,
          userId: true,
          vendorId: true,
          customerEmail: true,
          customerUserId: true,
          paidAt: true,
          title: true,
        },
      },
    },
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  if (!canAccessEvent(guest.event, user)) {
    throw new Error('Forbidden');
  }

  if (!(await canWriteEvent(guest.event, user))) {
    throw new Error('Forbidden');
  }

  if (!guest.event.paidAt) {
    throw new Error('Payment required');
  }

  // Guard: guest must have received the invite but not RSVP'd
  const eligibleStatuses = ['sent', 'delivered', 'read'];
  if (!eligibleStatuses.includes(guest.status)) {
    throw new Error('Guest is not eligible for a reminder');
  }

  // Guard: invite must have been sent at least 24 hours ago
  if (!guest.sentAt) {
    throw new Error('Invite has not been sent yet');
  }
  const hoursSinceSent = Date.now() - new Date(guest.sentAt).getTime();
  if (hoursSinceSent < TWENTY_FOUR_HOURS_MS) {
    throw new Error('Must wait 24 hours after invite was sent');
  }

  // Guard: determine if sending is allowed
  const canSend =
    !guest.noReplyReminderSentAt ||
    !!guest.noReplyReminderFailedAt ||
    (!guest.noReplyReminderDeliveredAt &&
      Date.now() - new Date(guest.noReplyReminderSentAt).getTime() >= TWELVE_HOURS_MS);

  if (!canSend) {
    throw new Error('Reminder already sent and awaiting delivery');
  }

  // Build payload
  const payload = buildNoReplyReminderPayload({
    to: guest.phone,
    locale,
    eventName: guest.event.title,
  });

  // Clear previous reminder state on resend
  await prisma.guest.update({
    where: { id: guest.id },
    data: {
      noReplyReminderSentAt: null,
      noReplyReminderDeliveredAt: null,
      noReplyReminderReadAt: null,
      noReplyReminderFailedAt: null,
      noReplyReminderMessageId: null,
      whatsappSendLastError: null,
    },
  });

  await enqueueWhatsAppOutbox(payload, {
    kind: 'no_reply_reminder',
    guestId: guest.id,
    eventId: guest.event.id,
    locale,
    vendorId: guest.event.vendorId,
  });

  return { success: true };
}

