import type { WhatsAppCredentials } from "./config";
import type { WhatsAppResponse } from "./types";

export function createWhatsAppClient(defaultVersion: string) {
  return {
    async send(
      payload: Record<string, unknown>,
      credentials: WhatsAppCredentials
    ): Promise<WhatsAppResponse> {
      const version = credentials.whatsappVersion || defaultVersion;
      const url = `https://graph.facebook.com/${version}/${credentials.whatsappPhoneNumberId}/messages`;

      const body = { messaging_product: "whatsapp", ...payload };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.metaAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, data };
    },

    extractMessageId(data: unknown): string | undefined {
      if (typeof data !== "object" || data === null) return undefined;
      const messages = (data as Record<string, unknown>).messages;
      if (!Array.isArray(messages) || messages.length === 0) return undefined;
      const first = messages[0];
      if (typeof first !== "object" || first === null) return undefined;
      const id = (first as Record<string, unknown>).id;
      return typeof id === "string" ? id : undefined;
    },
  };
}

export type WhatsAppClient = ReturnType<typeof createWhatsAppClient>;
