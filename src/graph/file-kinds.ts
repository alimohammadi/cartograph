import type { ParsedFile } from "../parser/types.ts";

/**
 * File categories for the left rail: a colour swatch, a name, and a count.
 * The parser's per-file signal is the language, so categories are languages.
 * Fixed hues, a handful and no more, consistent in both themes.
 */

export interface FileKind {
  key: string;
  label: string;
  color: string;
}

const KIND_BY_LANGUAGE: Record<string, FileKind> = {
  ts: { key: "ts", label: "TypeScript", color: "#38bdf8" },
  tsx: { key: "tsx", label: "TSX", color: "#a78bfa" },
  js: { key: "js", label: "JavaScript", color: "#eab308" },
  jsx: { key: "jsx", label: "JSX", color: "#fb923c" },
  mjs: { key: "mjs", label: "ES module", color: "#2dd4bf" },
  cjs: { key: "cjs", label: "CommonJS", color: "#94a3b8" },
  mts: { key: "mts", label: "TS module", color: "#0ea5e9" },
  cts: { key: "cts", label: "TS CommonJS", color: "#64748b" },
};

const FALLBACK_KIND: FileKind = { key: "other", label: "Other", color: "#737373" };

export function languageKind(language: string): FileKind {
  return KIND_BY_LANGUAGE[language] ?? FALLBACK_KIND;
}

export interface FileCategory {
  kind: FileKind;
  count: number;
}

/** Categories present in the file list, most files first. Deterministic. */
export function languageCategories(files: Pick<ParsedFile, "language">[]): FileCategory[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    counts.set(file.language, (counts.get(file.language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ kind: languageKind(key), count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.kind.key < b.kind.key ? -1 : 1;
    });
}
