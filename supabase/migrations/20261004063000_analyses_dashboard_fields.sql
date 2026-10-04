-- Columns the analyses list needs: commit, timing, failure reason, and states from the UI.

alter table public.analyses
  drop constraint analyses_state_check;

update public.analyses set state = 'queued' where state = 'pending';
update public.analyses set state = 'parsing' where state = 'running';

alter table public.analyses
  add column commit_sha text,
  add column started_at timestamptz not null default now(),
  add column finished_at timestamptz,
  add column error text;

update public.analyses set started_at = created_at;

alter table public.analyses
  add constraint analyses_state_check
    check (state in ('queued', 'parsing', 'complete', 'failed'));

-- Reseed to match the list UI (two orgs for the org-switch check).
delete from public.analyses;
delete from public.projects;

insert into public.projects (id, organization_id, name, github_url) values
  (
    '11111111-1111-1111-1111-111111111111',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    'tailwindcss',
    'https://github.com/tailwindlabs/tailwindcss'
  ),
  (
    '11111111-1111-1111-1111-111111111112',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    'next.js',
    'https://github.com/vercel/next.js'
  ),
  (
    '11111111-1111-1111-1111-111111111113',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    'react',
    'https://github.com/facebook/react'
  ),
  (
    '11111111-1111-1111-1111-111111111114',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    'supabase',
    'https://github.com/supabase/supabase'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'org_3KDRASoidHoS4V2EzrLI3qL7kRT',
    'other-repo',
    'https://github.com/example/other-repo'
  );

insert into public.analyses (
  id, organization_id, project_id, state, commit_sha, started_at, finished_at, error
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    '11111111-1111-1111-1111-111111111111',
    'queued',
    null,
    now() - interval '2 minutes',
    null,
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    '11111111-1111-1111-1111-111111111112',
    'parsing',
    'a93be01',
    now() - interval '18 minutes',
    null,
    null
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    '11111111-1111-1111-1111-111111111113',
    'failed',
    'f2c81d4',
    now() - interval '5 hours',
    now() - interval '5 hours',
    'Repository archive download timed out'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    '11111111-1111-1111-1111-111111111114',
    'complete',
    '9e1c0ab',
    now() - interval '1 day',
    now() - interval '1 day',
    null
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'org_3KC1O3g0PG6YH9QuuI8xneceLYp',
    '11111111-1111-1111-1111-111111111112',
    'complete',
    'c4d82fe',
    now() - interval '3 days',
    now() - interval '3 days',
    null
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'org_3KDRASoidHoS4V2EzrLI3qL7kRT',
    '22222222-2222-2222-2222-222222222222',
    'complete',
    'b7a910c',
    now() - interval '6 hours',
    now() - interval '6 hours',
    null
  );
