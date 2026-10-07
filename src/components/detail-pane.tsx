import { useMemo, type ReactNode } from "react";

import type { FoldResult } from "@/graph/fold";
import { languageKind } from "@/graph/file-kinds";
import { fileNeighbours, folderKinds, repoSummary } from "@/graph/pane";
import type { GraphSelection } from "@/graph/selection";
import type { ParseResult } from "@/parser/types";

export type PaneTab = "structure" | "explanation";

const hotBackground = "color-mix(in srgb, var(--accent) 14%, transparent)";

function pathHot(id: string, hover: GraphSelection, fileToNode: Record<string, string>): boolean {
  if (hover === null) return false;
  if (hover.kind === "file") return hover.id === id;
  return fileToNode[id] === hover.id;
}

function CountLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="tabular-nums text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function PathButton({
  id,
  hot,
  trailing,
  onNavigate,
  onHover,
}: {
  id: string;
  hot: boolean;
  trailing?: ReactNode;
  onNavigate: (id: string) => void;
  onHover: (hover: GraphSelection) => void;
}) {
  return (
    <button
      type="button"
      title={id}
      onClick={() => onNavigate(id)}
      onMouseEnter={() => onHover({ kind: "file", id })}
      onMouseLeave={() => onHover(null)}
      className="flex w-full min-w-0 cursor-pointer items-center gap-2 px-1 py-px text-left font-mono text-[11px]"
      style={{ background: hot ? hotBackground : "transparent" }}
    >
      <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">{id}</span>
      {trailing}
    </button>
  );
}

