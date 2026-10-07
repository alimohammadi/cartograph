import data from "./trpc-server.parse.json";
import { parseResultFromJson, type ParseResult } from "@/parser/types";

/**
 * Scaffolding fixture: parser output for tRPC's server package, checked in
 * so the canvas builds without an account, a database, or a network. The
 * JSON is the parser's shape verbatim; this module only validates and types
 * it. Goes away once analyses are stored properly.
 */
export const sampleParse: ParseResult = parseResultFromJson(data as unknown);
