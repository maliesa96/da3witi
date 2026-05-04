import { PrismaClient } from "@prisma/client";
import { createDecipheriv } from "crypto";
import type { WhatsAppCredentials, Config } from "./config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

interface CacheEntry {
  credentials: WhatsAppCredentials;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function decryptToken(encoded: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const buf = Buffer.from(encoded, "base64");

  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final("utf8");
}

export function createVendorCredentialResolver(prisma: PrismaClient, config: Config) {
  const cache = new Map<string, CacheEntry>();

  const defaultCredentials: WhatsAppCredentials | null =
    config.whatsappPhoneNumberId && config.metaAccessToken
      ? {
          whatsappPhoneNumberId: config.whatsappPhoneNumberId,
          metaAccessToken: config.metaAccessToken,
          whatsappVersion: config.whatsappVersion,
        }
      : null;

  return {
    async resolve(vendorId: string | null | undefined): Promise<WhatsAppCredentials> {
      if (!vendorId) {
        if (!defaultCredentials) {
          throw new Error("No default WhatsApp credentials configured and no vendorId provided");
        }
        return defaultCredentials;
      }

      const now = Date.now();
      const cached = cache.get(vendorId);
      if (cached && cached.expiresAt > now) {
        return cached.credentials;
      }

      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: {
          whatsappPhoneNumberId: true,
          metaAccessTokenEncrypted: true,
        },
      });

      if (!vendor?.whatsappPhoneNumberId || !vendor?.metaAccessTokenEncrypted) {
        if (!defaultCredentials) {
          throw new Error(`Vendor ${vendorId} has no WhatsApp credentials and no default configured`);
        }
        return defaultCredentials;
      }

      if (!config.encryptionKey) {
        throw new Error("ENCRYPTION_KEY is required to decrypt vendor tokens");
      }

      const token = decryptToken(vendor.metaAccessTokenEncrypted, config.encryptionKey);

      const credentials: WhatsAppCredentials = {
        whatsappPhoneNumberId: vendor.whatsappPhoneNumberId,
        metaAccessToken: token,
        whatsappVersion: config.whatsappVersion,
      };

      cache.set(vendorId, { credentials, expiresAt: now + CACHE_TTL_MS });

      return credentials;
    },

    clearCache() {
      cache.clear();
    },
  };
}

export type VendorCredentialResolver = ReturnType<typeof createVendorCredentialResolver>;
