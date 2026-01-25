import { TEMPLATES } from "@/lib/templates/templates";

export const MAX_INVITE_MESSAGE_CHARS = 1024;

export type InviteMediaType = "image" | "document";

/**
 * Mirrors `getInviteTemplateName` from `lib/whatsapp`, but kept here to avoid
 * importing server-only WhatsApp code into the client bundle.
 */
function getInviteTemplateName(
  locale: string,
  qrEnabled: boolean,
  mediaType: InviteMediaType,
  guestsEnabled: boolean
): string {
  const typePrefix = mediaType === "image" ? "invite_img" : "invite_doc";
  const qrSuffix = qrEnabled ? "_qr" : "";
  const guestsSuffix = guestsEnabled ? "_guests" : "";
  const langSuffix = locale === "ar" ? "_ar" : "_en";
  return `${typePrefix}${qrSuffix}${guestsSuffix}${langSuffix}`;
}

/**
 * Counts user-perceived characters (Unicode code points).
 * This treats emojis as 1 character (unlike `.length` which counts UTF-16 code units).
 */
export function countMessageChars(input: string): number {
  return Array.from(input ?? "").length;
}

export function renderInviteMessage(params: {
  locale: "en" | "ar" | string;
  qrEnabled: boolean;
  guestsEnabled: boolean;
  mediaType: InviteMediaType;
  invitee: string;
  greetingText: string;
  date: string;
  time: string;
  locationName: string;
  inviteCount?: number;
}): string {
  const templateName = getInviteTemplateName(
    params.locale,
    params.qrEnabled,
    params.mediaType,
    params.guestsEnabled
  ) as keyof typeof TEMPLATES;

  type TemplateParams = {
    invitee: string;
    greeting_text: string;
    date: string;
    time: string;
    location_name: string;
    invite_count?: string;
  };

  const templateFn =
    TEMPLATES[templateName] as unknown as ((p: TemplateParams) => string) | undefined;

  if (!templateFn) {
    return params.greetingText ?? "";
  }

  return templateFn({
    invitee: params.invitee,
    greeting_text: params.greetingText,
    date: params.date,
    time: params.time,
    location_name: params.locationName,
    ...(params.guestsEnabled ? { invite_count: String(params.inviteCount ?? 2) } : {}),
  });
}

