export interface StreamEntry {
  id: string;
  payload: Record<string, unknown>;
  meta: {
    kind?: string;
    guestId?: string;
    eventId?: string;
    [key: string]: unknown;
  };
}

export interface WhatsAppResponse {
  ok: boolean;
  status: number;
  data: unknown;
}
