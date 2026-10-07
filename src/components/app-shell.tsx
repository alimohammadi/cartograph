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
    <div className="flex h-dvh flex-col bg-[var(--background)]">
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-grid size-3.5 grid-cols-2 gap-px"
            aria-hidden
          >
            <span className="bg-[var(--accent)]" />
            <span className="bg-[var(--border)]" />
            <span className="bg-[var(--border)]" />
            <span className="bg-[var(--foreground)]" />
          </span>
          <span className="font-mono text-[12px] font-medium tracking-tight text-[var(--foreground)]">
            Cartograph
          </span>
        </div>
        <span className="hidden font-mono text-[11px] text-[var(--muted)] sm:inline">
          {orgLabel}
        </span>
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
                  "h-7 rounded-sm border border-[var(--border)] bg-[var(--background)] px-2 text-[11px] text-[var(--foreground)] hover:border-[var(--muted)]",
                organizationSwitcherTriggerIcon: "text-[var(--muted)]",
              },
            }}
          />
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-7 rounded-sm",
                userButtonTrigger: "rounded-sm focus:shadow-none",
              },
            }}
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
