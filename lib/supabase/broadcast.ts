import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client for server-side broadcasting.
 * Uses the service role key if available, otherwise anon key.
 */
function createBroadcastClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Prefer service role for server-side operations, fall back to anon key
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

  return createClient(url, key);
}

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

/**
 * Broadcast a guest insert event to all subscribers of an event channel.
 */
export async function broadcastGuestInsert(
  eventId: string,
  guest: BroadcastGuestPayload
) {
  const supabase = createBroadcastClient();
  const channelName = `event:${eventId}`;

  try {
    const channel = supabase.channel(channelName);
    await channel.send({
      type: "broadcast",
      event: "guest:insert",
      payload: guest,
    });
    await supabase.removeChannel(channel);
    console.log(`[Broadcast] Sent guest:insert to ${channelName}`);
  } catch (error) {
    console.error(`[Broadcast] Failed to send guest:insert:`, error);
  }
}

/**
 * Broadcast a guest update event to all subscribers of an event channel.
 */
export async function broadcastGuestUpdate(
  eventId: string,
  guest: BroadcastGuestPayload
) {
  const supabase = createBroadcastClient();
  const channelName = `event:${eventId}`;

  try {
    const channel = supabase.channel(channelName);
    await channel.send({
      type: "broadcast",
      event: "guest:update",
      payload: guest,
    });
    await supabase.removeChannel(channel);
    console.log(`[Broadcast] Sent guest:update to ${channelName} - ${guest.name}: ${guest.oldStatus} → ${guest.status}`);
  } catch (error) {
    console.error(`[Broadcast] Failed to send guest:update:`, error);
  }
}

/**
 * Broadcast a guest delete event to all subscribers of an event channel.
 */
export async function broadcastGuestDelete(
  eventId: string,
  guest: BroadcastGuestPayload
) {
  const supabase = createBroadcastClient();
  const channelName = `event:${eventId}`;

  try {
    const channel = supabase.channel(channelName);
    await channel.send({
      type: "broadcast",
      event: "guest:delete",
      payload: guest,
    });
    await supabase.removeChannel(channel);
    console.log(`[Broadcast] Sent guest:delete to ${channelName}`);
  } catch (error) {
    console.error(`[Broadcast] Failed to send guest:delete:`, error);
  }
}

/**
 * Broadcast an event stats update to all subscribers.
 */
export async function broadcastEventUpdate(
  eventId: string,
  stats: BroadcastEventPayload
) {
  const supabase = createBroadcastClient();
  const channelName = `event:${eventId}`;

  try {
    const channel = supabase.channel(channelName);
    await channel.send({
      type: "broadcast",
      event: "event:update",
      payload: stats,
    });
    await supabase.removeChannel(channel);
    console.log(`[Broadcast] Sent event:update to ${channelName}`);
  } catch (error) {
    console.error(`[Broadcast] Failed to send event:update:`, error);
  }
}
