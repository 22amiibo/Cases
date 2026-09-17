create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.drill_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  drill_id text not null,
  skill_id text not null check (
    skill_id in ('structure', 'prioritization', 'quantitative', 'exhibit', 'synthesis')
  ),
  score numeric not null check (score >= 0 and score <= 100),
  feedback_codes text[] not null default '{}',
  concept_ids_practiced text[] not null default '{}',
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.case_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id text not null,
  skill_scores jsonb not null,
  feedback_codes text[] not null default '{}',
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.case_events (
  id bigint generated always as identity primary key,
  case_attempt_id uuid not null references public.case_attempts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  event jsonb not null,
  created_at timestamptz not null default now(),
  unique (case_attempt_id, sequence)
);

create index drill_attempts_user_skill_completed_idx
  on public.drill_attempts (user_id, skill_id, completed_at desc);
create index case_attempts_user_completed_idx
  on public.case_attempts (user_id, completed_at desc);
create index case_events_attempt_sequence_idx
  on public.case_events (case_attempt_id, sequence);

alter table public.profiles enable row level security;
alter table public.drill_attempts enable row level security;
alter table public.case_attempts enable row level security;
alter table public.case_events enable row level security;

create policy "profiles are owned by the signed-in user"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "drill attempts are owned by the signed-in user"
  on public.drill_attempts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "case attempts are owned by the signed-in user"
  on public.case_attempts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "case events are owned by the signed-in user"
  on public.case_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.save_case_attempt(
  p_user_id uuid,
  p_case_id text,
  p_skill_scores jsonb,
  p_feedback_codes text[],
  p_events jsonb,
  p_completed_at timestamptz
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_attempt_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Cannot save practice history for another user';
  end if;

  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'Case events must be a JSON array';
  end if;

  insert into public.case_attempts (
    user_id,
    case_id,
    skill_scores,
    feedback_codes,
    completed_at
  ) values (
    p_user_id,
    p_case_id,
    p_skill_scores,
    p_feedback_codes,
    p_completed_at
  )
  returning id into saved_attempt_id;

  insert into public.case_events (case_attempt_id, user_id, sequence, event)
  select
    saved_attempt_id,
    p_user_id,
    event_position - 1,
    event_payload
  from jsonb_array_elements(p_events) with ordinality
    as serialized_events(event_payload, event_position);

  return saved_attempt_id;
end;
$$;

revoke all on function public.save_case_attempt(
  uuid, text, jsonb, text[], jsonb, timestamptz
) from public;
grant execute on function public.save_case_attempt(
  uuid, text, jsonb, text[], jsonb, timestamptz
) to authenticated;
