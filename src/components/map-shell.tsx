/**
 * The settled three-column shell. Rail on the left, map in the middle,
 * detail pane on the right. Later phases fill the slots; they never move
 * them. The right pane is a real column here, not a modal or overlay.
 */
export function MapShell({
  rail,
  map,
  detail,
}: {
  rail: React.ReactNode;
  map: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-row">
      <aside className="w-44 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)]">
        {rail}
      </aside>
      <section className="relative min-w-0 flex-1">{map}</section>
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)]">
        {detail}
      </aside>
    </div>
  );
}
