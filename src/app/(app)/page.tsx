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

function stateClass(state: AnalysisState): string {
  if (state === "queued" || state === "parsing") return "text-[var(--muted)]";
  return "text-[var(--foreground)]";
}

export default async function WorkspacePage() {
  const [analyses, orgName] = await Promise.all([
    listAnalyses(),
    organizationName(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-3 p-4">
      <header className="flex items-baseline gap-2">
        <h1 className="text-sm font-medium text-[var(--foreground)]">
          {orgName}
        </h1>
        <p className="text-[11px] text-[var(--muted)]">
          {analyses.length === 0
            ? "No analyses yet"
            : `${analyses.length} analysis${analyses.length === 1 ? "" : "es"}`}
        </p>
      </header>

      {analyses.length === 0 ? (
        <p className="text-[11px] text-[var(--muted)]">
          This organization hasn&apos;t run an analysis.
        </p>
      ) : (
        <table className="w-full max-w-4xl border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-[11px] text-[var(--muted)]">
              <th className="py-2 pr-6 font-normal">Repository</th>
              <th className="py-2 pr-6 font-normal">State</th>
              <th className="py-2 pr-6 font-normal">Commit</th>
              <th className="py-2 pr-6 font-normal">Started</th>
              <th className="py-2 font-normal">Finished</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((analysis) => (
              <tr
                key={analysis.id}
                className="border-b border-[var(--border)] align-top"
              >
                <td className="py-3 pr-6 font-mono text-[var(--foreground)]">
                  {analysis.repository}
                </td>
                <td className={`py-3 pr-6 ${stateClass(analysis.state)}`}>
                  <div>{analysis.state}</div>
                  {analysis.state === "failed" && analysis.error ? (
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {analysis.error}
                    </div>
                  ) : null}
                </td>
                <td className="py-3 pr-6 font-mono text-[var(--muted)]">
                  {analysis.commit_sha ?? "—"}
                </td>
                <td className="py-3 pr-6 text-[var(--muted)]">
                  {formatRelativeTime(analysis.started_at)}
                </td>
                <td className="py-3 text-[var(--muted)]">
                  {analysis.finished_at
                    ? formatRelativeTime(analysis.finished_at)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
