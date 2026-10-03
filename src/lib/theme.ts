export const THEME_COOKIE = "cg-theme";

export type Theme = "system" | "light" | "dark";

export function parseTheme(value: string | undefined): Theme {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}