function PathList({
  label,
  ids,
  hover,
  fileToNode,
  onNavigate,
  onHover,
}: {
  label: string;
  ids: string[];
  hover: GraphSelection;
  fileToNode: Record<string, string>;
  onNavigate: (id: string) => void;
  onHover: (hover: GraphSelection) => void;
}) {
  return (
    <section className="mt-3">
      <p className="px-1 font-mono text-[10px] text-[var(--muted)]">
        {label} <span className="tabular-nums">{ids.length}</span>
      </p>
      <ul className="mt-0.5">
        {ids.map((id) => (
          <li key={id}>
            <PathButton
              id={id}
              hot={pathHot(id, hover, fileToNode)}
              onNavigate={onNavigate}
              onHover={onHover}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DetailPane({
  result,
  folded,
  selection,
  hover,
  tab,
  onTab,
  onNavigate,
  onHover,
}: {
  result: ParseResult;
  folded: FoldResult;
  selection: GraphSelection;
  hover: GraphSelection;
  tab: PaneTab;
  onTab: (tab: PaneTab) => void;
  onNavigate: (id: string) => void;
  onHover: (hover: GraphSelection) => void;
}) {
  const summary = useMemo(() => repoSummary(result), [result]);
  const fileToNode = folded.fileToNode;

  return (
    <div className="min-w-0">
      {selection === null ? (
        <div className="px-3 py-2.5">
          <p className="truncate font-mono text-[11px] text-[var(--foreground)]" title={summary.name}>
            {summary.name}
          </p>
          <div className="mt-2 space-y-0.5">
            <CountLine label="framework" value={summary.framework} />
            <CountLine label="files" value={summary.fileCount} />
            <CountLine label="imports" value={summary.importCount} />
            <CountLine label="routes" value={summary.routes} />
          </div>
          <section className="mt-3">
            <p className="px-1 font-mono text-[10px] text-[var(--muted)]">Most depended on</p>
            <ul className="mt-0.5">
              {summary.topDepended.map((file) => (
                <li key={file.id}>
                  <PathButton
                    id={file.id}
                    hot={pathHot(file.id, hover, fileToNode)}
                    trailing={
                      <span className="shrink-0 tabular-nums text-[var(--muted)]">{file.importers}</span>
                    }
                    onNavigate={onNavigate}
                    onHover={onHover}
                  />
                </li>
              ))}
            </ul>
          </section>
          <PathList
            label="Nothing imports"
            ids={summary.zeroImporters}
            hover={hover}
            fileToNode={fileToNode}
            onNavigate={onNavigate}
            onHover={onHover}
          />
          <div className="mt-3">
            <CountLine label="unidentified" value={summary.unidentified} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex border-b border-[var(--border)]">
            {(["structure", "explanation"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onTab(key)}
                className="cursor-pointer px-3 py-1.5 font-mono text-[11px]"
                style={{
                  color: tab === key ? "var(--foreground)" : "var(--muted)",
                  boxShadow: tab === key ? "inset 0 -1px 0 var(--accent)" : undefined,
                }}
              >
                {key === "structure" ? "Structure" : "Explanation"}
              </button>
            ))}
          </div>
          {tab === "explanation" ? (
            <p className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
              Nothing has explained this yet.
            </p>
          ) : selection.kind === "file" ? (
            <FileStructure
              result={result}
              fileId={selection.id}
              hover={hover}
              fileToNode={fileToNode}
              onNavigate={onNavigate}
              onHover={onHover}
            />
          ) : (
            <FolderStructure result={result} folded={folded} folderId={selection.id} />
          )}
        </>
      )}
    </div>
  );
}

function FileStructure({
  result,
  fileId,
  hover,
  fileToNode,
  onNavigate,
  onHover,
}: {
  result: ParseResult;
  fileId: string;
  hover: GraphSelection;
  fileToNode: Record<string, string>;
  onNavigate: (id: string) => void;
  onHover: (hover: GraphSelection) => void;
}) {
  const file = useMemo(() => result.files.find((item) => item.id === fileId), [result, fileId]);
  const neighbours = useMemo(() => fileNeighbours(fileId, result.edges), [fileId, result]);
  const kind = file ? languageKind(file.language) : null;
  return (
    <div className="px-3 py-2.5">
      <PathButton
        id={fileId}
        hot={pathHot(fileId, hover, fileToNode)}
        onNavigate={onNavigate}
        onHover={onHover}
      />
      {kind ? (
        <div className="mt-1.5 flex items-center gap-1.5 px-1 font-mono text-[11px]">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ background: kind.color }} aria-hidden />
          <span className="text-[var(--foreground)]">{kind.label}</span>
        </div>
      ) : null}
      {file ? (
        <p className="mt-1 px-1 font-mono text-[11px] tabular-nums text-[var(--muted)]">{file.lines} lines</p>
      ) : null}
      <NeighbourBlock
        heading={`Imports ${neighbours.imports.length}`}
        ids={neighbours.imports}
        hover={hover}
        fileToNode={fileToNode}
        onNavigate={onNavigate}
        onHover={onHover}
      />
      <NeighbourBlock
        heading={`Imported by ${neighbours.importers.length}`}
        ids={neighbours.importers}
        hover={hover}
        fileToNode={fileToNode}
        onNavigate={onNavigate}
        onHover={onHover}
      />
    </div>
  );
}

function NeighbourBlock({
  heading,
  ids,
  hover,
  fileToNode,
  onNavigate,
  onHover,
}: {
  heading: string;
  ids: string[];
  hover: GraphSelection;
  fileToNode: Record<string, string>;
  onNavigate: (id: string) => void;
  onHover: (hover: GraphSelection) => void;
}) {
  return (
    <section className="mt-3">
      <p className="px-1 font-mono text-[11px] text-[var(--foreground)]">{heading}</p>
      <ul className="mt-0.5">
        {ids.map((id) => (
          <li key={id}>
            <PathButton
              id={id}
              hot={pathHot(id, hover, fileToNode)}
              onNavigate={onNavigate}
              onHover={onHover}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FolderStructure({
  result,
  folded,
  folderId,
}: {
  result: ParseResult;
  folded: FoldResult;
  folderId: string;
}) {
  const kinds = useMemo(() => {
    const node = folded.nodes.find((item) => item.id === folderId);
    return node ? folderKinds(result.files, node.files) : [];
  }, [folded, folderId, result]);
  return (
    <div className="px-3 py-2.5">
      <p className="truncate px-1 font-mono text-[11px] text-[var(--foreground)]" title={folderId}>
        {folderId}
      </p>
      <ul className="mt-2 space-y-1">
        {kinds.map(({ kind, count }) => (
          <li key={kind.key} className="flex items-center gap-1.5 px-1 font-mono text-[11px]">
            <span className="size-2 shrink-0 rounded-[2px]" style={{ background: kind.color }} aria-hidden />
            <span className="truncate text-[var(--foreground)]">{kind.label}</span>
            <span className="ml-auto shrink-0 tabular-nums text-[var(--muted)]">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
