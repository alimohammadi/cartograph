"use client";

import { useRouter } from "next/navigation";

import { THEME_COOKIE, type Theme } from "@/lib/theme";

const options: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeControl({ value }: { value: Theme }) {
  const router = useRouter();

  function setTheme(next: Theme) {
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.dataset.theme = next;
    router.refresh();
  }

  return (
    <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      <span className="sr-only">Theme</span>
      <select
        value={value}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="h-6 cursor-pointer rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 font-sans text-[11px] text-[var(--foreground)]"
        aria-label="Theme"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
