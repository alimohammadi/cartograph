import { auth } from "@clerk/nextjs/server";

export default async function WorkspacePage() {
  const { orgId, orgSlug, orgRole } = await auth();

  return (
    <main className="flex flex-1 flex-col gap-1 p-3">
      <h1 className="text-xs font-medium text-[var(--foreground)]">Workspace</h1>
      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
        <dt className="text-[var(--muted)]">organization</dt>
        <dd className="text-[var(--foreground)]">{orgSlug ?? "—"}</dd>
        <dt className="text-[var(--muted)]">org id</dt>
        <dd className="text-[var(--foreground)]">{orgId ?? "—"}</dd>
        <dt className="text-[var(--muted)]">role</dt>
        <dd className="text-[var(--foreground)]">{orgRole ?? "—"}</dd>
      </dl>
    </main>
  );
}
