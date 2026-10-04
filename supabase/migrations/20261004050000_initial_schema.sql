-- Clerk org ids live as text; there is no organizations table to cascade from.
-- Child rows cascade off projects → analyses. RLS scopes every table by JWT org.

create or replace function public.requesting_org_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif((select auth.jwt()) ->> 'org_id', ''),
    (select auth.jwt()) -> 'o' ->> 'id'
  );
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  name text not null,
  github_url text not null,
  created_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  state text not null,
  created_at timestamptz not null default now(),
  constraint analyses_state_check
    check (state in ('pending', 'running', 'complete', 'failed'))
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

create table public.edges (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  from_file_id uuid not null references public.files (id) on delete cascade,
  to_file_id uuid not null references public.files (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  file_id uuid references public.files (id) on delete cascade,
  method text not null,
  path text not null,
  created_at timestamptz not null default now()
);

create table public.explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.file_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  question text not null,
  answer text,
  created_at timestamptz not null default now()
);

create index projects_organization_id_idx on public.projects (organization_id);
create index analyses_organization_id_idx on public.analyses (organization_id);
create index analyses_project_id_idx on public.analyses (project_id);
create index files_organization_id_idx on public.files (organization_id);
create index files_analysis_id_idx on public.files (analysis_id);
create index edges_organization_id_idx on public.edges (organization_id);
create index edges_analysis_id_idx on public.edges (analysis_id);
create index edges_from_file_id_idx on public.edges (from_file_id);
create index edges_to_file_id_idx on public.edges (to_file_id);
create index routes_organization_id_idx on public.routes (organization_id);
create index routes_analysis_id_idx on public.routes (analysis_id);
create index routes_file_id_idx on public.routes (file_id);
create index explanations_organization_id_idx on public.explanations (organization_id);
create index explanations_analysis_id_idx on public.explanations (analysis_id);
create index explanations_file_id_idx on public.explanations (file_id);
create index file_roles_organization_id_idx on public.file_roles (organization_id);
create index file_roles_analysis_id_idx on public.file_roles (analysis_id);
create index file_roles_file_id_idx on public.file_roles (file_id);
create index insights_organization_id_idx on public.insights (organization_id);
create index insights_analysis_id_idx on public.insights (analysis_id);

alter table public.projects enable row level security;
alter table public.analyses enable row level security;
alter table public.files enable row level security;
alter table public.edges enable row level security;
alter table public.routes enable row level security;
alter table public.explanations enable row level security;
alter table public.file_roles enable row level security;
alter table public.insights enable row level security;

create policy projects_select_own_org
  on public.projects for select to authenticated
  using (organization_id = (select public.requesting_org_id()));

create policy analyses_select_own_org
  on public.analyses for select to authenticated
  using (organization_id = (select public.requesting_org_id()));

create policy files_select_own_org
  on public.files for select to authenticated
  using (organization_id = (select public.requesting_org_id()));

create policy edges_select_own_org
  on public.edges for select to authenticated
  using (organization_id = (select public.requesting_org_id()));

create policy routes_select_own_org
  on public.routes for select to authenticated
  using (organization_id = (select public.requesting_org_id()));

create policy explanations_select_own_org
  on public.explanations for select to authenticated
  using (organization_id = (select public.requesting_org_id()));

create policy file_roles_select_own_org
  on public.file_roles for select to authenticated
  using (organization_id = (select public.requesting_org_id()));

create policy insights_select_own_org
  on public.insights for select to authenticated
  using (organization_id = (select public.requesting_org_id()));

grant select on public.projects to authenticated;
grant select on public.analyses to authenticated;
grant select on public.files to authenticated;
grant select on public.edges to authenticated;
grant select on public.routes to authenticated;
grant select on public.explanations to authenticated;
grant select on public.file_roles to authenticated;
grant select on public.insights to authenticated;

-- Seed: Ali's Organization + Cartograph B (created for the phase 2 check).
insert into public.projects (id, organization_id, name, github_url) values
  (
    '11111111-1111-1111-1111-111111111111',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    'demo-app',
    'https://github.com/example/demo-app'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'org_3KDRASoidHoS4V2EzrLI3qL7kRT',
    'other-repo',
    'https://github.com/example/other-repo'
  );

insert into public.analyses (id, organization_id, project_id, state) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    '11111111-1111-1111-1111-111111111111',
    'complete'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    '11111111-1111-1111-1111-111111111111',
    'running'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'org_3KDRASoidHoS4V2EzrLI3qL7kRT',
    '22222222-2222-2222-2222-222222222222',
    'pending'
  );
