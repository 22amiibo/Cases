# Task State

## Objective

Prepare the Casework V3.0 Profitability learning loop as a local release
candidate while preserving released V1/V2 behavior, immutable historical
content, answer secrecy, deterministic evaluation, and existing user work.

## Current state

V3.0 Tasks 0–12 are implemented on `feature/casework-v3`. The owner replaytest
recorded `proceed` on 2026-09-18 before Tasks 8–12 began. Production migration
and deployment remain separately gated and have not been performed.

Task 12 adds one shared primary navigation with the exact destinations Learn,
Practice, Cases, and Progress. The navigation exposes the current section,
works by keyboard, and reflows without horizontal overflow at 320px, 768px,
and 1440px. `/drills` and its deep links remain available as the Legacy V1/V2
library.

The full browser suite runs each journey at its authored viewport. A separate
representative V3 route matrix checks horizontal overflow at 320px, 768px, and
1440px, while one shared axe pass covers each primary destination, including
the Cases inventory.

No inventory filters were added. V3.0 has four lab groupings with three
activities each and six cases whose case-type and industry combinations are
mostly unique; filtering that inventory would add controls without helping a
learner narrow a meaningful set. Existing activity and case metadata remains
available for a later release with a larger published inventory.

## Completed V3.0 tasks

- Tasks 0–7 established the compatibility baseline, taxonomies, versioned
  activity/course contracts, deterministic engine, additive persistence,
  shared activity shell, four flagship labs with three repetitions each, and
  the owner-approved Practice experience.
- Task 8 added explicit AlpineFit Practice and Interview modes, server-enforced
  policy, delayed Interview feedback, mode-isolated recovery, and immutable
  mode persistence. Main commits: `6fd7c4f`, `f27b71d`, `173814f`, `c14bb40`,
  and `8db3e0b`.
- Task 9 added exact-version chronological case replay, evidence timing,
  learner-facing debrief, historical attempt routes, and safe unavailable-
  version summaries. Commits: `9e66576` and `3d723c7`.
- Task 10 added version-separated V3 skill evidence, deterministic next-
  practice selection, unified history, resumable work, and learner-facing
  Progress. Commits: `713240d` and `0f3509c`.
- Task 11 published the exact nine-step Profitability course with immutable
  course-context evidence, guest continuation, signed-in cross-device
  continuation, and capstone debrief. Commits: `1ccd8dc` and `c108739`.
- Task 12 adds shared navigation and focused release-hardening coverage for
  accessibility, keyboard use, responsive layout, pre-commit network answer
  secrecy, additive migration ordering, and RLS policy contracts.

## Release verification

- Final local command evidence is recorded in `RELEASE_NOTES.md` and
  `PROJECT_CONTEXT.md`.
- Targeted network checks confirm pre-commit V3 activity/case responses do not
  expose selected authored evaluation strings, diagnostic codes, or option
  outcome mappings.
- `npm run check:answer-secrecy` reproducibly scans every built browser chunk
  for three exact server-only authored feedback, criterion, and completed-case
  answer markers and fails on a leak.
- Migration contract tests verify the additive 001→004 order, V1/V2/V3 row
  branches, V3 table ownership policies, and caller identity checks in both V3
  transactional save functions.

## Pre-deployment operational gate

This worktree has no `psql`, PostgreSQL server, Supabase CLI, or Docker runtime,
including their common macOS installation paths. Therefore a real fresh-schema
apply, a representative 001→004 database upgrade, and transaction-scoped RLS
execution could not run locally. Static SQL contract tests and repository
cross-user tests are the maximum executable local evidence; real database
execution remains required before production approval. Do not use hosted
Supabase for that verification without separate owner authorization.

## Important invariants

- Deterministic/no-AI architecture; generated prose is never semantically
  scored.
- Authored answers and correctness metadata remain server-side until the legal
  reveal point.
- V1, V2, and V3 evidence remains semantically separate.
- Historical attempts resolve the exact recorded content version.
- Scratch work remains browser-local.
- `caseMode` remains separate from V2 scaffolding.
- Do not edit, stage, delete, or commit `supabase/.temp/` or
  `src/content/drills/quantitative 2.json`.

## Exact next action

Stop. Obtain separate owner approval before applying migration `004` or
deploying V3.0. Before production apply, execute the fresh database,
representative 001→004 upgrade, and transaction-scoped RLS gate in an isolated
PostgreSQL/Supabase environment and retain rollback evidence. Rollback disables
V3 active content and the V3 navigation while retaining immutable V3 attempts.
