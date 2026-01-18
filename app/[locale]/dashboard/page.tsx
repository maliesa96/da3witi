import { Search, Circle, CheckCircle2, MoreHorizontal, RotateCcw, Calendar, Camera } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { sendInviteTemplate, type MediaType } from "@/lib/whatsapp";
import { revalidatePath } from "next/cache";
import AddGuestForm from "@/app/components/AddGuestForm";
import { Link } from "@/navigation";
import { Prisma } from "@prisma/client";

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
  const isDev = process.env.NODE_ENV === 'development';
  
  // Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // Fetch user's events with guests
  const events = await prisma.event.findMany({
    where: { userId: user.id },
    include: { guests: true },
    orderBy: { createdAt: 'desc' },
  });

  if (events.length === 0) {
    redirect('/wizard');
  }
  
  // Get the selected event or default to the first one
  const currentEvent = eventId 
    ? events.find((e: Prisma.EventGetPayload<{ include: { guests: true } }>) => e.id === eventId) || events[0]
    : events[0];
  
  const guests = currentEvent?.guests || [];
  
  // Resend action for development
  async function resendInvite(guestId: string) {
    'use server';
    if (process.env.NODE_ENV !== 'development') return;

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { event: true }
    });

    if (!guest || !guest.event) return;

    console.log(`[DEV] Resending invite to ${guest.name} (${guest.phone})`);
    
    const result = await sendInviteTemplate({
      to: guest.phone,
      locale: 'en',
      qrEnabled: guest.event.qrEnabled,
      invitee: guest.name,
      greetingText: guest.event.message || '',
      date: guest.event.date?.toLocaleDateString() || 'TBD',
      time: guest.event.time || 'TBD',
      locationName: guest.event.locationName || 'See invitation',
      location: guest.event.location || undefined,
      mediaUrl: guest.event.imageUrl || undefined,
      mediaType: (guest.event.mediaType as MediaType) || 'image',
      mediaFilename: guest.event.mediaFilename || undefined,
    });

    if (result.success && result.messageId) {
      await prisma.guest.update({
        where: { id: guest.id },
        data: { 
          whatsappMessageId: result.messageId,
          status: 'delivered'
        }
      });
    }

    revalidatePath('/dashboard');
  }

  // Calculate stats
  const stats = {
    invited: guests.length,
    confirmed: guests.filter(g => g.status === 'confirmed').length,
    declined: guests.filter(g => g.status === 'declined').length,
    noReply: guests.filter(g => !['confirmed', 'declined'].includes(g.status)).length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
            {t('status_present')}
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-100">
            {t('status_declined')}
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
            {t('status_delivered')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
            {t('status_failed')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
            {t('status_no_reply')}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pb-24 animate-fade-in">
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8">
        {/* Sidebar: Event List */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">
              {t('my_events') || 'My Events'}
            </h2>
            <Link 
              href="/wizard" 
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
                  {event.date?.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </Link>
            ))}
          </div>
        </aside>

        {/* Main Content: Selected Event Details */}
        <div className="lg:col-span-3">
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-stone-900 tracking-tight">
                {currentEvent?.title}
              </h1>
              <p className="text-stone-500 mt-1 text-sm md:text-base">
                {currentEvent?.date?.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} • {currentEvent?.locationName}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                href={`/dashboard/scan${currentEvent ? `?eventId=${currentEvent.id}` : ''}`}
                className="flex-1 md:flex-none px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                {t('scan_qr') || 'Scan QR'}
              </Link>
              {currentEvent && (
                <div className="flex-1 md:flex-none">
                  <AddGuestForm eventId={currentEvent.id} locale={locale as 'en' | 'ar'} />
                </div>
              )}
              <button className="flex-1 md:flex-none px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                {t('export_report')}
              </button>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <div className="bg-white p-4 md:p-5 rounded-xl border border-stone-200 shadow-sm">
              <div className="text-[10px] md:text-xs font-medium text-stone-500 mb-1">
                {t('invited')}
              </div>
              <div className="text-xl md:text-2xl font-semibold text-stone-900">{stats.invited}</div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-xl border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1 bg-green-500"></div>
              <div className="text-[10px] md:text-xs font-medium text-stone-500 mb-1">
                {t('confirmed')}
              </div>
              <div className="text-xl md:text-2xl font-semibold text-stone-900">{stats.confirmed}</div>
              {stats.invited > 0 && (
                <div className="text-[10px] text-green-600 mt-1 font-medium">
                  {Math.round((stats.confirmed / stats.invited) * 100)}% {t('confirmed_sub')}
                </div>
              )}
            </div>
            <div className="bg-white p-4 md:p-5 rounded-xl border border-stone-200 shadow-sm">
              <div className="text-[10px] md:text-xs font-medium text-stone-500 mb-1">
                {t('declined')}
              </div>
              <div className="text-xl md:text-2xl font-semibold text-stone-900">{stats.declined}</div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-xl border border-stone-200 shadow-sm">
              <div className="text-[10px] md:text-xs font-medium text-stone-500 mb-1">
                {t('no_reply')}
              </div>
              <div className="text-xl md:text-2xl font-semibold text-stone-900">{stats.noReply}</div>
            </div>
          </div>

          {/* Guest List Container */}
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-medium text-stone-900">{t('guest_list')}</h3>
              <div className="relative w-full sm:w-auto">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 rtl:right-auto rtl:left-3">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  className="pr-8 pl-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-stone-400 w-full sm:w-48 rtl:pr-4 rtl:pl-8"
                />
              </div>
            </div>

            {/* Mobile Guest View */}
            <div className="md:hidden divide-y divide-stone-100">
              {guests.length === 0 ? (
                <div className="px-6 py-12 text-center text-stone-400">
                  {t('no_guests')}
                </div>
              ) : (
                guests.map((guest) => (
                  <div key={guest.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-stone-900">{guest.name}</div>
                        <div className="text-xs text-stone-500 dir-ltr">{guest.phone}</div>
                      </div>
                      {getStatusBadge(guest.status)}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        {guest.status === 'declined' ? (
                          <span className="text-stone-300 text-xs">-</span>
                        ) : guest.checkedIn ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle2 size={14} />
                            <span className="text-xs font-medium">
                              {t('qr_checked_in')}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-stone-400">
                            <Circle size={12} />
                            <span className="text-xs">{t('qr_not_arrived')}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isDev && (
                          <form action={resendInvite.bind(null, guest.id)}>
                            <button 
                              type="submit"
                              title="Resend Invite (Dev Only)"
                              className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors border border-stone-100"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </form>
                        )}
                        <button className="text-stone-400 hover:text-stone-600 p-2 border border-stone-100 rounded-md">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Guest Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start">
                <thead className="bg-stone-50 text-xs text-stone-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 text-start">{t('col_name')}</th>
                    <th className="px-6 py-3 text-start">{t('col_phone')}</th>
                    <th className="px-6 py-3 text-start">{t('col_status')}</th>
                    <th className="px-6 py-3 text-start">{t('col_qr')}</th>
                    <th className="px-6 py-3 text-start"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                  {guests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                        {t('no_guests')}
                      </td>
                    </tr>
                  ) : (
                    guests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-stone-900">
                          {guest.name}
                        </td>
                        <td className="px-6 py-4 dir-ltr text-end text-stone-500">
                          {guest.phone}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(guest.status)}
                        </td>
                        <td className="px-6 py-4">
                          {guest.status === 'declined' ? (
                            <span className="text-stone-300">-</span>
                          ) : guest.checkedIn ? (
                            <div className="flex items-center gap-1.5 text-green-600">
                              <CheckCircle2 size={14} />
                              <span className="text-xs font-medium">
                                {t('qr_checked_in')}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-stone-400">
                              <Circle size={12} />
                              <span className="text-xs">{t('qr_not_arrived')}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-end">
                          <div className="flex items-center justify-end gap-2">
                            {isDev && (
                              <form action={resendInvite.bind(null, guest.id)}>
                                <button 
                                  type="submit"
                                  title="Resend Invite (Dev Only)"
                                  className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              </form>
                            )}
                            <button className="text-stone-400 hover:text-stone-600 p-1.5">
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
