create table public.activity_attempts (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id text not null,
  content_version integer not null check (content_version > 0),
  event_schema_version integer not null check (event_schema_version = 3),
  scoring_version text not null check (scoring_version = 'v3'),
  primary_skill_id text not null,
  skill_evidence jsonb not null check (jsonb_typeof(skill_evidence) = 'array'),
  diagnostics jsonb not null check (jsonb_typeof(diagnostics) = 'array'),
  course_id text,
  course_version integer,
  course_step_id text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (num_nonnulls(course_id, course_version, course_step_id) in (0, 3)),
  check (course_version is null or course_version > 0),
  check (completed_at >= started_at)
);

create table public.activity_events (
  id bigint generated always as identity primary key,
  activity_attempt_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  event_id text not null,
  event jsonb not null,
  created_at timestamptz not null default now(),
  unique (activity_attempt_id, sequence),
  unique (activity_attempt_id, event_id),
  foreign key (activity_attempt_id, user_id)
    references public.activity_attempts(id, user_id) on delete cascade
);

create table public.course_enrollments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  course_version integer not null check (course_version > 0),
  started_at timestamptz not null,
  last_activity_at timestamptz not null,
  last_step_id text not null,
  primary key (user_id, course_id, course_version)
);

create table public.course_step_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  course_version integer not null check (course_version > 0),
  course_step_id text not null,
  event_type text not null check (event_type = 'lesson_viewed'),
  lesson_id text not null,
  lesson_version integer not null check (lesson_version > 0),
  occurred_at timestamptz not null,
  unique (user_id, course_id, course_version, course_step_id, event_type),
  foreign key (user_id, course_id, course_version)
    references public.course_enrollments(user_id, course_id, course_version)
    on delete cascade
);

alter table public.case_attempts
  add column if not exists case_mode text,
  add column if not exists course_id text,
  add column if not exists course_version integer,
  add column if not exists course_step_id text,
  add column if not exists skill_evidence jsonb;

alter table public.case_attempts
  drop constraint if exists case_attempts_v2_metadata_check,
  add constraint case_attempts_course_context_check check (
    num_nonnulls(course_id, course_version, course_step_id) in (0, 3)
    and (course_version is null or course_version > 0)
  ),
  add constraint case_attempts_version_metadata_check check (
    (
      (scoring_version is null or scoring_version = 'v1')
      and content_version is null and event_schema_version is null
      and scaffolding_level is null and learning_evidence is null
      and (diagnostics is null or diagnostics = '[]'::jsonb)
      and case_mode is null and course_id is null and skill_evidence is null
    ) or (
      scoring_version = 'v2'
      and content_version > 0 and event_schema_version > 0
      and scaffolding_level in ('beginner', 'intermediate', 'interview')
      and (learning_evidence is null or jsonb_typeof(learning_evidence) = 'object')
      and jsonb_typeof(diagnostics) = 'array'
      and case_mode is null and course_id is null and skill_evidence is null
    ) or (
      scoring_version = 'v3'
      and content_version > 0 and event_schema_version = 2
      and (scaffolding_level is null or scaffolding_level in ('beginner', 'intermediate', 'interview'))
      and learning_evidence is null
      and jsonb_typeof(diagnostics) = 'array'
      and jsonb_typeof(skill_evidence) = 'array'
      and case_mode in ('practice', 'interview')
    )
  );

create index activity_attempts_user_completed_idx
  on public.activity_attempts (user_id, completed_at desc);
create index activity_events_attempt_sequence_idx
  on public.activity_events (activity_attempt_id, sequence);
create index case_attempts_user_mode_completed_idx
  on public.case_attempts (user_id, case_mode, completed_at desc);
create index course_step_events_user_course_idx
  on public.course_step_events (user_id, course_id, course_version, occurred_at);

alter table public.activity_attempts enable row level security;
alter table public.activity_events enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_step_events enable row level security;

create policy "activity attempts are owned by the signed-in user"
  on public.activity_attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity events are owned by the signed-in user"
  on public.activity_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "course enrollments are owned by the signed-in user"
  on public.course_enrollments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "course step events are owned by the signed-in user"
  on public.course_step_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.save_activity_attempt_v3(
  p_attempt_id uuid, p_user_id uuid, p_activity_id text,
  p_content_version integer, p_event_schema_version integer,
  p_primary_skill_id text, p_skill_evidence jsonb, p_diagnostics jsonb,
  p_course_id text, p_course_version integer, p_course_step_id text,
  p_started_at timestamptz, p_completed_at timestamptz, p_events jsonb
)
returns uuid language plpgsql set search_path = '' as $$
declare
  inserted_count integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Cannot save learning history for another user';
  end if;
  if jsonb_typeof(p_events) is distinct from 'array'
    or jsonb_typeof(p_skill_evidence) is distinct from 'array'
    or jsonb_typeof(p_diagnostics) is distinct from 'array' then
    raise exception 'V3 evidence and events must be JSON arrays';
  end if;

  insert into public.activity_attempts (
    id, user_id, activity_id, content_version, event_schema_version,
    scoring_version, primary_skill_id, skill_evidence, diagnostics,
    course_id, course_version, course_step_id, started_at, completed_at
  ) values (
    p_attempt_id, p_user_id, p_activity_id, p_content_version,
    p_event_schema_version, 'v3', p_primary_skill_id, p_skill_evidence,
    p_diagnostics, p_course_id, p_course_version, p_course_step_id,
    p_started_at, p_completed_at
  ) on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;

  if not exists (
    select 1 from public.activity_attempts where id = p_attempt_id
      and user_id = p_user_id and activity_id = p_activity_id
      and content_version = p_content_version
      and event_schema_version = p_event_schema_version
      and scoring_version = 'v3' and primary_skill_id = p_primary_skill_id
      and skill_evidence = p_skill_evidence and diagnostics = p_diagnostics
      and course_id is not distinct from p_course_id
      and course_version is not distinct from p_course_version
      and course_step_id is not distinct from p_course_step_id
      and started_at = p_started_at and completed_at = p_completed_at
  ) then raise exception 'Conflicting activity attempt retry'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_events) with ordinality incoming(event, position)
    join public.activity_events saved
      on saved.activity_attempt_id = p_attempt_id
      and (saved.sequence = incoming.position - 1
        or saved.event_id = incoming.event ->> 'eventId')
    where saved.sequence <> incoming.position - 1
      or saved.event_id <> incoming.event ->> 'eventId'
      or saved.event <> incoming.event
  ) then raise exception 'Conflicting activity event retry'; end if;
  if inserted_count = 0 and (select count(*) from public.activity_events
      where activity_attempt_id = p_attempt_id)
    <> jsonb_array_length(p_events) then
    raise exception 'Conflicting activity event retry';
  end if;

  insert into public.activity_events (
    activity_attempt_id, user_id, sequence, event_id, event
  ) select p_attempt_id, p_user_id, position - 1, event ->> 'eventId', event
    from jsonb_array_elements(p_events) with ordinality incoming(event, position)
  on conflict (activity_attempt_id, sequence) do nothing;
  return p_attempt_id;
