"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import EventPanelClient from "@/app/[locale]/dashboard/EventPanelClient";
import { Link } from "@/navigation";
import { RealtimeProvider } from "@/lib/supabase/RealtimeProvider";

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
  guestCountTotal?: number;
  inviteCountTotal?: number;
  inviteCountPending?: number;
  inviteCountSent?: number;
  inviteCountDelivered?: number;
  inviteCountRead?: number;
  inviteCountConfirmed?: number;
  inviteCountDeclined?: number;
  inviteCountFailed?: number;
  inviteCountNoReply?: number;
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

export default function EventClient({ eventId }: { eventId: string }) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const router = useRouter();

  const [event, setEvent] = useState<EventForClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        // Fetch event with counters from the events list endpoint
        const eventsRes = await fetchJson<{ events: EventForClient[]; defaultEventId: string | null }>("/api/events");
        if (cancelled) return;

        const foundEvent = eventsRes.events.find((e) => e.id === eventId);
        
        if (!foundEvent) {
          setLoadError("Event not found");
          return;
        }

        setEvent(foundEvent);
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
  }, [eventId, locale, router]);

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pb-24 animate-fade-in">
      {/* Back to Dashboard Link */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft size={16} />
          {t("back_to_dashboard")}
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-stone-400" />
        </div>
      )}

      {!isLoading && loadError && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && event && (
        <RealtimeProvider eventId={event.id} enabled={!!event.paidAt}>
          <EventPanelClient key={event.id} event={event} />
        </RealtimeProvider>
      )}
    </div>
  );
}
