import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ orgId, orgSlug }, cookieStore] = await Promise.all([
    auth(),
    cookies(),
  ]);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);
  const orgLabel = orgSlug ?? orgId ?? "no organization";

  return (
    <AppShell theme={theme} orgLabel={orgLabel}>
      {children}
    </AppShell>
  );
}
