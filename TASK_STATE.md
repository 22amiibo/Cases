# Task State

## Objective

Complete Casework V2 implementation-plan Task 17 locally, preserving V1/V2
separation, immutable historical content, answer secrecy, deterministic
evaluation, and existing user work.

## Remaining task set

1. Obtain explicit owner approval for the production migration and deployment.
2. Record live sign-in/RLS, save, historical replay, rollback, and answer-
   secrecy smoke results after deployment.

## Current task

Task 17 is implemented, locally verified, and ready for the required commit.
Production migration and deployment remain outside this implementation run.

## Completed tasks

- Tasks 1–11 are committed on `feature/case-practice-mvp`.
- The post-Task-11 owner gate records `proceed` in `PRODUCT_DECISION_LEDGER.md`.
- Task 12 committed as `666fa19` (`content: complete v2 diagnostic drill pilot`).
- Task 13 committed as `3caf4d9` (`content: upgrade paypilot for v2 intermediate practice`).
- Task 14 committed as `6cec8a8` (`content: add goldenloaf v2 transfer case`).
- Task 15 committed as `9422518` (`feat: embed exact v2 practice in learn modules`).
- Task 16 committed as `feat: add diagnostic v2 progress coaching`.
- Task 17 adds owned exact-version historical replay, safe unavailable-version
  summaries, Progress replay links, release documentation, and release gates.

## Remaining work

- No assigned local implementation remains.
- Live migration, deployment, and production smoke checks require owner approval.

## Important decisions and invariants

- Deterministic/no-AI architecture; generated prose is never semantically scored.
- Generate → Commit → Self-check → Compare → Diagnose → Retry; no authored answers or correctness metadata before commitment.
- V1 content/history remains immutable and separate from V2 progress.
- Historical attempts resolve their recorded content version.
- Scratchpad content remains browser-local and is never persisted.
- Reuse the shared V2 learning-cycle, case, and repository contracts; add no speculative abstractions or dependencies.
- Completed cases expose explicit replay and fresh-practice entry points.
- Exhausting every authored investigation is a valid path to synthesis; it must not require a nonexistent next investigation.
- Do not stage or edit pre-existing `supabase/.temp/` or `src/content/drills/quantitative 2.json`.

## Verification already performed

- Task 12 fresh gate: 48 test files / 233 tests passed; lint, typecheck, production build, and `git diff --check` passed; all 25 Playwright journeys passed.
- Task 13 fresh gate: 50 test files / 240 tests passed; lint passed without warnings; typecheck, production build, and `git diff --check` passed; all 26 Playwright journeys passed.
- Task 14 fresh gate: 52 test files / 246 tests passed; lint, typecheck, production build, and `git diff --check` passed; all 27 Playwright journeys passed.
- Task 15 fresh gate: 52 test files / 246 tests passed; lint, typecheck, production build, and `git diff --check` passed; all 29 Playwright journeys passed, including exact Learn routing, answer secrecy, save retry, axe, and phone reflow checks.
- Task 16 focused gate: 17 Progress core tests and 2 recommendation component tests passed; lint and typecheck passed; all 4 Progress Playwright journeys passed for guest/signed-in and empty/sparse/dense history behavior.
- Task 16 fresh full gate: 53 test files / 253 tests passed; lint, typecheck, production build, and `git diff --check` passed; all 31 Playwright journeys passed.
- Post-plan case-flow remediation: 53 test files / 256 tests passed; lint, typecheck, production build, and `git diff --check` passed; all 32 Playwright journeys passed, including exhausted NorthStar synthesis plus completed-case replay and fresh restart.
- Task 17 full local gate: 54 test files / 262 tests passed; lint, typecheck,
  production build, and `git diff --check` passed; all 33 Playwright journeys
  passed, including signed-in unknown-version safety, axe, and 320px reflow.
- The migration SQL contract tests passed. This machine has no Supabase CLI,
  PostgreSQL client, or Docker runtime, so an executable local migration reset
  was not available and remains a release-environment check.

## Known deferred issues

- Live deployment/migration work requires explicit owner approval.
- Executable database migration smoke remains pending in an environment with
  Supabase CLI and a local database runtime.

## Blockers

- None currently known.

## Exact next action

Review the Task 17 report and commit, then obtain owner approval before any live
migration or deployment. Preserve the two pre-existing untracked user items.
