import { createBrowserClient } from "@supabase/ssr";

/** Klien Supabase untuk Client Component (berjalan di browser). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
