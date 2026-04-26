import { createClient } from "@supabase/supabase-js";

// Use in Server Components, Route Handlers, and Server Actions
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
