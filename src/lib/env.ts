function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Fails at import if any required value is blank. */
export const env = {
  clerkPublishableKey: required("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSecretKey: required("CLERK_SECRET_KEY"),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
};
