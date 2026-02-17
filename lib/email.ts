const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = "hello@da3witi.com";

interface SendEmailParams {
  subject: string;
  html: string;
}

/**
 * Send an email notification via Resend.
 * Fails silently with a console error so it never blocks the webhook.
 */
export async function sendEmailNotification({ subject, html }: SendEmailParams) {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set, skipping notification");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Da3witi Notifications <notifications@da3witi.com>",
        to: [NOTIFICATION_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[Email] Failed to send:", res.status, data);
    }
  } catch (err) {
    console.error("[Email] Error sending notification:", err);
  }
}

/**
 * Send an email notification for an inbound WhatsApp message that needs a reply.
 */
export function sendWhatsAppMessageNotification({
  phone,
  senderName,
  body,
}: {
  phone: string;
  senderName: string | null;
  body: string;
}) {
  const displayName = senderName || phone;
  const preview = body.length > 60 ? body.slice(0, 60) + "…" : body;

  const subject = `💬 ${displayName}: ${preview}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #f5f5f4; border-radius: 12px; padding: 20px; margin-top: 16px;">
        <div style="font-size: 13px; color: #78716c; margin-bottom: 8px;">
          ${senderName ? `<strong style="color: #1c1917;">${senderName}</strong> &middot; ${phone}` : `<strong style="color: #1c1917;">${phone}</strong>`}
        </div>
        <div style="font-size: 15px; color: #1c1917; line-height: 1.5; white-space: pre-wrap;">${body}</div>
      </div>
      <div style="margin-top: 16px; text-align: center;">
        <a href="https://da3witi.com/en/admin/whatsapp" style="display: inline-block; padding: 10px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Reply in Dashboard
        </a>
      </div>
      <div style="margin-top: 16px; font-size: 11px; color: #a8a29e; text-align: center;">
        Da3witi WhatsApp Notifications
      </div>
    </div>
  `.trim();

  // Fire-and-forget so we don't slow down the webhook
  sendEmailNotification({ subject, html });
}
