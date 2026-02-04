import { createClient } from "@supabase/supabase-js";

/**
 * Guest data for broadcast.
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
 * Create a Supabase client for broadcasting.
 */
function createBroadcastClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

/**
 * Broadcast a guest update event to all subscribers of an event channel.
 */
export async function broadcastGuestUpdate(
  eventId: string,
  guest: BroadcastGuestPayload
): Promise<void> {
  const supabase = createBroadcastClient();
  if (!supabase) {
    console.log("[Broadcast] Supabase not configured, skipping broadcast");
    return;
  }

  const channelName = `event:${eventId}`;

  try {
    const channel = supabase.channel(channelName);
    await channel.send({
      type: "broadcast",
      event: "guest:update",
      payload: guest,
    });
    await supabase.removeChannel(channel);
    console.log(
      `[Broadcast] Sent guest:update to ${channelName} - ${guest.name}: ${guest.oldStatus} → ${guest.status}`
    );
  } catch (error) {
    console.error(`[Broadcast] Failed to send guest:update:`, error);
  }
}
