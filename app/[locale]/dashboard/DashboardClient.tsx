"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

import EventPanelClient from "./EventPanelClient";
import { Link } from "@/navigation";
import type { GuestRowData } from "@/app/components/AnimatedGuestRows";

type EventSidebarItem = {
  id: string;
  title: string;
  date: string | null;
};

type EventForClient = {
  id: string;
  title: string;
  isScheduled: boolean;
  date: string | null;
  time: string | null;
  location: string | null;
  locationName: string | null;
  message: string | null;
  qrEnabled: boolean;
  guestsEnabled: boolean;
  reminderEnabled: boolean;
  imageUrl: string | null;
  paidAt: string | null;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type GuestStats = {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  read: number;
  confirmed: number;
  declined: number;
  failed: number;
};

type InviteTotals = {
  filtered: number;
  all: number;
};

type GuestsResponse = {
  guests: GuestRowData[];
  pagination: PaginationInfo;
  stats: GuestStats;
  inviteTotals: InviteTotals;
};

type GuestsResponseFromApi = Omit<GuestsResponse, "guests"> & {
  guests: Array<Omit<GuestRowData, "inviteCount"> & { inviteCount?: number | null }>;
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

export default function DashboardClient() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventIdFromUrl = searchParams.get("eventId") || undefined;

  const [events, setEvents] = useState<EventSidebarItem[]>([]);
  const [currentEvent, setCurrentEvent] = useState<EventForClient | null>(null);
  const [guestsPayload, setGuestsPayload] = useState<GuestsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const currentEventId = useMemo(() => currentEvent?.id ?? eventIdFromUrl, [currentEvent?.id, eventIdFromUrl]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      setCurrentEvent(null);
      setGuestsPayload(null);

      try {
        const eventsRes = await fetchJson<{ events: EventSidebarItem[]; defaultEventId: string | null }>("/api/events");
        if (cancelled) return;

        const list = eventsRes.events || [];
        setEvents(list);

        if (list.length === 0) {
          router.replace(`/${locale}/wizard`);
          return;
        }

        const selectedEventId = eventIdFromUrl || eventsRes.defaultEventId || list[0].id;

        // Normalize the URL so refreshes keep the selected event
        if (!eventIdFromUrl) {
          router.replace(`/${locale}/dashboard?eventId=${encodeURIComponent(selectedEventId)}`);
        }

        const [eventRes, guestsRes] = await Promise.all([
          fetchJson<EventForClient>(`/api/events/${encodeURIComponent(selectedEventId)}`),
          fetchJson<GuestsResponseFromApi>(
            `/api/events/${encodeURIComponent(selectedEventId)}/guests?page=1&pageSize=50`
          ),
        ]);

        if (cancelled) return;
        setCurrentEvent(eventRes);
        setGuestsPayload({
          ...guestsRes,
          guests: (guestsRes.guests || []).map((g) => ({
            ...g,
            inviteCount: g.inviteCount ?? undefined,
          })),
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg);

        // If auth expired, middleware should handle dashboard access, but API can still return 401
        if (msg.toLowerCase().includes("unauthorized")) {
          router.replace(`/${locale}/login`);
          return;
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventIdFromUrl, locale, router]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pb-24 animate-fade-in">
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-8">
        {/* Sidebar: Event List */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <h2 className="text-sm font-display font-bold text-stone-400 uppercase tracking-wider">
              {t("my_events") || "My Events"}
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
            {isLoading && events.length === 0 ? (
              // Sidebar skeletons
              <>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex-none w-[240px] lg:w-full p-4 rounded-xl border border-stone-200 bg-white shadow-sm animate-pulse"
                    aria-hidden="true"
                  >
                    <div className="h-4 w-3/4 bg-stone-200 rounded" />
                    <div className="mt-3 h-3 w-1/2 bg-stone-200 rounded" />
                  </div>
                ))}
              </>
            ) : (
              events.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard?eventId=${event.id}`}
                  className={`flex-none w-[240px] lg:w-full p-4 rounded-xl border transition-all ${
                    currentEventId === event.id
                      ? "bg-white border-stone-900 shadow-sm"
                      : "bg-stone-50 border-stone-100 hover:border-stone-200 text-stone-500"
                  }`}
                >
                  <div className="font-semibold text-stone-900 truncate">{event.title}</div>
                  <div className="text-[10px] mt-1 flex items-center gap-1">
                    <Calendar size={10} />
                    {event.date}
                  </div>
                </Link>
              ))
            )}
          </div>
        </aside>

        {/* Main Content: Selected Event Details */}
        <div className="lg:col-span-3">
          {isLoading && (
            <div className="space-y-8" aria-busy="true" aria-label="Loading">
              {/* Header skeleton */}
              <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden animate-pulse">
                <div className="p-6 md:p-8 space-y-4">
                  <div className="h-7 w-2/3 bg-stone-200 rounded" />
                  <div className="flex flex-wrap gap-3">
                    <div className="h-4 w-40 bg-stone-200 rounded" />
                    <div className="h-4 w-32 bg-stone-200 rounded" />
                    <div className="h-4 w-52 bg-stone-200 rounded" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <div className="h-10 w-36 bg-stone-200 rounded-lg" />
                    <div className="h-10 w-32 bg-stone-200 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Stats skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-stone-200 bg-white shadow-sm animate-pulse"
                    aria-hidden="true"
                  >
                    <div className="h-3 w-2/3 bg-stone-200 rounded" />
                    <div className="mt-4 h-7 w-1/2 bg-stone-200 rounded" />
                  </div>
                ))}
              </div>

              {/* List skeleton */}
              <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="px-4 md:px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-4">
                  <div className="h-4 w-40 bg-stone-200 rounded" />
                  <div className="h-9 w-56 bg-stone-200 rounded-lg" />
                </div>
                <div className="divide-y divide-stone-100">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="px-4 md:px-6 py-4 flex items-center justify-between gap-4">
                      <div className="space-y-2 w-full">
                        <div className="h-4 w-1/3 bg-stone-200 rounded" />
                        <div className="h-3 w-1/4 bg-stone-200 rounded" />
                      </div>
                      <div className="h-7 w-20 bg-stone-200 rounded-lg shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isLoading && loadError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              {loadError}
            </div>
          )}

          {!isLoading && !loadError && currentEvent && guestsPayload && (
            <EventPanelClient
              key={currentEvent.id}
              event={currentEvent}
              initialGuests={guestsPayload.guests}
              initialPagination={guestsPayload.pagination}
              initialStats={guestsPayload.stats}
              initialInviteTotals={guestsPayload.inviteTotals}
            />
          )}
        </div>
      </div>
    </div>
  );
}
