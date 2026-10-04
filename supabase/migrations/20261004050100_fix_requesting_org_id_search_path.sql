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
