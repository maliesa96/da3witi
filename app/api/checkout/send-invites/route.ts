import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Pricing in fils (1 KWD = 1000 fils)
const BASE_PRICE = 50000; // 50 KWD
const QR_ADDON_PRICE = 10000; // 10 KWD

// const BASE_PRICE = 59500;
// const QR_ADDON_PRICE = 11900;

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, locale } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Fetch the event to verify ownership and get details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { guests: true }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already paid
    if (event.paidAt) {
      return NextResponse.json({ error: 'Event already paid for' }, { status: 400 });
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'kwd',
          product_data: {
            name: locale === 'ar' ? 'دعوة رقمية' : 'Digital Invitation',
            description: locale === 'ar' 
              ? 'باقة الدعوة الأساسية - ضيوف غير محدودين، أتمتة واتساب، تتبع الحضور'
              : 'Standard Invite Package - Unlimited guests, WhatsApp automation, RSVP tracking',
          },
          unit_amount: BASE_PRICE,
        },
        quantity: 1,
      },
    ];

    if (event.qrEnabled) {
      lineItems.push({
        price_data: {
          currency: 'kwd',
          product_data: {
            name: locale === 'ar' ? 'خدمة رمز QR' : 'QR Code Service',
            description: locale === 'ar'
              ? 'رمز QR فريد لكل ضيف للتسجيل عند الوصول'
              : 'Unique QR code for each guest for check-in',
          },
          unit_amount: QR_ADDON_PRICE,
        },
        quantity: 1,
      });
    }

    // Get the origin for redirect URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/${locale}/checkout/send-success?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`,
      cancel_url: `${origin}/${locale}/dashboard?eventId=${eventId}`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        eventId: eventId,
        action: 'send_invites',
      },
      locale: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
