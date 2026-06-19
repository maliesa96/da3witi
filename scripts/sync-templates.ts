/**
 * Sync da3witi WABA templates to a vendor WABA account.
 *
 * Usage:
 *   npx tsx scripts/sync-templates.ts <DEST_WABA_ID> --footer|--no-footer
 *
 * Tokens are resolved in order:
 *   1. SOURCE_TOKEN / DEST_TOKEN env vars (explicit override)
 *   2. META_ACCESS_TOKEN from .env.local (source) / .env.vendor (dest)
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const API_VERSION = "v25.0";

function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    vars[key] = raw.replace(/^["']|["']$/g, "");
  }
  return vars;
}
const SOURCE_WABA_ID = "2177304666347178"; // da3witi

const SAMPLES_DIR = join(import.meta.dirname!, "..", "samples");
const SAMPLE_IMAGE = readFileSync(join(SAMPLES_DIR, "image.jpg"));
const SAMPLE_PDF = readFileSync(join(SAMPLES_DIR, "ReefAndMishari.pdf"));

// ---------------------------------------------------------------------------

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
  example?: Record<string, unknown>;
}

interface Template {
  name: string;
  language: string;
  category: string;
  components: TemplateComponent[];
  status: string;
  id: string;
}

interface FetchTemplatesResponse {
  data: Template[];
  paging?: { cursors?: { after?: string }; next?: string };
}

// ---------------------------------------------------------------------------
// Meta Resumable Upload API — upload a buffer and get a file handle
// ---------------------------------------------------------------------------

async function getAppId(token: string): Promise<string> {
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/debug_token?input_token=${token}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`debug_token failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { data?: { app_id?: string } };
  const appId = json.data?.app_id;
  if (!appId) throw new Error("Could not determine App ID from token");
  return appId;
}

async function uploadMediaHandle(
  appId: string,
  token: string,
  buf: Buffer,
  mimeType: string
): Promise<string> {
  // Step 1: create upload session
  const sessionRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${appId}/uploads` +
      `?file_length=${buf.length}&file_type=${encodeURIComponent(mimeType)}` +
      `&access_token=${encodeURIComponent(token)}`,
    { method: "POST" }
  );
  if (!sessionRes.ok) {
    const body = await sessionRes.text();
    throw new Error(`Upload session failed (${sessionRes.status}): ${body}`);
  }
  const { id: sessionId } = (await sessionRes.json()) as { id: string };

  // Step 2: upload binary data
  const uploadRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${sessionId}`,
    {
      method: "POST",
      headers: {
        Authorization: `OAuth ${token}`,
        file_offset: "0",
        "Content-Type": mimeType,
      },
      body: new Uint8Array(buf),
    }
  );
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`Upload data failed (${uploadRes.status}): ${body}`);
  }
  const { h: handle } = (await uploadRes.json()) as { h: string };
  return handle;
}

// ---------------------------------------------------------------------------

async function fetchAllTemplates(
  wabaId: string,
  token: string
): Promise<Template[]> {
  const all: Template[] = [];
  let url: string | null =
    `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates?limit=100&fields=name,language,category,components,status`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GET templates failed (${res.status}): ${body}`);
    }
    const json: FetchTemplatesResponse = await res.json();
    all.push(...json.data);
    url = json.paging?.next ?? null;
  }

  return all;
}

const MESSAGE_SEND_TTL_SECONDS = 43200; // 12 hours
function buildCreatePayload(
  t: Template,
  mediaHandles: { image?: string; document?: string },
  includeFooter: boolean
) {
  const components = t.components
    .filter((c) => includeFooter || c.type !== "FOOTER")
    .map((c) => {
      const clean: Record<string, unknown> = { type: c.type };
      if (c.format) clean.format = c.format;
      if (c.text) clean.text = c.text;
      if (c.buttons) clean.buttons = c.buttons;

      if (
        c.type === "HEADER" &&
        (c.format === "IMAGE" || c.format === "DOCUMENT")
      ) {
        const handle =
          c.format === "IMAGE" ? mediaHandles.image : mediaHandles.document;
        if (handle) {
          clean.example = { header_handle: [handle] };
        }
      } else if (c.example) {
        clean.example = c.example;
      }

      return clean;
    });

  return {
    name: t.name,
    language: t.language,
    category: t.category,
    parameter_format: "named",
    message_send_ttl_seconds: MESSAGE_SEND_TTL_SECONDS,
    components,
  };
}

async function deleteTemplate(
  wabaId: string,
  token: string,
  name: string
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function createTemplate(
  wabaId: string,
  token: string,
  payload: ReturnType<typeof buildCreatePayload>
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

// ---------------------------------------------------------------------------

async function main() {
  const destWabaId = process.argv[2];
  if (!destWabaId) {
    console.error(
      "Usage: npx tsx scripts/sync-templates.ts <DEST_WABA_ID> --footer|--no-footer"
    );
    process.exit(1);
  }

  const hasFooterFlag = process.argv.includes("--footer");
  const hasNoFooterFlag = process.argv.includes("--no-footer");
  if (!hasFooterFlag && !hasNoFooterFlag) {
    console.error("Missing required flag: --footer or --no-footer");
    process.exit(1);
  }
  if (hasFooterFlag && hasNoFooterFlag) {
    console.error("Cannot use both --footer and --no-footer");
    process.exit(1);
  }
  const includeFooter = hasFooterFlag;

  const rootDir = join(import.meta.dirname!, "..");
  const envLocal = loadEnvFile(join(rootDir, ".env.local"));
  const envVendor = loadEnvFile(join(rootDir, ".env.vendor"));

  const sourceToken =
    process.env.SOURCE_TOKEN || envLocal.META_ACCESS_TOKEN;
  const destToken =
    process.env.DEST_TOKEN || envVendor.META_ACCESS_TOKEN;

  if (!sourceToken) {
    console.error(
      "Missing source token. Set SOURCE_TOKEN or add META_ACCESS_TOKEN to .env.local."
    );
    process.exit(1);
  }
  if (!destToken) {
    console.error(
      "Missing destination token. Set DEST_TOKEN or add META_ACCESS_TOKEN to .env.vendor."
    );
    process.exit(1);
  }

  console.log(
    `Footer: ${includeFooter ? "included" : "excluded"} (${includeFooter ? "--footer" : "--no-footer"})\n`
  );

  // --- Pre-fetch destination templates to know which to skip ---------------
  console.log(
    `Fetching existing templates from destination WABA (${destWabaId})...`
  );
  const destTemplates = await fetchAllTemplates(destWabaId, destToken);
  const activeKeys = new Set(
    destTemplates
      .filter((t) => t.status === "APPROVED" || t.status === "PENDING")
      .map((t) => `${t.name}::${t.language}`)
  );
  const rejectedKeys = new Set(
    destTemplates
      .filter((t) => t.status === "REJECTED")
      .map((t) => `${t.name}::${t.language}`)
  );
  console.log(
    `  ${destTemplates.length} templates on destination ` +
      `(${activeKeys.size} active, ${rejectedKeys.size} rejected).\n`
  );

  // --- Fetch source templates ---------------------------------------------
  console.log(`Fetching templates from da3witi WABA (${SOURCE_WABA_ID})...`);
  const templates = await fetchAllTemplates(SOURCE_WABA_ID, sourceToken);

  const approved = templates.filter((t) => t.status === "APPROVED");
  console.log(
    `Found ${templates.length} templates total, ${approved.length} APPROVED.\n`
  );


  if (approved.length === 0) {
    console.log("Nothing to sync.");
    return;
  }

  // Filter out already-active ones; rejected ones will be deleted + re-created
  const toCreate = approved.filter(
    (t) => !activeKeys.has(`${t.name}::${t.language}`)
  );
  const skippedExisting = approved.length - toCreate.length;

  // Group by name for display
  const byName = new Map<string, Template[]>();
  for (const t of approved) {
    const list = byName.get(t.name) || [];
    list.push(t);
    byName.set(t.name, list);
  }

  console.log("All APPROVED source templates:");
  for (const [name, langs] of byName) {
    const langLabels = langs.map((l) => {
      const key = `${l.name}::${l.language}`;
      if (activeKeys.has(key)) return `${l.language} ✓`;
      if (rejectedKeys.has(key)) return `${l.language} ✗ (will delete+recreate)`;
      return l.language;
    });
    console.log(`  ${name} [${langLabels.join(", ")}]`);
  }
  if (skippedExisting > 0) {
    console.log(`\n  (✓ = active, will skip)  (✗ = rejected, will replace)`);
  }
  console.log();

  if (toCreate.length === 0) {
    console.log("All templates already active. Nothing to do.");
    return;
  }

  if (process.argv.includes("--dry-run")) {
    console.log(
      `Dry run — would create ${toCreate.length}, skip ${skippedExisting}.`
    );
    return;
  }

  // --- Upload placeholder media to get handles for header examples --------
  const needsMedia = toCreate.some((t) =>
    t.components.some(
      (c) =>
        c.type === "HEADER" &&
        (c.format === "IMAGE" || c.format === "DOCUMENT")
    )
  );

  const mediaHandles: { image?: string; document?: string } = {};

  if (needsMedia) {
    console.log("Uploading placeholder media for header examples...");
    const appId = await getAppId(destToken);
    console.log(`  App ID: ${appId}`);

    const needsImage = toCreate.some((t) =>
      t.components.some((c) => c.type === "HEADER" && c.format === "IMAGE")
    );
    const needsDoc = toCreate.some((t) =>
      t.components.some((c) => c.type === "HEADER" && c.format === "DOCUMENT")
    );

    if (needsImage) {
      const handle = await uploadMediaHandle(
        appId,
        destToken,
        SAMPLE_IMAGE,
        "image/jpeg"
      );
      mediaHandles.image = handle;
      console.log(`  Image handle: ${handle.slice(0, 20)}...`);
    }
    if (needsDoc) {
      const handle = await uploadMediaHandle(
        appId,
        destToken,
        SAMPLE_PDF,
        "application/pdf"
      );
      mediaHandles.document = handle;
      console.log(`  Document handle: ${handle.slice(0, 20)}...`);
    }
    console.log();
  }

  // --- Delete rejected templates before re-creating -----------------------
  const rejectedToDelete = new Set<string>();
  for (const t of toCreate) {
    const key = `${t.name}::${t.language}`;
    if (rejectedKeys.has(key) && !rejectedToDelete.has(t.name)) {
      rejectedToDelete.add(t.name);
    }
  }
  for (const name of rejectedToDelete) {
    process.stdout.write(`Deleting rejected template ${name}...`);
    const result = await deleteTemplate(destWabaId, destToken, name);
    if (result.ok) {
      console.log(` ✓`);
    } else {
      const err = result.body as Record<string, unknown>;
      const errorObj = err?.error as Record<string, unknown> | undefined;
      const msg = errorObj?.error_user_msg || errorObj?.message || "";
      console.log(` FAILED: ${msg}`);
    }
  }
  if (rejectedToDelete.size > 0) console.log();

  // --- Create templates ---------------------------------------------------
  const renameOnConflict = process.argv.includes("--rename");
  let created = 0;
  let failed = 0;

  for (const t of toCreate) {
    const payload = buildCreatePayload(t, mediaHandles, includeFooter);
    const label = `${t.name} (${t.language})`;
    process.stdout.write(`Creating ${label}...`);

    let result = await createTemplate(destWabaId, destToken, payload);

    if (!result.ok && renameOnConflict) {
      const err = result.body as Record<string, unknown>;
      const errorMsg =
        ((err?.error as Record<string, unknown>)?.error_user_msg as string) ??
        "";
      if (errorMsg.includes("being deleted")) {
        const altName = `${payload.name}_2`;
        process.stdout.write(` conflict, retrying as ${altName}...`);
        payload.name = altName;
        result = await createTemplate(destWabaId, destToken, payload);
      }
    }

    if (result.ok) {
      console.log(` ✓`);
      created++;
    } else {
      const err = result.body as Record<string, unknown>;
      const errorObj = err?.error as Record<string, unknown> | undefined;
      const msg = errorObj?.error_user_msg || errorObj?.message || "";
      console.log(` FAILED (${result.status}): ${msg}`);
      failed++;
    }
  }

  console.log(
    `\nDone. Created: ${created}, Skipped (existing): ${skippedExisting}, Failed: ${failed}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
