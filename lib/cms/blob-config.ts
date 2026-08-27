/** Vercel Blob store `ledpaneel-media` env vars (auto-created when store is linked). */
export const LEDPANEEL_BLOB_ENV = {
  READ_WRITE_TOKEN: "ledpaneel_READ_WRITE_TOKEN",
  STORE_ID: "ledpaneel_STORE_ID",
  WEBHOOK_PUBLIC_KEY: "ledpaneel_WEBHOOK_PUBLIC_KEY",
} as const;

export function getLedpaneelBlobToken(): string | undefined {
  return process.env[LEDPANEEL_BLOB_ENV.READ_WRITE_TOKEN];
}

export function getLedpaneelBlobStoreId(): string | undefined {
  return process.env[LEDPANEEL_BLOB_ENV.STORE_ID];
}

export function getLedpaneelBlobWebhookPublicKey(): string | undefined {
  return process.env[LEDPANEEL_BLOB_ENV.WEBHOOK_PUBLIC_KEY];
}

export function getBlobCommandOptions(): { token?: string; storeId?: string } {
  const token = getLedpaneelBlobToken();
  const storeId = getLedpaneelBlobStoreId();
  return {
    ...(token ? { token } : {}),
    ...(storeId ? { storeId } : {}),
  };
}

export function isBlobStorageConfigured(): boolean {
  return Boolean(getLedpaneelBlobToken());
}
