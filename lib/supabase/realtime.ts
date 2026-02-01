"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "./client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Guest data as broadcast from the server.
 */
export type BroadcastGuestPayload = {
  id: string;
  eventId: string;
  name: string;
  phone: string;
  status: string;
  inviteCount: number;
  checkedIn?: boolean;
  whatsappMessageId?: string | null;
  oldStatus?: string;
};

/**
 * Event stats as broadcast from the server.
 */
export type BroadcastEventPayload = {
  id: string;
  guestCountTotal: number;
  inviteCountTotal: number;
  inviteCountPending: number;
  inviteCountSent: number;
  inviteCountDelivered: number;
  inviteCountRead: number;
  inviteCountConfirmed: number;
  inviteCountDeclined: number;
  inviteCountFailed: number;
};

export type GuestRealtimeCallbacks = {
  onGuestInsert?: (guest: BroadcastGuestPayload) => void;
  onGuestUpdate?: (guest: BroadcastGuestPayload) => void;
  onGuestDelete?: (guest: BroadcastGuestPayload) => void;
  onEventUpdate?: (event: BroadcastEventPayload) => void;
};

/**
 * Hook to subscribe to real-time guest and event updates via Broadcast.
 * 
 * @param eventId - The event ID to subscribe to
 * @param callbacks - Callbacks for different broadcast events
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

    // Track if this effect instance is still active (handles React Strict Mode)
    let isActive = true;

    const supabase = createClient();

    // Channel name matches what the server broadcasts to
    const channelName = `event:${eventId}`;

    // Only log in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(`[Realtime] Subscribing to channel: ${channelName}`);
    }

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "guest:insert" }, (message: { payload: BroadcastGuestPayload }) => {
        if (!isActive) return;
        callbacksRef.current.onGuestInsert?.(message.payload);
      })
      .on("broadcast", { event: "guest:update" }, (message: { payload: BroadcastGuestPayload }) => {
        if (!isActive) return;
        callbacksRef.current.onGuestUpdate?.(message.payload);
      })
      .on("broadcast", { event: "guest:delete" }, (message: { payload: BroadcastGuestPayload }) => {
        if (!isActive) return;
        callbacksRef.current.onGuestDelete?.(message.payload);
      })
      .on("broadcast", { event: "event:update" }, (message: { payload: BroadcastEventPayload }) => {
        if (!isActive) return;
        callbacksRef.current.onEventUpdate?.(message.payload);
      })
      .subscribe((status: string, err?: Error) => {
        if (!isActive) return;

        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] ✅ Connected to ${channelName}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime] ❌ Channel error:`, err?.message || err);
        } else if (status === "TIMED_OUT") {
          console.warn(`[Realtime] ⏱️ Connection timed out`);
        }
        // Don't log CLOSED - it's normal during React Strict Mode cleanup
      });

    channelRef.current = channel;

    return () => {
      isActive = false;
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

// Re-export types for backward compatibility
export type RealtimeGuestPayload = BroadcastGuestPayload;
export type RealtimeEventPayload = BroadcastEventPayload;

/**
 * Convert broadcast payload to client guest format compatible with GuestRowData.
 */
export function toClientGuest(payload: BroadcastGuestPayload) {
  return {
    id: payload.id,
    name: payload.name,
    phone: payload.phone,
    status: payload.status,
    inviteCount: payload.inviteCount,
    checkedIn: payload.checkedIn ?? false,
    whatsappMessageId: payload.whatsappMessageId ?? null,
  };
}

/**
 * Convert broadcast payload to client stats format.
 */
export function toClientStats(payload: BroadcastEventPayload) {
  return {
    total: payload.guestCountTotal,
    pending: payload.inviteCountPending,
    sent: payload.inviteCountSent,
    delivered: payload.inviteCountDelivered,
    read: payload.inviteCountRead,
    confirmed: payload.inviteCountConfirmed,
    declined: payload.inviteCountDeclined,
    failed: payload.inviteCountFailed,
    inviteTotal: payload.inviteCountTotal,
  };
}
