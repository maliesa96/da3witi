import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppText, sendWhatsAppImage } from '@/lib/whatsapp';

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
                // Only update if current status can be upgraded to the new status
                // This prevents out-of-order webhooks from downgrading status
                const updateResult = await prisma.guest.updateMany({
                  where: { 
                    whatsappMessageId: id,
                    status: {
                      in: upgradeableStatuses
                    }
                  },
                  data: { status: messageStatus }
                });
                
                if (updateResult.count > 0) {
                  console.log(`Updated ${updateResult.count} guest(s) to status: ${messageStatus}`);
                } else {
                  console.log(`No guest updated for messageId ${id} (status may already be more advanced)`);
                }
              } catch (dbError) {
                console.error('Database update error:', dbError);
              }
            }
          }

          // Handle incoming messages (for RSVP replies)
          if (value.messages) {
            for (const message of value.messages) {
              const { from, text, button, type, context } = message;
              const repliedMessageId = context?.id;
              
              // Extract body from text message or button click
              let body = '';
              if (type === 'text') {
                body = text?.body?.trim() || '';
              } else if (type === 'button') {
                body = button?.text?.trim() || button?.payload?.trim() || '';
              }
              
              console.log(`📩 Received ${type} from ${from}: "${body || '(no text)'}"${repliedMessageId ? ` (replying to ${repliedMessageId})` : ''}`);
              
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
                      // ... existing confirmation logic ...
                      // Update guest status to confirmed
                      await prisma.guest.update({
                        where: { id: guest.id },
                        data: { status: 'confirmed' }
                      });

                      // Send thank you message
                      const thankYouMsg = isArabic 
                        ? `شكراً لتأكيد حضوركم! نترقب رؤيتكم في المناسبة.`
                        : `Thank you for confirming your attendance! We look forward to seeing you at the event.`;
                      
                      const textResult = await sendWhatsAppText(from, thankYouMsg);
                      if (!textResult.success) {
                        console.error(`❌ Failed to send thank you text to ${from}:`, textResult.error);
                      }

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
                        const imageResult = await sendWhatsAppImage(from, qrUrl, qrCaption);
                        if (!imageResult.success) {
                          console.error(`❌ Failed to send QR image to ${from}:`, imageResult.error);
                        }
                      }
                      
                      console.log(`✅ Successfully processed confirmation for ${guest.name}`);
                    } else if (isDecline) {
                      await prisma.guest.update({
                        where: { id: guest.id },
                        data: { status: 'declined' }
                      });

                      const declineMsg = isArabic
                        ? `شكراً لإبلاغنا. يؤسفنا عدم تمكنكم من الحضور. سنفتقدكم!`
                        : `Thank you for letting us know. We're sorry you can't make it. You will be missed!`;
                      
                      const textResult = await sendWhatsAppText(from, declineMsg);
                      if (!textResult.success) {
                        console.error(`❌ Failed to send decline text to ${from}:`, textResult.error);
                      }
                      
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
