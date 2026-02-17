import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildWhatsAppImagePayload, buildWhatsAppTextPayload } from '@/lib/whatsapp';
import { enqueueWhatsAppOutbox } from '@/lib/queue/whatsappOutbox';
import { broadcastGuestUpdate, broadcastWhatsAppMessage } from '@/lib/supabase/broadcast';

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * Verification handler for Meta Webhooks
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

/**
 * Get the priority level of a status (higher = more advanced in the flow)
 * This prevents status downgrades from out-of-order webhooks
 */
function getStatusPriority(status: string): number {
  switch (status) {
    case 'pending': return 0;
    case 'sent': return 1;
    case 'delivered': return 2;
    case 'read': return 3;
    case 'confirmed': return 10;
    case 'declined': return 10;
    case 'failed': return -1; // Failed can happen at any point
    default: return 0;
  }
}

/**
 * Get the list of statuses that can be upgraded to the new status
 */
function getUpgradeableStatuses(newStatus: string): string[] {
  const newPriority = getStatusPriority(newStatus);
  
  // Failed status can override sent/delivered/read but not confirmed/declined
  if (newStatus === 'failed') {
    return ['pending', 'sent', 'delivered', 'read'];
  }
  
  // For normal progression, only upgrade from lower priority statuses
  const allStatuses = ['pending', 'sent', 'delivered', 'read', 'confirmed', 'declined', 'failed'];
  return allStatuses.filter(s => getStatusPriority(s) < newPriority);
}

