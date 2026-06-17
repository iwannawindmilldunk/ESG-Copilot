import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const ESG_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "esg-documents";

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!cachedClient) {
    cachedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return cachedClient;
}

export async function ensureStorageBucket(client: SupabaseClient, bucket = ESG_STORAGE_BUCKET): Promise<void> {
  const { data } = await client.storage.getBucket(bucket);
  if (data) return;

  await client.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: "50MB",
  });
}
