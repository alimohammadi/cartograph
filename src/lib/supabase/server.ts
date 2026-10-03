import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/** Clerk session token on every request — no Supabase Auth session. */
export function createServerSupabaseClient() {
  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    async accessToken() {
      return (await auth()).getToken();
    },
  });
}
