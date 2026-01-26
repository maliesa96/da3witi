import type { Config } from "./config";
import type { WhatsAppResponse } from "./types";

export function createWhatsAppClient(config: Config) {
  const baseUrl = `https://graph.facebook.com/${config.whatsappVersion}/${config.whatsappPhoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${config.metaAccessToken}`,
    "Content-Type": "application/json",
  };

  return {
    async send(payload: Record<string, unknown>): Promise<WhatsAppResponse> {
      // Ensure messaging_product is set
      const body = { messaging_product: "whatsapp", ...payload };

      const response = await fetch(baseUrl, {
        method: "POST",
        headers,
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
