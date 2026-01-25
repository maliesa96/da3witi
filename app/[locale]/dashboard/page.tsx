import { Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import EventPanelClient from "./EventPanelClient";
import { Link } from "@/navigation";
import { Prisma } from "@prisma/client";
import { sendInvitesForEvent, getGuestsPaginated } from "./actions";

export default async function Dashboard({ 
  params,
  searchParams
}: { 
  params: Promise<{ locale: string }>,
  searchParams: Promise<{ eventId?: string }>
}) {
  const { locale } = await params;
  const { eventId } = await searchParams;
  const t = await getTranslations('Dashboard');
  
  // Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect(`/${locale}/login`);
  }
  
  // Fetch user's events (without guests for the sidebar - more efficient)
  const events = await prisma.event.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (events.length === 0) {
    redirect(`/${locale}/wizard`);
  }
  
  // Get the selected event or default to the first one
  const currentEvent = eventId 
    ? events.find((e: Prisma.EventGetPayload<object>) => e.id === eventId) || events[0]
    : events[0];
  
  // Fetch paginated guests for the current event
  const { guests, pagination, stats } = await getGuestsPaginated(currentEvent.id, {
    page: 1,
    pageSize: 50,
  });

  const sendInvitesAction = async (formData: FormData) => {
    'use server';
    void formData;
    await sendInvitesForEvent(currentEvent.id, locale as 'en' | 'ar');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pb-24 animate-fade-in">
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8">
        {/* Sidebar: Event List */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <h2 className="text-sm font-display font-bold text-stone-400 uppercase tracking-wider">
              {t('my_events') || 'My Events'}
            </h2>
            <Link 
              href="/wizard" 
              prefetch={false}
              className="p-1.5 bg-stone-100 text-stone-600 rounded-md hover:bg-stone-200 transition-colors"
              title="Create New Event"
            >
              <Calendar size={16} />
            </Link>
          </div>
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/dashboard?eventId=${event.id}`}
                className={`flex-none w-[240px] lg:w-full p-4 rounded-xl border transition-all ${
                  currentEvent?.id === event.id
                    ? "bg-white border-stone-900 shadow-sm"
                    : "bg-stone-50 border-stone-100 hover:border-stone-200 text-stone-500"
                }`}
              >
                <div className="font-semibold text-stone-900 truncate">
                  {event.title}
                </div>
                <div className="text-[10px] mt-1 flex items-center gap-1">
                  <Calendar size={10} />
                  {event.date}
                </div>
              </Link>
            ))}
          </div>
        </aside>

        {/* Main Content: Selected Event Details */}
        <div className="lg:col-span-3">
          <EventPanelClient
            sendInvitesAction={sendInvitesAction}
            event={{
              id: currentEvent.id,
              title: currentEvent.title,
              isScheduled: currentEvent.isScheduled,
              date: currentEvent.date,
              time: currentEvent.time,
              location: currentEvent.location ?? null,
              locationName: currentEvent.locationName ?? null,
              message: currentEvent.message ?? null,
              qrEnabled: currentEvent.qrEnabled,
              guestsEnabled: currentEvent.guestsEnabled,
              reminderEnabled: currentEvent.reminderEnabled,
              imageUrl: currentEvent.imageUrl ?? null,
              paidAt: currentEvent.paidAt ? currentEvent.paidAt.toISOString() : null,
            }}
            initialGuests={guests}
            initialPagination={pagination}
            initialStats={stats}
          />
        </div>
      </div>
    </div>
  );
}
