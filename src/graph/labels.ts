/**
 * On-screen labels: the shortest trailing path segment that is still unique
 * among everything on screen. "src/parser" next to "lib/parser" reads
 * "src/parser" and "lib/parser"; next to "src/graph" it just reads "parser".
 * Deterministic: same ids, same labels, every time.
 */
export function shortestUniqueLabels(ids: string[]): Record<string, string> {
  const sorted = [...new Set(ids)].sort();
  const labels: Record<string, string> = {};
  for (const id of sorted) {
    const parts = id === "." ? ["."] : id.split("/");
    let label = parts[parts.length - 1] as string;
    for (let take = 1; take <= parts.length; take += 1) {
      const candidate = parts.slice(parts.length - take).join("/");
      const clashes = sorted.some(
        (other) =>
          other !== id &&
          (other === "." ? ["."] : other.split("/")).slice(-take).join("/") === candidate,
      );
      label = candidate;
      if (!clashes) break;
    }
    labels[id] = label;
  }
  return labels;
}
