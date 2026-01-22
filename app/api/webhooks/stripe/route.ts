import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe Webhook Handler (Backup)
 * 
 * The primary event creation happens in the success page synchronously.
 * This webhook serves as a backup for edge cases where users don't reach
 * the success page (e.g., browser crash, network issues after payment).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 400 }
        );
      }
    } else {
      // In development without webhook secret, parse the event directly
      console.warn('Webhook secret not configured - skipping signature verification');
      event = JSON.parse(body) as Stripe.Event;
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process if payment is confirmed
      if (session.payment_status === 'paid') {
        const action = session.metadata?.action;
        
        if (action === 'send_invites') {
          // Handle send invites payment
          await markEventAsPaid(session);
        } else {
          // Handle event creation payment (legacy)
          await createEventIfNotExists(session);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function markEventAsPaid(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  
  if (!metadata?.userId || !metadata?.eventId) {
    console.error('Missing required metadata in checkout session');
    return;
  }

  // Check if event exists
  const event = await prisma.event.findUnique({
    where: { id: metadata.eventId },
  });

  if (!event) {
    console.error('Event not found:', metadata.eventId);
    return;
  }

  // Mark as paid (idempotent)
  if (!event.paidAt) {
    await prisma.event.update({
      where: { id: metadata.eventId },
      data: {
        stripePaymentId: session.id,
        paidAt: new Date(),
      },
    });
    console.log('Event marked as paid:', metadata.eventId);
  } else {
    console.log('Event already paid:', metadata.eventId);
  }
}

async function createEventIfNotExists(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  
  if (!metadata?.userId || !metadata?.eventData) {
    console.error('Missing required metadata in checkout session');
    return;
  }

  // Check if event already exists (created by success page)
  const existingEvent = await prisma.event.findUnique({
    where: { stripePaymentId: session.id },
  });

  if (existingEvent) {
    console.log('Event already exists (created by success page):', existingEvent.id);
    return;
  }

  // Event doesn't exist - create it as backup
  console.log('Creating event via webhook backup for session:', session.id);

  // Parse event data
  const eventData = JSON.parse(metadata.eventData);
  
  // Reconstruct guests from chunked metadata
  const guestsLength = parseInt(metadata.guestsLength || '0');
  let guestsJson = '';
  for (let i = 0; i <= 4; i++) {
    const chunk = metadata[`guests_${i}`];
    if (chunk) {
      guestsJson += chunk;
    }
  }
  guestsJson = guestsJson.slice(0, guestsLength);
  
  let guests: { name: string; phone: string }[] = [];
  try {
    guests = JSON.parse(guestsJson || '[]');
  } catch (e) {
    console.error('Failed to parse guests JSON:', e);
  }

  // Create the event in database
  const event = await prisma.event.create({
    data: {
      userId: metadata.userId,
      title: eventData.title || 'Event',
      date: eventData.date ? new Date(eventData.date) : null,
      time: eventData.time,
      location: eventData.location,
      locationName: eventData.locationName,
      message: eventData.message,
      qrEnabled: eventData.qrEnabled ?? true,
      reminderEnabled: eventData.reminderEnabled ?? true,
      isScheduled: eventData.isScheduled ?? false,
      scheduledAt: eventData.scheduledAt ? new Date(eventData.scheduledAt) : null,
      imageUrl: eventData.imageUrl,
      mediaType: eventData.mediaType,
      mediaFilename: eventData.mediaFilename,
      stripePaymentId: session.id,
      paidAt: new Date(),
      guests: {
        create: guests
          .filter((g: { name: string; phone: string }) => g.name && g.phone)
          .map((guest: { name: string; phone: string }) => ({
            name: guest.name,
            phone: guest.phone,
            status: 'pending',
          })),
      },
    },
  });

  console.log('Event created via webhook backup:', event.id);
}
