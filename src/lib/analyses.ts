import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AnalysisState = "queued" | "parsing" | "complete" | "failed";

export type AnalysisListItem = {
  id: string;
  state: AnalysisState;
  commit_sha: string | null;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  repository: string;
};

type ProjectEmbed = {
  name: string;
  github_url: string;
};

type AnalysisRow = {
  id: string;
  state: AnalysisState;
  commit_sha: string | null;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  project: ProjectEmbed | ProjectEmbed[] | null;
};

function asProject(project: AnalysisRow["project"]): ProjectEmbed | null {
  if (!project) return null;
  return Array.isArray(project) ? (project[0] ?? null) : project;
}

function repositoryLabel(project: ProjectEmbed | null): string {
  if (!project) return "—";
  try {
    const url = new URL(project.github_url);
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (owner && repo) return `${owner}/${repo}`;
  } catch {
    // fall through to name
  }
  return project.name;
}

/** Org scoping comes from RLS — do not filter by organization_id here. */
export async function listAnalyses(): Promise<AnalysisListItem[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "id, state, commit_sha, started_at, finished_at, error, project:projects(name, github_url)",
    )
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to list analyses: ${error.message}`);
  }

  return ((data ?? []) as AnalysisRow[]).map((row) => {
    const project = asProject(row.project);
    return {
      id: row.id,
      state: row.state,
      commit_sha: row.commit_sha,
      started_at: row.started_at,
      finished_at: row.finished_at,
      error: row.error,
      repository: repositoryLabel(project),
    };
  });
}
