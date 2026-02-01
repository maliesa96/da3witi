"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Calendar, Clock, MapPin, Users, Plus, QrCode, CheckCircle2, Image as ImageIcon } from "lucide-react";

import { Link } from "@/navigation";

type EventCardData = {
  id: string;
  title: string;
  isScheduled: boolean;
  date: string | null;
  time: string | null;
  location: string | null;
  locationName: string | null;
  qrEnabled: boolean;
  imageUrl: string | null;
  paidAt: string | null;
  guestCountTotal?: number;
  inviteCountTotal?: number;
  inviteCountConfirmed?: number;
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

function EventCard({ event }: { event: EventCardData }) {
  const t = useTranslations("Dashboard");
  const isPdf = event.imageUrl?.toLowerCase().endsWith(".pdf");
  const hasImage = !!event.imageUrl && !isPdf;
  const guestCount = event.inviteCountTotal ?? 0;
  const confirmedCount = event.inviteCountConfirmed ?? 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-stone-300 hover:-translate-y-1"
    >
      {/* Image/Media Section */}
      <div className="relative aspect-video bg-stone-100 overflow-hidden">
        {hasImage ? (
          <Image
            src={event.imageUrl!}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-red-50 to-red-100">
            <div className="w-16 h-20 bg-white rounded-lg shadow-md flex items-center justify-center border border-red-100">
              <span className="text-xs font-bold text-red-500">PDF</span>
            </div>
            <span className="mt-3 text-xs text-red-400 font-medium">{t("pdf_document")}</span>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-stone-50 to-stone-100">
            <ImageIcon size={40} className="text-stone-300" />
            <span className="mt-2 text-xs text-stone-400">{t("no_image")}</span>
          </div>
        )}
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {event.isScheduled && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/90 backdrop-blur-sm text-[10px] font-medium text-white shadow-sm">
              {t("scheduled")}
            </span>
          )}
          {event.qrEnabled && (
            <span className="px-2 py-0.5 rounded-full bg-stone-900/80 backdrop-blur-sm text-[10px] font-medium text-white shadow-sm flex items-center gap-1">
              <QrCode size={10} />
              QR
            </span>
          )}
        </div>

        {/* Guest Count Pill */}
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full shadow-sm">
            <Users size={12} className="text-stone-600" />
            <span className="text-xs font-semibold text-stone-900 tabular-nums">{guestCount}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3">
        <h3 className="text-base font-semibold text-stone-900 truncate group-hover:text-stone-700 transition-colors">
          {event.title}
        </h3>
        
        {/* Event Details */}
        <div className="mt-2 space-y-1.5">
          {event.date && (
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <Calendar size={12} className="text-stone-400 shrink-0" />
              <span className="truncate">{event.date}</span>
              {event.time && (
                <>
                  <span className="text-stone-300">•</span>
                  <Clock size={12} className="text-stone-400 shrink-0" />
                  <span>{event.time}</span>
                </>
              )}
            </div>
          )}
          {event.locationName && (
            <div className="flex items-center gap-1.5 text-xs text-stone-600">
              <MapPin size={12} className="text-stone-400 shrink-0" />
              <span className="truncate">{event.locationName}</span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        {guestCount > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-stone-500">
              <CheckCircle2 size={12} className="text-green-500" />
              <span className="tabular-nums">{confirmedCount}</span>
              <span>{t("confirmed")}</span>
            </div>
            <div className="text-[10px] text-stone-400">
              {guestCount > 0 && `${Math.round((confirmedCount / guestCount) * 100)}%`}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-video bg-stone-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-stone-200 rounded" />
        <div className="h-3 w-1/2 bg-stone-200 rounded" />
        <div className="h-3 w-2/3 bg-stone-200 rounded" />
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const router = useRouter();

  const [events, setEvents] = useState<EventCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const eventsRes = await fetchJson<{ events: EventCardData[]; defaultEventId: string | null }>("/api/events");
        if (cancelled) return;

        if (eventsRes.events.length === 0) {
          router.replace(`/${locale}/wizard`);
          return;
        }

        setEvents(eventsRes.events);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg);

        if (msg.toLowerCase().includes("unauthorized")) {
          router.replace(`/${locale}/login`);
          return;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-900">
          {t("my_events")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t("select_event_to_manage")}
        </p>
      </div>

      {/* Error State */}
      {!isLoading && loadError && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          {loadError}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <EventCardSkeleton key={idx} />
          ))}
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && !loadError && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !loadError && events.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 mb-4">
            <Calendar size={28} className="text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-900 mb-2">{t("no_events_title")}</h3>
          <p className="text-sm text-stone-500 mb-6">{t("no_events_desc")}</p>
          <Link
            href="/wizard"
            prefetch={false}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            <Plus size={18} />
            {t("create_event")}
          </Link>
        </div>
      )}
    </div>
  );
}
