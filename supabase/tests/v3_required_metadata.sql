-- Run only against an isolated database with migrations 001-004 applied:
-- psql "$ISOLATED_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/v3_required_metadata.sql
-- All fixture rows and role changes are rolled back.
begin;
insert into auth.users(id) values ('f3000000-0000-4000-8000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub = 'f3000000-0000-4000-8000-000000000001';

insert into public.case_attempts(
  id, user_id, case_id, skill_scores, completed_at, scoring_version,
  content_version, event_schema_version, scaffolding_level,
  diagnostics, skill_evidence, case_mode
) values
  ('f3000000-0000-4000-8000-000000000011', auth.uid(), 'legacy', '{}', now(),
   null, null, null, null, null, null, null),
  ('f3000000-0000-4000-8000-000000000012', auth.uid(), 'alpinefit-profitability', '{}', now(),
   'v2', 2, 2, 'beginner', '[]', null, null),
  ('f3000000-0000-4000-8000-000000000013', auth.uid(), 'alpinefit-profitability', '{}', now(),
   'v3', 2, 2, null, '[]', '[]', 'practice');

do $$
declare field text;
begin
  foreach field in array array[
    'case_mode', 'content_version', 'event_schema_version', 'diagnostics', 'skill_evidence'
  ] loop
    begin
      execute format('update public.case_attempts set %I = null where id = %L',
        field, 'f3000000-0000-4000-8000-000000000013');
      raise exception 'V3 required metadata accepted NULL: %', field;
    exception when check_violation then
      raise notice 'PASS: V3 % rejects NULL', field;
    end;
  end loop;
  if (select count(*) from public.case_attempts where user_id=auth.uid()) <> 3 then
    raise exception 'Valid V1/V2/V3 rows were not preserved';
  end if;
end $$;
rollback;
