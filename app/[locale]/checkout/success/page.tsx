import { CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createEventFromSession(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;

  if (!metadata?.userId || !metadata?.eventData) {
    console.error("Missing required metadata in checkout session");
    return null;
  }

  // Check if event already exists (idempotency)
  const existingEvent = await prisma.event.findUnique({
    where: { stripePaymentId: session.id },
  });

  if (existingEvent) {
    return existingEvent.id;
  }

  // Parse event data
  const eventData = JSON.parse(metadata.eventData);

  // Reconstruct guests from chunked metadata
  const guestsLength = parseInt(metadata.guestsLength || "0");
  let guestsJson = "";
  for (let i = 0; i <= 4; i++) {
    const chunk = metadata[`guests_${i}`];
    if (chunk) {
      guestsJson += chunk;
    }
  }
  guestsJson = guestsJson.slice(0, guestsLength);

  let guests: { name: string; phone: string }[] = [];
  try {
    guests = JSON.parse(guestsJson || "[]");
  } catch (e) {
    console.error("Failed to parse guests JSON:", e);
  }

  // Create the event in database
  const event = await prisma.event.create({
    data: {
      userId: metadata.userId,
      title: eventData.title || "Event",
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
            status: "pending",
          })),
      },
    },
  });

  return event.id;
}

export default async function CheckoutSuccess({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  const t = await getTranslations("Checkout");

  // No session ID - invalid access
  if (!session_id) {
    redirect(`/${locale}/wizard`);
  }

  let eventId: string | null = null;
  let error: string | null = null;

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      error = "Payment not completed";
    } else {
      // Create the event (or get existing if already created)
      eventId = await createEventFromSession(session);

      if (!eventId) {
        error = "Failed to create event";
      }
    }
  } catch (err) {
    console.error("Error processing checkout success:", err);
    error = "Failed to process payment";
  }

  // Show error state
  if (error) {
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
              href="/dashboard"
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
          {t("success_title")}
        </h1>

        <p className="text-stone-600 mb-8">{t("success_description")}</p>

        <div className="space-y-3">
          <Link
            href={`/dashboard?eventId=${eventId}`}
            className="w-full inline-flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors"
          >
            <span>{t("go_to_dashboard")}</span>
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>

          <p className="text-xs text-stone-500">{t("success_note")}</p>
        </div>
      </div>
    </div>
  );
}