end;
$$;

create or replace function public.save_case_attempt_v3(
  p_attempt_id uuid, p_user_id uuid, p_case_id text, p_skill_scores jsonb,
  p_feedback_codes text[], p_events jsonb, p_completed_at timestamptz,
  p_content_version integer, p_event_schema_version integer,
  p_scaffolding_level text, p_case_mode text, p_skill_evidence jsonb,
  p_diagnostics jsonb, p_course_id text, p_course_version integer,
  p_course_step_id text
)
returns uuid language plpgsql set search_path = '' as $$
declare
  inserted_count integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Cannot save learning history for another user';
  end if;
  if jsonb_typeof(p_events) is distinct from 'array'
    or jsonb_typeof(p_skill_evidence) is distinct from 'array'
    or jsonb_typeof(p_diagnostics) is distinct from 'array' then
    raise exception 'V3 evidence and events must be JSON arrays';
  end if;

  insert into public.case_attempts (
    id, user_id, case_id, skill_scores, feedback_codes, completed_at,
    content_version, event_schema_version, scoring_version, scaffolding_level,
    learning_evidence, diagnostics, case_mode, skill_evidence,
    course_id, course_version, course_step_id
  ) values (
    p_attempt_id, p_user_id, p_case_id, p_skill_scores, p_feedback_codes,
    p_completed_at, p_content_version, p_event_schema_version, 'v3',
    p_scaffolding_level, null, p_diagnostics, p_case_mode, p_skill_evidence,
    p_course_id, p_course_version, p_course_step_id
  ) on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;

  if not exists (
    select 1 from public.case_attempts where id = p_attempt_id
      and user_id = p_user_id and case_id = p_case_id
      and skill_scores = p_skill_scores and feedback_codes = p_feedback_codes
      and completed_at = p_completed_at and content_version = p_content_version
      and event_schema_version = p_event_schema_version and scoring_version = 'v3'
      and scaffolding_level is not distinct from p_scaffolding_level
      and diagnostics = p_diagnostics and case_mode = p_case_mode
      and skill_evidence = p_skill_evidence
      and course_id is not distinct from p_course_id
      and course_version is not distinct from p_course_version
      and course_step_id is not distinct from p_course_step_id
  ) then raise exception 'Conflicting case attempt retry'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_events) with ordinality incoming(event, position)
    join public.case_events saved on saved.case_attempt_id = p_attempt_id
      and saved.sequence = incoming.position - 1
    where saved.event <> incoming.event
  ) then raise exception 'Conflicting case event retry'; end if;
  if inserted_count = 0 and (select count(*) from public.case_events
      where case_attempt_id = p_attempt_id)
    <> jsonb_array_length(p_events) then
    raise exception 'Conflicting case event retry';
  end if;

  insert into public.case_events (case_attempt_id, user_id, sequence, event)
    select p_attempt_id, p_user_id, position - 1, event
    from jsonb_array_elements(p_events) with ordinality incoming(event, position)
  on conflict (case_attempt_id, sequence) do nothing;
  return p_attempt_id;
end;
$$;

revoke all on function public.save_activity_attempt_v3(
  uuid, uuid, text, integer, integer, text, jsonb, jsonb, text, integer,
  text, timestamptz, timestamptz, jsonb
) from public;
grant execute on function public.save_activity_attempt_v3(
  uuid, uuid, text, integer, integer, text, jsonb, jsonb, text, integer,
  text, timestamptz, timestamptz, jsonb
) to authenticated;
revoke all on function public.save_case_attempt_v3(
  uuid, uuid, text, jsonb, text[], jsonb, timestamptz, integer, integer,
  text, text, jsonb, jsonb, text, integer, text
) from public;
grant execute on function public.save_case_attempt_v3(
  uuid, uuid, text, jsonb, text[], jsonb, timestamptz, integer, integer,
  text, text, jsonb, jsonb, text, integer, text
) to authenticated;

-- Rollback: route application writes back to V2 functions and hide V3 content.
-- Retain immutable V3 tables and nullable columns so completed history survives.
