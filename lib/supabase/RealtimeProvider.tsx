"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useId,
  type ReactNode,
} from "react";
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

type RealtimeListener = {
  id: string;
  onGuestInsert?: (guest: BroadcastGuestPayload) => void;
  onGuestUpdate?: (guest: BroadcastGuestPayload) => void;
  onGuestDelete?: (guest: BroadcastGuestPayload) => void;
  onEventUpdate?: (event: BroadcastEventPayload) => void;
};

type RealtimeContextValue = {
  isConnected: boolean;
  subscribe: (listener: RealtimeListener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

type RealtimeProviderProps = {
  eventId: string;
  enabled?: boolean;
  children: ReactNode;
};

/**
 * Provider that manages a single realtime subscription for an event.
 * All child components can subscribe to events without creating duplicate connections.
 */
export function RealtimeProvider({
  eventId,
  enabled = true,
  children,
}: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef<Map<string, RealtimeListener>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Subscribe a listener
  const subscribe = useCallback((listener: RealtimeListener) => {
    listenersRef.current.set(listener.id, listener);

    // Return unsubscribe function
    return () => {
      listenersRef.current.delete(listener.id);
    };
  }, []);

  // Dispatch events to all listeners
  const dispatchGuestInsert = useCallback((payload: BroadcastGuestPayload) => {
    listenersRef.current.forEach((listener) => {
      listener.onGuestInsert?.(payload);
    });
  }, []);

  const dispatchGuestUpdate = useCallback((payload: BroadcastGuestPayload) => {
    listenersRef.current.forEach((listener) => {
      listener.onGuestUpdate?.(payload);
    });
  }, []);

  const dispatchGuestDelete = useCallback((payload: BroadcastGuestPayload) => {
    listenersRef.current.forEach((listener) => {
      listener.onGuestDelete?.(payload);
    });
  }, []);

  const dispatchEventUpdate = useCallback((payload: BroadcastEventPayload) => {
    listenersRef.current.forEach((listener) => {
      listener.onEventUpdate?.(payload);
    });
  }, []);

  // Manage the single subscription
  useEffect(() => {
    if (!enabled || !eventId) {
      return;
    }

    let isActive = true;
    const supabase = createClient();
    const channelName = `event:${eventId}`;

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "guest:insert" }, (message: { payload: BroadcastGuestPayload }) => {
        if (isActive) dispatchGuestInsert(message.payload);
      })
      .on("broadcast", { event: "guest:update" }, (message: { payload: BroadcastGuestPayload }) => {
        if (isActive) dispatchGuestUpdate(message.payload);
      })
      .on("broadcast", { event: "guest:delete" }, (message: { payload: BroadcastGuestPayload }) => {
        if (isActive) dispatchGuestDelete(message.payload);
      })
      .on("broadcast", { event: "event:update" }, (message: { payload: BroadcastEventPayload }) => {
        if (isActive) dispatchEventUpdate(message.payload);
      })
      .subscribe((status: string, err?: Error) => {
        if (!isActive) return;

        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] ✅ Connected to ${channelName}`);
          setIsConnected(true);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[Realtime] ❌ Channel error:`, err?.message || err);
          setIsConnected(false);
        } else if (status === "TIMED_OUT") {
          console.warn(`[Realtime] ⏱️ Connection timed out`);
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      isActive = false;
      setIsConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [eventId, enabled, dispatchGuestInsert, dispatchGuestUpdate, dispatchGuestDelete, dispatchEventUpdate]);

  return (
    <RealtimeContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook to subscribe to realtime events within a RealtimeProvider.
 */
export function useRealtimeSubscription(callbacks: {
  onGuestInsert?: (guest: BroadcastGuestPayload) => void;
  onGuestUpdate?: (guest: BroadcastGuestPayload) => void;
  onGuestDelete?: (guest: BroadcastGuestPayload) => void;
  onEventUpdate?: (event: BroadcastEventPayload) => void;
}) {
  const context = useContext(RealtimeContext);
  const callbacksRef = useRef(callbacks);
  const listenerId = useId();

  // Update callbacks ref
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    if (!context) {
      console.warn("[Realtime] useRealtimeSubscription must be used within a RealtimeProvider");
      return;
    }

    const unsubscribe = context.subscribe({
      id: listenerId,
      onGuestInsert: (payload) => callbacksRef.current.onGuestInsert?.(payload),
      onGuestUpdate: (payload) => callbacksRef.current.onGuestUpdate?.(payload),
      onGuestDelete: (payload) => callbacksRef.current.onGuestDelete?.(payload),
      onEventUpdate: (payload) => callbacksRef.current.onEventUpdate?.(payload),
    });

    return unsubscribe;
  }, [context, listenerId]);

  return {
    isConnected: context?.isConnected ?? false,
  };
}

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
