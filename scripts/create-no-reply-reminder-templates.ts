/**
 * Create no_reply_reminder_ar and no_reply_reminder_en templates
 * on both the main da3witi WABA and the CABA WABA.
 *
 * Usage:
 *   npx tsx scripts/create-no-reply-reminder-templates.ts
 *
 * Tokens:
 *   - Main WABA: META_ACCESS_TOKEN from .env.local
 *   - CABA WABA: META_ACCESS_TOKEN from .env.vendor
 */

import { join } from "path";
import { createTemplate, loadEnvFile } from "./sync-templates";

const MAIN_WABA_ID = "2177304666347178";
// const CABA_WABA_ID = "1536604131192440";

const MESSAGE_SEND_TTL_SECONDS = 43200;

const templates = [
  {
    name: "no_reply_reminder_ar",
    language: "ar",
    category: "UTILITY",
    parameter_format: "named",
    message_send_ttl_seconds: MESSAGE_SEND_TTL_SECONDS,
    components: [
      {
        type: "BODY",
        text: "تنويه\nنذكركم بدعوة {{event_name}}. يرجى اختيار (تأكيد الحضور) أو (اعتذر) في الرسالة السابقة.",
        example: {
          body_text_named_params: [
            { param_name: "event_name", example: "حفل زفاف" },
          ],
        },
      },
      {
        type: "FOOTER",
        text: "هذه الرسالة بواسطة da3witi.com.",
      },
    ],
  },
  {
    name: "no_reply_reminder_en",
    language: "en",
    category: "UTILITY",
    parameter_format: "named",
    message_send_ttl_seconds: MESSAGE_SEND_TTL_SECONDS,
    components: [
      {
        type: "BODY",
        text: "Reminder\nYou have a pending invitation to {{event_name}}. Please confirm or decline your attendance using the previous message.",
        example: {
          body_text_named_params: [
            { param_name: "event_name", example: "Wedding Ceremony" },
          ],
        },
      },
      {
        type: "FOOTER",
        text: "Powered by da3witi.com",
      },
    ],
  },
];

async function main() {
  const rootDir = join(import.meta.dirname!, "..");
  const envLocal = loadEnvFile(join(rootDir, ".env.local"));
  const envVendor = loadEnvFile(join(rootDir, ".env.vendor"));

  const mainToken = process.env.MAIN_TOKEN || envLocal.META_ACCESS_TOKEN;
  const cabaToken = process.env.CABA_TOKEN || envVendor.META_ACCESS_TOKEN;

  if (!mainToken) {
    console.error("Missing main WABA token. Set MAIN_TOKEN or add META_ACCESS_TOKEN to .env.local.");
    process.exit(1);
  }
  if (!cabaToken) {
    console.error("Missing CABA WABA token. Set CABA_TOKEN or add META_ACCESS_TOKEN to .env.vendor.");
    process.exit(1);
  }

  const accounts = [
    { label: "Main (da3witi)", wabaId: MAIN_WABA_ID, token: mainToken },
    // { label: "CABA", wabaId: CABA_WABA_ID, token: cabaToken },
  ];

  let totalCreated = 0;
  let totalFailed = 0;

  for (const account of accounts) {
    console.log(`\n=== ${account.label} (WABA ${account.wabaId}) ===\n`);

    for (const tpl of templates) {
      const label = `${tpl.name} (${tpl.language})`;
      process.stdout.write(`Creating ${label}...`);

      const result = await createTemplate(account.wabaId, account.token, tpl);

      if (result.ok) {
        console.log(` ✓`);
        totalCreated++;
      } else {
        const err = result.body as Record<string, unknown>;
        const errorObj = err?.error as Record<string, unknown> | undefined;
        const msg = errorObj?.error_user_msg || errorObj?.message || JSON.stringify(err);
        console.log(` FAILED (${result.status}): ${msg}`);
        totalFailed++;
      }
    }
  }

  console.log(`\nDone. Created: ${totalCreated}, Failed: ${totalFailed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
