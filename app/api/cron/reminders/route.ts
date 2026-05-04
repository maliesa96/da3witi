import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWhatsAppTemplatePayload } from "@/lib/whatsapp";
import {
  enqueueWhatsAppOutboxBatch,
  type WhatsAppOutboxMeta,
} from "@/lib/queue/whatsappOutbox";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const todayRiyadh = getTodayInRiyadh();

    const events = await prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        date: string;
        time: string;
        location: string | null;
        location_name: string | null;
        locale: string | null;
        event_date: Date;
        reminder_days_before: number;
      }>
    >`
      SELECT id, title, date, time, location, location_name, locale,
             event_date, reminder_days_before
      FROM events
      WHERE event_date IS NOT NULL
        AND reminder_enabled = true
        AND reminder_sent_at IS NULL
        AND paid_at IS NOT NULL
        AND event_date = ${todayRiyadh}::date + reminder_days_before * INTERVAL '1 day'
    `;

    if (events.length === 0) {
      return NextResponse.json({ success: true, eventsProcessed: 0, totalReminders: 0 });
    }

    let totalReminders = 0;

    for (const event of events) {
      const guests = await prisma.guest.findMany({
        where: {
          eventId: event.id,
          status: { in: ["confirmed", "no_reply"] },
          sentAt: { not: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      });

      if (guests.length === 0) {
        await prisma.event.update({
          where: { id: event.id },
          data: { reminderSentAt: new Date() },
        });
        continue;
      }

      const locale = event.locale === "ar" ? "ar" : "en";
      const templateName = `reminder_${locale}`;

      const jobs = guests.map((guest) => ({
        payload: buildWhatsAppTemplatePayload({
          to: guest.phone,
          templateName,
          languageCode: locale,
          components: [
            {
              type: "body" as const,
              parameters: [
                { type: "text" as const, text: event.title, parameter_name: "event_name" },
                { type: "text" as const, text: event.location_name || "", parameter_name: "location_name" },
                { type: "text" as const, text: event.time, parameter_name: "time" },
              ],
            },
          ],
        }),
        meta: {
          kind: "reminder" as const,
          guestId: guest.id,
          eventId: event.id,
          locale,
        } as WhatsAppOutboxMeta,
      }));

      await enqueueWhatsAppOutboxBatch(jobs);

      await prisma.event.update({
        where: { id: event.id },
        data: { reminderSentAt: new Date() },
      });

      totalReminders += guests.length;
    }

    return NextResponse.json({
      success: true,
      eventsProcessed: events.length,
      totalReminders,
    });
  } catch (error) {
    console.error("Cron /api/cron/reminders failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getTodayInRiyadh(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}
