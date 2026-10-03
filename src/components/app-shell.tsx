import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

import { ThemeControl } from "@/components/theme-control";
import type { Theme } from "@/lib/theme";

export function AppShell({
  theme,
  orgLabel,
  children,
}: {
  theme: Theme;
  orgLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-9 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3">
        <span className="font-mono text-[11px] tracking-tight text-[var(--foreground)]">
          Cartograph
        </span>
        <span className="font-mono text-[11px] text-[var(--muted)]">{orgLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeControl value={theme} />
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            appearance={{
              elements: {
                rootBox: "flex items-center",
                organizationSwitcherTrigger:
                  "h-6 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[11px]",
              },
            }}
          />
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-6",
              },
            }}
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
