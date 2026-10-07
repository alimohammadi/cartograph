import { MapView } from "@/components/map-view";
import { sampleParse } from "@/data/fixture";
import { languageCategories } from "@/graph/file-kinds";

/**
 * Preview of the real interface over the checked-in parse. The rail stays
 * inert. The map and the detail pane share one client parent.
 */
export default function PreviewPage() {
  const categories = languageCategories(sampleParse.files);

  return (
    <MapView
      result={sampleParse}
      rail={
        <div className="px-3 py-2.5">
          <p className="truncate font-mono text-[11px] text-[var(--foreground)]">
            {sampleParse.rootName}
          </p>
          <p className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--muted)]">
            {sampleParse.files.length} files · {sampleParse.edges.length} edges
          </p>
          <ul className="mt-2 space-y-1">
            {categories.map(({ kind, count }) => (
              <li key={kind.key} className="flex items-center gap-1.5 font-mono text-[11px]">
                <span
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ background: kind.color }}
                  aria-hidden
                />
                <span className="truncate text-[var(--foreground)]">{kind.label}</span>
                <span className="ml-auto shrink-0 tabular-nums text-[var(--muted)]">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  );
}
