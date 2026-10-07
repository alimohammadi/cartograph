import { auth, clerkClient } from "@clerk/nextjs/server";

import { listAnalyses, type AnalysisState } from "@/lib/analyses";
import { formatRelativeTime } from "@/lib/time";

async function organizationName(): Promise<string> {
  const { orgId, orgSlug } = await auth();
  if (!orgId) return "no organization";
  try {
    const org = await (
      await clerkClient()
    ).organizations.getOrganization({ organizationId: orgId });
    return org.name;
  } catch {
    return orgSlug ?? orgId;
  }
}

function shortSha(sha: string | null): string {
  if (!sha) return "—";
  return sha.slice(0, 7);
}

function StateMark({ state }: { state: AnalysisState }) {
  // Greyscale only — colour is reserved for graph direction/kind later.
  const fill =
    state === "complete"
      ? "bg-[var(--foreground)]"
      : state === "failed"
        ? "bg-[var(--foreground)] opacity-40"
        : state === "parsing"
          ? "bg-[var(--muted)]"
          : "bg-transparent";

  return (
    <span
      className={`inline-block size-1.5 shrink-0 rounded-full border border-[var(--foreground)] ${fill}`}
      aria-hidden
    />
  );
}

export default async function WorkspacePage() {
  const [analyses, orgName] = await Promise.all([
    listAnalyses(),
    organizationName(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-[13px] font-medium tracking-tight text-[var(--foreground)]">
            {orgName}
          </h1>
          <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
            analyses
          </span>
        </div>
        <p className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted)]">
          {analyses.length}
        </p>
      </div>

      {analyses.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center px-4 py-16">
          <p className="text-[13px] text-[var(--foreground)]">
            No analyses for this organization.
          </p>
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-[var(--muted)]">
            When a repository is mapped, it shows up here with its state and
            commit.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] text-[var(--muted)]">
                <th className="px-4 py-2 font-normal">Repository</th>
                <th className="w-[8.5rem] px-3 py-2 font-normal">State</th>
                <th className="w-[6rem] px-3 py-2 font-normal">Commit</th>
                <th className="w-[5.5rem] px-3 py-2 font-normal">Started</th>
                <th className="w-[5.5rem] px-4 py-2 font-normal">Finished</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((analysis) => (
                <tr
                  key={analysis.id}
                  className="border-b border-[var(--border)] align-top last:border-b-0 hover:bg-[var(--surface)]"
                >
                  <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--foreground)]">
                    {analysis.repository}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[12px] text-[var(--foreground)]">
                      <StateMark state={analysis.state} />
                      <span className="font-mono">{analysis.state}</span>
                    </div>
                    {analysis.state === "failed" && analysis.error ? (
                      <p className="mt-1 max-w-[18rem] pl-3.5 text-[11px] leading-snug text-[var(--muted)]">
                        {analysis.error}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-[var(--muted)]">
                    {shortSha(analysis.commit_sha)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-[var(--muted)]">
                    {formatRelativeTime(analysis.started_at)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] tabular-nums text-[var(--muted)]">
                    {analysis.finished_at
                      ? formatRelativeTime(analysis.finished_at)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
