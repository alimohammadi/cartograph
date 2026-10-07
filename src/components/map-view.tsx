"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import { DetailPane, type PaneTab } from "@/components/detail-pane";
import { MapCanvas } from "@/components/map-canvas";
import { MapShell } from "@/components/map-shell";
import { foldFiles } from "@/graph/fold";
import type { GraphSelection } from "@/graph/selection";
import type { ParseResult } from "@/parser/types";

/**
 * Owns the interaction the map and the pane share. The page stays a server
 * component and hands in the parse result plus the rail.
 */
export function MapView({ result, rail }: { result: ParseResult; rail: ReactNode }) {
  const captureZoom = useRef<() => void>(() => {});
  const onZoomCap = useCallback((capture: () => void) => {
    captureZoom.current = capture;
  }, []);

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [selection, setSelection] = useState<GraphSelection>(null);
  const [hover, setHover] = useState<GraphSelection>(null);
  const [tab, setTab] = useState<PaneTab>("structure");

  const folded = useMemo(() => foldFiles(result.files, result.edges), [result]);

  const openFolder = useCallback((id: string): void => {
    captureZoom.current();
    setOpenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setSelection({ kind: "folder", id });
  }, []);

  const closeFolder = useCallback((id: string): void => {
    setOpenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const navigateToFile = useCallback(
    (id: string): void => {
      const folder = folded.fileToNode[id];
      if (folder !== undefined && !openIds.has(folder)) {
        captureZoom.current();
        setOpenIds((prev) => {
          if (prev.has(folder)) return prev;
          const next = new Set(prev);
          next.add(folder);
          return next;
        });
      }
      setSelection({ kind: "file", id });
    },
    [folded, openIds],
  );

  const selectFile = useCallback((id: string) => setSelection({ kind: "file", id }), []);
  const selectFolder = useCallback((id: string) => setSelection({ kind: "folder", id }), []);
  const clearSelection = useCallback(() => setSelection(null), []);

  return (
    <MapShell
      rail={rail}
      map={
        <MapCanvas
          files={result.files}
          edges={result.edges}
          selection={selection}
          hover={hover}
          openIds={openIds}
          onOpenFolder={openFolder}
          onCloseFolder={closeFolder}
          onSelectFile={selectFile}
          onSelectFolder={selectFolder}
          onClearSelection={clearSelection}
          onHover={setHover}
          onZoomCap={onZoomCap}
        />
      }
      detail={
        <DetailPane
          result={result}
          folded={folded}
          selection={selection}
          hover={hover}
          tab={tab}
          onTab={setTab}
          onNavigate={navigateToFile}
          onHover={setHover}
        />
      }
    />
  );
}