/**
 * Data handler for Meta Webhooks (e.g., message status updates)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Body structure documentation:
    // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
    
    if (body.object === 'whatsapp_business_account') {
      // Log the full body for deep debugging if needed (can be noisy)
      // console.log('WhatsApp Webhook Body:', JSON.stringify(body, null, 2));

      const entries = body.entry;
      for (const entry of entries) {
        const changes = entry.changes;
        for (const change of changes) {
          const value = change.value;
          
          // Handle statuses (sent, delivered, read, failed)
          if (value.statuses) {
            for (const status of value.statuses) {
              const { id, recipient_id, status: messageStatus, timestamp, errors } = status;
              
              if (messageStatus === 'failed') {
                console.error(`❌ Message ${id} to ${recipient_id} FAILED at ${timestamp}`);
                if (errors) {
                  console.error('Failure Details:', JSON.stringify(errors, null, 2));
                }
              } else {
                console.log(`✅ Message ${id} to ${recipient_id}: ${messageStatus} at ${timestamp}`);
              }
              
              // Update the guest status in database
              const upgradeableStatuses = getUpgradeableStatuses(messageStatus);
              
              try {
                // First, find the guest to get their current status and event ID
                const guest = await prisma.guest.findFirst({
                  where: { whatsappMessageId: id },
                  select: { id: true, eventId: true, name: true, phone: true, status: true, inviteCount: true }
                });

                if (!guest) {
                  console.log(`No guest found for messageId ${id}`);
                  continue;
                }

                const oldStatus = guest.status;

                // Only update if current status can be upgraded to the new status
                // This prevents out-of-order webhooks from downgrading status
                if (!upgradeableStatuses.includes(oldStatus)) {
                  console.log(`No update for messageId ${id} (status ${oldStatus} cannot upgrade to ${messageStatus})`);
                  continue;
                }

                // Build the update data with the appropriate timestamp column
                const updateData: { status: string; sentAt?: Date; deliveredAt?: Date; readAt?: Date; failedAt?: Date } = {
                  status: messageStatus,
                };
                const now = new Date();
                if (messageStatus === 'sent') updateData.sentAt = now;
                else if (messageStatus === 'delivered') updateData.deliveredAt = now;
                else if (messageStatus === 'read') updateData.readAt = now;
                else if (messageStatus === 'failed') updateData.failedAt = now;

                await prisma.guest.update({
                  where: { id: guest.id },
                  data: updateData,
                });

                console.log(`Updated guest ${guest.name} to status: ${messageStatus}`);

                // Broadcast the update to connected clients
                await broadcastGuestUpdate(guest.eventId, {
                  id: guest.id,
                  eventId: guest.eventId,
                  name: guest.name,
                  phone: guest.phone,
                  status: messageStatus,
                  inviteCount: guest.inviteCount,
                  oldStatus,
                });
              } catch (dbError) {
                console.error('Database update error:', dbError);
              }
            }
          }

          // Build a lookup of WhatsApp profile names from the contacts array
          const contactNames: Record<string, string> = {};
          if (value.contacts) {
            for (const contact of value.contacts) {
              const waId = contact.wa_id;
              const profileName = contact.profile?.name;
              if (waId && profileName) {
                contactNames[waId] = profileName;
              }
            }
          }

          // Handle incoming messages (for RSVP replies)
          if (value.messages) {
            for (const message of value.messages) {
              const { from, id: msgId, text, button, type, context } = message;
              const repliedMessageId = context?.id;
              
              // Extract body from text message or button click
              let body = '';
              if (type === 'text') {
                body = text?.body?.trim() || '';
              } else if (type === 'button') {
                body = button?.text?.trim() || button?.payload?.trim() || '';
              }
              
              console.log(`📩 Received ${type} from ${from}: "${body || '(no text)'}"${repliedMessageId ? ` (replying to ${repliedMessageId})` : ''}`);

              // Store inbound message for chat view
              try {
                // Try to match to a guest for context
                const phoneSuffix = from.slice(-9);
                const matchedGuest = await prisma.guest.findFirst({
                  where: { phone: { contains: phoneSuffix } },
                  select: { id: true, name: true },
                  orderBy: { createdAt: 'desc' },
                });

                // Use guest name if matched, otherwise use WhatsApp profile name
                const senderName = matchedGuest?.name || contactNames[from] || null;

                const stored = await prisma.whatsAppMessage.create({
                  data: {
                    phone: from,
                    direction: 'inbound',
                    body: body || `(${type} message)`,
                    messageType: type || 'text',
                    whatsappMessageId: msgId || undefined,
                    contextMessageId: repliedMessageId || undefined,
                    guestId: matchedGuest?.id || undefined,
                    guestName: senderName || undefined,
                  },
                });

                // Broadcast to admin chat UI via Supabase Realtime
                await broadcastWhatsAppMessage({
                  id: stored.id,
                  phone: stored.phone,
                  direction: 'inbound',
                  body: stored.body,
                  messageType: stored.messageType,
                  whatsappMessageId: stored.whatsappMessageId,
                  contextMessageId: stored.contextMessageId,
                  guestId: stored.guestId,
                  guestName: stored.guestName,
                  status: stored.status,
                  createdAt: stored.createdAt.toISOString(),
                });
              } catch (storeErr) {
                console.error('Failed to store inbound message:', storeErr);
              }
              
              const isConfirm = body?.toLowerCase() === 'confirm attendance' || body === 'تأكيد الحضور';
              const isDecline = body?.toLowerCase() === 'decline' || body === 'الاعتذار';

              if ((type === 'text' || type === 'button') && (isConfirm || isDecline)) {
                if (!repliedMessageId) {
                  console.log(`ℹ️ Ignored RSVP from ${from}: No context (repliedMessageId) found.`);
                  continue;
                }

                console.log(`🎯 Valid RSVP detected: ${isConfirm ? 'CONFIRM' : 'DECLINE'} from ${from} (replying to ${repliedMessageId})`);
                const isArabic = body === 'تأكيد الحضور' || body === 'الاعتذار';
                
                try {
                  // Find the guest by the specific message they replied to
                  const phoneSuffix = from.slice(-9);
                  const guest = await prisma.guest.findFirst({
                    where: { 
                      whatsappMessageId: repliedMessageId,
                      phone: { contains: phoneSuffix }
                    },
                    include: { event: true }
                  });

                  if (guest) {
                    console.log(`👤 Found guest: ${guest.name} (ID: ${guest.id}) for event: ${guest.event.title}`);
                    
                    if (isConfirm) {
                      // Idempotency check: skip if already confirmed to prevent duplicate messages
                      // (Meta webhooks use at-least-once delivery and may send the same event multiple times)
                      // But allow changing from declined → confirmed
                      if (guest.status === 'confirmed') {
                        console.log(`ℹ️ Skipping confirm for ${guest.name}: already confirmed`);
                        continue;
                      }

                      const oldStatus = guest.status;

                      // Update guest status to confirmed with optimistic locking
                      // Only update if status hasn't changed to 'confirmed' already (prevents race condition)
                      const updateResult = await prisma.guest.updateMany({
                        where: { 
                          id: guest.id,
                          status: { not: 'confirmed' }  // Only update if not already confirmed
                        },
                        data: { 
                          status: 'confirmed',
                          confirmedAt: new Date(),
                        }
                      });

                      // If no rows were updated, another request already confirmed this guest
                      if (updateResult.count === 0) {
                        console.log(`ℹ️ Skipping confirm for ${guest.name}: already confirmed by concurrent request`);
                        continue;
                      }

                      // Broadcast the update to connected clients
                      await broadcastGuestUpdate(guest.eventId, {
                        id: guest.id,
                        eventId: guest.eventId,
                        name: guest.name,
                        phone: guest.phone,
                        status: 'confirmed',
                        inviteCount: guest.inviteCount,
                        oldStatus,
                      });

                      // Send thank you message
                      const thankYouMsg = isArabic 
                        ? `شكراً لتأكيد حضوركم! نترقب رؤيتكم في المناسبة.`
                        : `Thank you for confirming your attendance! We look forward to seeing you at the event.`;
                      
                      await enqueueWhatsAppOutbox(buildWhatsAppTextPayload(from, thankYouMsg), {
                        kind: 'webhook_followup',
                        guestId: guest.id,
                        repliedMessageId,
                      });

                      // Handle QR code if enabled
                      if (guest.event.qrEnabled) {
                        // Generate or use existing QR code ID
                        const qrCodeId = guest.qrCodeId || guest.id;
                        if (!guest.qrCodeId) {
                          await prisma.guest.update({
                            where: { id: guest.id },
                            data: { qrCodeId }
                          });
                        }

                        // Send QR code
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrCodeId}`;
                        const qrCaption = isArabic ? "رمز الدخول الخاص بك" : "Your Entry QR Code";
                        await enqueueWhatsAppOutbox(buildWhatsAppImagePayload(from, qrUrl, qrCaption), {
                          kind: 'webhook_followup',
                          guestId: guest.id,
                          repliedMessageId,
                        });
                      }
                      
                      console.log(`✅ Successfully processed confirmation for ${guest.name}`);
                    } else if (isDecline) {
                      // Idempotency check: skip if already declined to prevent duplicate messages
                      // But allow changing from confirmed → declined
                      if (guest.status === 'declined') {
                        console.log(`ℹ️ Skipping decline for ${guest.name}: already declined`);
                        continue;
                      }

                      const oldStatus = guest.status;
                      
                      // Update guest status to declined with optimistic locking
                      // Only update if status hasn't changed to 'declined' already (prevents race condition)
                      const updateResult = await prisma.guest.updateMany({
                        where: { 
                          id: guest.id,
                          status: { not: 'declined' }  // Only update if not already declined
                        },
                        data: { 
                          status: 'declined',
                          declinedAt: new Date(),
                        }
                      });

                      // If no rows were updated, another request already declined this guest
                      if (updateResult.count === 0) {
                        console.log(`ℹ️ Skipping decline for ${guest.name}: already declined by concurrent request`);
                        continue;
                      }

                      // Broadcast the update to connected clients
                      await broadcastGuestUpdate(guest.eventId, {
                        id: guest.id,
                        eventId: guest.eventId,
                        name: guest.name,
                        phone: guest.phone,
                        status: 'declined',
                        inviteCount: guest.inviteCount,
                        oldStatus,
                      });

                      const declineMsg = isArabic
                        ? `شكراً لإبلاغنا. يؤسفنا عدم تمكنكم من الحضور. سنفتقدكم!`
                        : `Thank you for letting us know. We're sorry you can't make it. You will be missed!`;
                      
                      await enqueueWhatsAppOutbox(buildWhatsAppTextPayload(from, declineMsg), {
                        kind: 'webhook_followup',
                        guestId: guest.id,
                        repliedMessageId,
                      });
                      
                      console.log(`✅ Successfully processed decline for ${guest.name}`);
                    }
                  } else {
                    console.warn(`⚠️ No guest found in DB matching phone suffix ${phoneSuffix} and message ID ${repliedMessageId}`);
                  }
                } catch (err) {
                  console.error('❌ Error handling RSVP database operations:', err);
                }
              } else {
                console.log(`ℹ️ Ignored message from ${from}: Not a valid RSVP keyword.`);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
