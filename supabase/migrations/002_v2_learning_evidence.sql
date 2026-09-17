alter table public.drill_attempts
  add column if not exists content_version integer,
  add column if not exists event_schema_version integer,
  add column if not exists scoring_version text,
  add column if not exists scaffolding_level text,
  add column if not exists learning_evidence jsonb,
  add column if not exists diagnostics jsonb;

alter table public.case_attempts
  add column if not exists content_version integer,
  add column if not exists event_schema_version integer,
  add column if not exists scoring_version text,
  add column if not exists scaffolding_level text,
  add column if not exists learning_evidence jsonb,
  add column if not exists diagnostics jsonb;

alter table public.drill_attempts
  drop constraint if exists drill_attempts_skill_id_check,
  add constraint drill_attempts_skill_id_check check (
    skill_id in (
      'clarification', 'structure', 'prioritization', 'quantitative',
      'exhibit', 'synthesis'
    )
  ),
  add constraint drill_attempts_v2_metadata_check check (
    (
      (scoring_version is null or scoring_version = 'v1')
      and content_version is null
      and event_schema_version is null
      and scaffolding_level is null
      and learning_evidence is null
      and (diagnostics is null or diagnostics = '[]'::jsonb)
    ) or (
      scoring_version = 'v2'
      and content_version > 0
      and event_schema_version > 0
      and scaffolding_level in ('beginner', 'intermediate', 'interview')
      and jsonb_typeof(learning_evidence) = 'object'
      and jsonb_typeof(diagnostics) = 'array'
    )
  );

alter table public.case_attempts
  add constraint case_attempts_v2_metadata_check check (
    (
      (scoring_version is null or scoring_version = 'v1')
      and content_version is null
      and event_schema_version is null
      and scaffolding_level is null
      and learning_evidence is null
      and (diagnostics is null or diagnostics = '[]'::jsonb)
    ) or (
      scoring_version = 'v2'
      and content_version > 0
      and event_schema_version > 0
      and scaffolding_level in ('beginner', 'intermediate', 'interview')
      and jsonb_typeof(learning_evidence) = 'object'
      and jsonb_typeof(diagnostics) = 'array'
    )
  );

create or replace function public.is_valid_skill_scores(scores jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(scores) is distinct from 'object' then
    return false;
  end if;

  return not exists (
    select 1
    from (
      select key as skill_key,
        jsonb_typeof(value) as value_type,
        case when jsonb_typeof(value) = 'number'
          then (value #>> '{}')::numeric else null end as score_value
      from jsonb_each(scores)
    ) as entries
    where skill_key not in (
      'clarification', 'structure', 'prioritization', 'quantitative',
      'exhibit', 'synthesis'
    ) or value_type <> 'number' or score_value < 0 or score_value > 100
  );
end;
$$;

create or replace function public.save_case_attempt_v2(
  p_attempt_id uuid,
  p_user_id uuid,
  p_case_id text,
  p_skill_scores jsonb,
  p_feedback_codes text[],
  p_events jsonb,
  p_completed_at timestamptz,
  p_content_version integer,
  p_event_schema_version integer,
  p_scoring_version text,
  p_scaffolding_level text,
  p_learning_evidence jsonb,
  p_diagnostics jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Cannot save practice history for another user';
  end if;
  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'Case events must be a JSON array';
  end if;

  insert into public.case_attempts (
    id, user_id, case_id, skill_scores, feedback_codes, completed_at,
    content_version, event_schema_version, scoring_version,
    scaffolding_level, learning_evidence, diagnostics
  ) values (
    p_attempt_id, p_user_id, p_case_id, p_skill_scores, p_feedback_codes,
    p_completed_at, p_content_version, p_event_schema_version,
    p_scoring_version, p_scaffolding_level, p_learning_evidence, p_diagnostics
  ) on conflict (id) do nothing;

  insert into public.case_events (case_attempt_id, user_id, sequence, event)
  select p_attempt_id, p_user_id, event_position - 1, event_payload
  from jsonb_array_elements(p_events) with ordinality
    as serialized_events(event_payload, event_position)
  on conflict (case_attempt_id, sequence) do nothing;

  return p_attempt_id;
end;
$$;

revoke all on function public.save_case_attempt_v2(
  uuid, uuid, text, jsonb, text[], jsonb, timestamptz, integer, integer,
  text, text, jsonb, jsonb
) from public;
grant execute on function public.save_case_attempt_v2(
  uuid, uuid, text, jsonb, text[], jsonb, timestamptz, integer, integer,
  text, text, jsonb, jsonb
) to authenticated;

create or replace function public.get_case_events(
  p_attempt_id uuid
)
returns table(sequence integer, event jsonb)
language sql
stable
set search_path = ''
as $$
  select case_events.sequence, case_events.event
  from public.case_events
  where case_attempt_id = p_attempt_id
    and user_id = auth.uid()
  order by sequence asc;
$$;

revoke all on function public.get_case_events(uuid) from public;
grant execute on function public.get_case_events(uuid) to authenticated;

-- Rollback: point application writes back to save_case_attempt. The nullable
-- V2 columns and V2 rows may remain; no legacy row is rewritten or deleted.
