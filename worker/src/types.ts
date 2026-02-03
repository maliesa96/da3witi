export interface JobMeta {
  kind?: "invite" | "webhook_followup";
  guestId?: string;
  eventId?: string;
  locale?: "en" | "ar";
  [key: string]: unknown;
}

export interface JobData {
  payload: Record<string, unknown>;
  meta: JobMeta;
}

export interface WhatsAppResponse {
  ok: boolean;
  status: number;
  data: unknown;
}
