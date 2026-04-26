import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Use in Server Components, Route Handlers, and Server Actions
// No cookie handling needed — no auth
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
