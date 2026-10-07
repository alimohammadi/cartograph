-- Seed: JS Mastery Demo (Clerk org org_3KDdBLZa8urs9Z06x50vPmqMhPK).
-- Additive — the two orgs already seeded stay untouched.

insert into public.projects (id, organization_id, name, github_url) values
  (
    '33333333-3333-3333-3333-333333333331',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    'TypeScript',
    'https://github.com/microsoft/TypeScript'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    'vite',
    'https://github.com/vitejs/vite'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    'express',
    'https://github.com/expressjs/express'
  ),
  (
    '33333333-3333-3333-3333-333333333334',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    'jest',
    'https://github.com/jestjs/jest'
  );

insert into public.analyses (
  id, organization_id, project_id, state, commit_sha, started_at, finished_at, error
) values
  (
    'abababab-abab-abab-abab-ababababab01',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    '33333333-3333-3333-3333-333333333331',
    'queued',
    null,
    now() - interval '4 minutes',
    null,
    null
  ),
  (
    'abababab-abab-abab-abab-ababababab02',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    '33333333-3333-3333-3333-333333333332',
    'parsing',
    '7b3e0d1',
    now() - interval '40 minutes',
    null,
    null
  ),
  (
    'abababab-abab-abab-abab-ababababab03',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    '33333333-3333-3333-3333-333333333333',
    'failed',
    'c50fa82',
    now() - interval '9 hours',
    now() - interval '9 hours',
    'Repository archive download timed out'
  ),
  (
    'abababab-abab-abab-abab-ababababab04',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    '33333333-3333-3333-3333-333333333334',
    'complete',
    '1d84c3f',
    now() - interval '2 days',
    now() - interval '2 days',
    null
  ),
  (
    'abababab-abab-abab-abab-ababababab05',
    'org_3KDdBLZa8urs9Z06x50vPmqMhPK',
    '33333333-3333-3333-3333-333333333331',
    'complete',
    'e29b417',
    now() - interval '4 days',
    now() - interval '4 days',
    null
  );