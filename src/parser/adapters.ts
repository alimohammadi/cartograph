import type { ParsedFile } from "./types.ts";

/**
 * Framework knowledge lives here, behind this interface, never inside the
 * parser. An adapter only classifies files it is given; it never walks the
 * disk and never resolves imports.
 */
export interface FrameworkAdapter {
  readonly name: string;
  classify(file: Pick<ParsedFile, "id" | "directory" | "language" | "isEntryPoint">): string;
}

/** No framework. Every file is "unknown", and the run records framework "none". */
export const fallbackAdapter: FrameworkAdapter = {
  name: "none",
  classify: () => "unknown",
};
