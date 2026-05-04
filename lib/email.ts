const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = "hello@da3witi.com";

interface SendEmailParams {
  subject: string;
  html: string;
  to?: string[];
  from?: string;
}

/**
 * Send an email notification via Resend.
 * By default, fails silently so it never blocks webhooks.
 * Pass `throwOnError: true` to propagate failures to the caller.
 */
export async function sendEmailNotification({ subject, html, to, from, throwOnError }: SendEmailParams & { throwOnError?: boolean }) {
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
        from: from || "Da3witi Notifications <notifications@da3witi.com>",
        to: to || [NOTIFICATION_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[Email] Failed to send:", res.status, data);
      if (throwOnError) throw new Error(`Email send failed: ${res.status}`);
    }
  } catch (err) {
    console.error("[Email] Error sending notification:", err);
    if (throwOnError) throw err;
  }
}

/**
 * Send an invitation email to a customer when a vendor creates their event.
 * Contains a link that signs the customer in and prompts them to set a password.
 */
export async function sendCustomerInvitationEmail({
  customerEmail,
  eventTitle,
  inviteUrl,
  siteName,
  locale,
}: {
  customerEmail: string;
  eventTitle: string;
  inviteUrl: string;
  siteName: string;
  locale: string;
}) {
  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";

  const subject = isArabic
    ? `${siteName} - "${eventTitle}" مناسبتك جاهزة`
    : `${siteName} - Your event "${eventTitle}" is ready`;

  const heading = isArabic ? "مناسبتك جاهزة!" : "Your event is ready!";
  const body = isArabic
    ? `تم إنشاء مناسبتك <strong>"${eventTitle}"</strong>. اضغط على الزر أدناه لإنشاء كلمة المرور الخاصة بك والدخول إلى لوحة التحكم.`
    : `Your event <strong>"${eventTitle}"</strong> has been created. Click the button below to set up your password and access your dashboard.`;
  const ctaText = isArabic ? "إعداد الحساب" : "Set Up Account";
  const footer = isArabic
    ? `إذا لم تتمكن من الضغط على الزر، انسخ هذا الرابط في المتصفح:`
    : `If the button doesn't work, copy and paste this link into your browser:`;

  const html = `
    <div dir="${dir}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px 0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; color: #1c1917; margin: 0;">${heading}</h1>
      </div>
      <div style="background: #f5f5f4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 15px; color: #1c1917; line-height: 1.6;">${body}</div>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${inviteUrl}" style="display: inline-block; padding: 12px 32px; background: #1c1917; color: white; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
          ${ctaText}
        </a>
      </div>
      <div style="font-size: 12px; color: #a8a29e; text-align: center; word-break: break-all;">
        ${footer}<br/>
        <a href="${inviteUrl}" style="color: #78716c;">${inviteUrl}</a>
      </div>
      <div style="margin-top: 24px; font-size: 11px; color: #a8a29e; text-align: center;">
        ${siteName}
      </div>
    </div>
  `.trim();

  const fromName = siteName || "Da3witi";

  await sendEmailNotification({
    subject,
    html,
    to: [customerEmail],
    from: `${fromName} <notifications@da3witi.com>`,
    throwOnError: true,
  });
}

/**
 * Send an invitation email to an existing user when a vendor creates their event.
 * Tells them they already have an account and should log in with their existing credentials.
 */
export async function sendExistingCustomerInvitationEmail({
  customerEmail,
  eventTitle,
  loginUrl,
  siteName,
  locale,
}: {
  customerEmail: string;
  eventTitle: string;
  loginUrl: string;
  siteName: string;
  locale: string;
}) {
  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";

  const subject = isArabic
    ? `${siteName} - "${eventTitle}" مناسبتك جاهزة`
    : `${siteName} - Your event "${eventTitle}" is ready`;

  const heading = isArabic ? "مناسبتك جاهزة!" : "Your event is ready!";
  const body = isArabic
    ? `تم إنشاء مناسبتك <strong>"${eventTitle}"</strong>. لديك حساب مسجل بالفعل في <a href="https://da3witi.com" style="color: #4f46e5; text-decoration: underline;">Da3witi.com</a> بهذا البريد الإلكتروني (<strong>${customerEmail}</strong>). يمكنك تسجيل الدخول بنفس بياناتك للوصول إلى لوحة التحكم.`
    : `Your event <strong>"${eventTitle}"</strong> has been created. You already have a <a href="https://da3witi.com" style="color: #4f46e5; text-decoration: underline;">Da3witi.com</a> account with this email (<strong>${customerEmail}</strong>). Log in with your existing credentials to access your dashboard.`;
  const ctaText = isArabic ? "تسجيل الدخول" : "Log In";
  const footer = isArabic
    ? `إذا لم تتمكن من الضغط على الزر، انسخ هذا الرابط في المتصفح:`
    : `If the button doesn't work, copy and paste this link into your browser:`;

  const html = `
    <div dir="${dir}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px 0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 20px; color: #1c1917; margin: 0;">${heading}</h1>
      </div>
      <div style="background: #f5f5f4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 15px; color: #1c1917; line-height: 1.6;">${body}</div>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${loginUrl}" style="display: inline-block; padding: 12px 32px; background: #1c1917; color: white; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
          ${ctaText}
        </a>
      </div>
      <div style="font-size: 12px; color: #a8a29e; text-align: center; word-break: break-all;">
        ${footer}<br/>
        <a href="${loginUrl}" style="color: #78716c;">${loginUrl}</a>
      </div>
      <div style="margin-top: 24px; font-size: 11px; color: #a8a29e; text-align: center;">
        ${siteName}
      </div>
    </div>
  `.trim();

  const fromName = siteName || "Da3witi";

  await sendEmailNotification({
    subject,
    html,
    to: [customerEmail],
    from: `${fromName} <notifications@da3witi.com>`,
    throwOnError: true,
  });
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
