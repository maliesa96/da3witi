"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck, User, Mail } from "lucide-react";
import EventPanelClient from "@/app/[locale]/dashboard/EventPanelClient";
import { RealtimeProvider } from "@/lib/supabase/RealtimeProvider";

type AdminEvent = {
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
  locale: string | null;
  guestCountTotal: number;
  inviteCountTotal: number;
  inviteCountPending: number;
  inviteCountSent: number;
  inviteCountDelivered: number;
  inviteCountRead: number;
  inviteCountConfirmed: number;
  inviteCountDeclined: number;
  inviteCountFailed: number;
  inviteCountNoReply: number;
  ownerEmail: string | null;
  ownerName: string | null;
};

export default function AdminEventViewClient({ eventId }: { eventId: string }) {
  const router = useRouter();

  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const res = await fetch(`/api/admin/events/${eventId}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 403) {
            router.replace("/en/admin");
            return;
          }
          let message = `Request failed: ${res.status}`;
          try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) message = data.error;
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const data = (await res.json()) as AdminEvent;
        if (!cancelled) setEvent(data);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId, router]);

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-24 animate-fade-in">
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Admin Dashboard
        </button>
      </div>

      {/* Admin banner */}
      <div className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
        <ShieldCheck size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-semibold text-amber-800">Admin View</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-amber-700">
            {event?.ownerName && (
              <span className="flex items-center gap-1.5">
                <User size={13} />
                {event.ownerName}
              </span>
            )}
            {event?.ownerEmail && (
              <span className="flex items-center gap-1.5">
                <Mail size={13} />
                {event.ownerEmail}
              </span>
            )}
            {!event?.ownerName && !event?.ownerEmail && !isLoading && (
              <span className="text-amber-600 italic">No owner on record</span>
            )}
          </div>
        </div>
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
