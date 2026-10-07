import { Node, SyntaxKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { EdgeKind } from "./types.ts";

export interface RawImport {
  specifier: string;
  kind: EdgeKind;
  line: number;
  /** False for dynamic imports whose argument is not a plain string. */
  isLiteral: boolean;
}

/**
 * Read one file's imports with a real parser. Three forms become edges:
 * static imports (including side-effect and type-only), re-exports
 * (`export ... from`), and dynamic imports with a literal string.
 * require() is out of scope for this phase and ignored here.
 */
export function extractImports(sourceFile: SourceFile): RawImport[] {
  const found: RawImport[] = [];

  for (const declaration of sourceFile.getImportDeclarations()) {
    found.push({
      specifier: declaration.getModuleSpecifierValue(),
      kind: "import",
      line: declaration.getStartLineNumber(),
      isLiteral: true,
    });
  }

  for (const declaration of sourceFile.getExportDeclarations()) {
    const specifier = declaration.getModuleSpecifierValue();
    if (specifier === undefined) continue; // a local export, not an edge
    found.push({ specifier, kind: "re-export", line: declaration.getStartLineNumber(), isLiteral: true });
  }

  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword) continue;
    const first = call.getArguments()[0];
    if (first !== undefined && (Node.isStringLiteral(first) || Node.isNoSubstitutionTemplateLiteral(first))) {
      found.push({
        specifier: first.getLiteralValue(),
        kind: "dynamic-import",
        line: call.getStartLineNumber(),
        isLiteral: true,
      });
    } else {
      // Not resolvable to a file. Reported, never silently dropped.
      found.push({
        specifier: first?.getText() ?? "",
        kind: "dynamic-import",
        line: call.getStartLineNumber(),
        isLiteral: false,
      });
    }
  }

  return found;
}
