-- Full cases store many generated-response records in their ordered event
-- stream. Keep the singular learning_evidence column optional for V2 case
-- attempts so a hypothesis diagnostic is not mislabeled as a scored skill.
alter table public.case_attempts
  drop constraint if exists case_attempts_v2_metadata_check,
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
      and (
        learning_evidence is null
        or jsonb_typeof(learning_evidence) = 'object'
      )
      and jsonb_typeof(diagnostics) = 'array'
    )
  );

-- Rollback: restore the case_attempts_v2_metadata_check definition from
-- 002_v2_learning_evidence.sql after confirming no V2 case row relies only on
-- its ordered case_events evidence.
