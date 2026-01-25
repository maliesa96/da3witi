import type { Metadata } from "next";
import { CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { sendInvitesForEvent } from "@/app/[locale]/dashboard/actions";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function markEventAsPaidAndSendInvites(session: Stripe.Checkout.Session, eventId: string, locale: 'en' | 'ar') {
  const metadata = session.metadata;

  if (!metadata?.userId || !metadata?.eventId) {
    console.error("Missing required metadata in checkout session");
    return { success: false, error: 'Missing metadata' };
  }

  // Check if event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return { success: false, error: 'Event not found' };
  }

  // Mark as paid (idempotent - check if already paid)
  if (!event.paidAt) {
    await prisma.event.update({
      where: { id: eventId },
      data: {
        stripePaymentId: session.id,
        paidAt: new Date(),
      },
    });
  }

  // Send invites
  try {
    const result = await sendInvitesForEvent(eventId, locale);
    return { success: true, sent: result.sent, failed: result.failed };
  } catch (error) {
    console.error('Failed to send invites:', error);
    return { success: false, error: 'Failed to send invites' };
  }
}

export default async function SendInvitesSuccess({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string; eventId?: string }>;
}) {
  const { locale } = await params;
  const { session_id, eventId } = await searchParams;
  const t = await getTranslations("Checkout");

  // No session ID or event ID - invalid access
  if (!session_id || !eventId) {
    redirect(`/${locale}/dashboard`);
  }

  let result: { success: boolean; sent?: number; failed?: number; error?: string } = { success: false };

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      result = { success: false, error: "Payment not completed" };
    } else {
      // Mark event as paid and send invites
      result = await markEventAsPaidAndSendInvites(session, eventId, locale as 'en' | 'ar');
    }
  } catch (err) {
    console.error("Error processing checkout success:", err);
    result = { success: false, error: "Failed to process payment" };
  }

  // Show error state
  if (!result.success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-2xl font-semibold text-stone-900 mb-3">
            {t("error_title")}
          </h1>

          <p className="text-stone-600 mb-8">{t("error_description")}</p>

          <div className="space-y-3">
            <Link
              href={`/dashboard?eventId=${eventId}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors"
            >
              <span>{t("go_to_dashboard")}</span>
              <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-semibold text-stone-900 mb-3">
          {locale === 'ar' ? 'تم إرسال الدعوات بنجاح!' : 'Invites Sent Successfully!'}
        </h1>

        <p className="text-stone-600 mb-4">
          {locale === 'ar' 
            ? `تم إرسال ${result.sent || 0} دعوة بنجاح${result.failed ? ` وفشل إرسال ${result.failed}` : ''}.`
            : `${result.sent || 0} invite(s) sent successfully${result.failed ? ` and ${result.failed} failed` : ''}.`
          }
        </p>

        <div className="space-y-3">
          <Link
            href={`/dashboard?eventId=${eventId}`}
            className="w-full inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors"
          >
            <span>{t("go_to_dashboard")}</span>
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>

          <p className="text-xs text-stone-500">
            {locale === 'ar' 
              ? 'يمكنك الآن تتبع حالة الدعوات من لوحة التحكم'
              : 'You can now track invite status from the dashboard'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
