"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "./client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * Shape of a Guest row as returned by Supabase realtime.
 * Uses snake_case column names from the database.
 */
export type RealtimeGuestPayload = {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  status: string;
  invite_count: number;
  checked_in: boolean;
  checked_in_at: string | null;
  qr_code_id: string | null;
  whatsapp_message_id: string | null;
  created_at: string;
};

/**
 * Shape of an Event row as returned by Supabase realtime (counters only).
 */
export type RealtimeEventPayload = {
  id: string;
  guest_count_total: number;
  invite_count_total: number;
  invite_count_pending: number;
  invite_count_sent: number;
  invite_count_delivered: number;
  invite_count_read: number;
  invite_count_confirmed: number;
  invite_count_declined: number;
  invite_count_failed: number;
  invite_count_no_reply: number;
};

export type GuestRealtimeCallbacks = {
  onGuestInsert?: (guest: RealtimeGuestPayload) => void;
  onGuestUpdate?: (guest: RealtimeGuestPayload, oldGuest: RealtimeGuestPayload | null) => void;
  onGuestDelete?: (oldGuest: RealtimeGuestPayload) => void;
  onEventUpdate?: (event: RealtimeEventPayload) => void;
};

/**
 * Hook to subscribe to real-time guest and event updates for a specific event.
 * 
 * @param eventId - The event ID to filter updates for
 * @param callbacks - Callbacks for different realtime events
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function useGuestRealtimeUpdates(
  eventId: string,
  callbacks: GuestRealtimeCallbacks,
  enabled: boolean = true
) {
  // Use refs to avoid recreating the channel on callback changes
  const callbacksRef = useRef(callbacks);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Update callbacks ref in an effect to avoid setting refs during render
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    if (!enabled || !eventId) return;

    const supabase = createClient();

    // Create a unique channel name for this event
    const channelName = `event-${eventId}-realtime`;

    // Subscribe to Guest table changes for this event
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "guests",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeGuestPayload>) => {
          const guest = payload.new as RealtimeGuestPayload;
          callbacksRef.current.onGuestInsert?.(guest);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "guests",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeGuestPayload>) => {
          const guest = payload.new as RealtimeGuestPayload;
          const oldGuest = payload.old as RealtimeGuestPayload | null;
          callbacksRef.current.onGuestUpdate?.(guest, oldGuest);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "guests",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeGuestPayload>) => {
          const oldGuest = payload.old as RealtimeGuestPayload;
          callbacksRef.current.onGuestDelete?.(oldGuest);
        }
      )
      // Also listen for Event updates (for counter changes from DB triggers)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimeEventPayload>) => {
          const event = payload.new as RealtimeEventPayload;
          callbacksRef.current.onEventUpdate?.(event);
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Subscribed to event ${eventId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime] Channel error for event ${eventId}`);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[Realtime] Unsubscribing from event ${eventId}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId, enabled]);

  // Return a function to manually unsubscribe if needed
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  return { unsubscribe };
}

/**
 * Convert snake_case guest payload to camelCase for client consumption.
 */
export function toClientGuest(payload: RealtimeGuestPayload) {
  return {
    id: payload.id,
    eventId: payload.event_id,
    name: payload.name,
    phone: payload.phone,
    status: payload.status,
    inviteCount: payload.invite_count,
    checkedIn: payload.checked_in,
    checkedInAt: payload.checked_in_at,
    qrCodeId: payload.qr_code_id,
    whatsappMessageId: payload.whatsapp_message_id,
    createdAt: payload.created_at,
  };
}

/**
 * Convert snake_case event counters to camelCase stats object.
 */
export function toClientStats(payload: RealtimeEventPayload) {
  return {
    total: payload.guest_count_total,
    pending: payload.invite_count_pending,
    sent: payload.invite_count_sent,
    delivered: payload.invite_count_delivered,
    read: payload.invite_count_read,
    confirmed: payload.invite_count_confirmed,
    declined: payload.invite_count_declined,
    failed: payload.invite_count_failed,
    noReply: payload.invite_count_no_reply,
    inviteTotal: payload.invite_count_total,
  };
}
