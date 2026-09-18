# Task State

## Objective

Implement the approved Casework V3.0 Profitability learning loop while
preserving released V1/V2 behavior, immutable historical content, answer
secrecy, deterministic evaluation, and existing user work.

## Remaining task set

V3.0 Tasks 8-12 remain gated on the mandatory Task 7 owner playtest.

## V3 planning

`CASEWORK_V3_IMPLEMENTATION_PLAN.md` was approved for V3.0 implementation on
2026-09-18. Production migration and deployment remain separately gated.

## Current task

The Task 7 owner playtest recorded `revise and replaytest`. The requested
learning-quality and UX revisions are implemented and ready for the mandatory
owner replaytest. Task 8 has not started.

## Completed tasks

- V3.0 Task 0 compatibility coverage and full baseline gate are complete and
  committed as `578248d`: 58 test files / 276 tests, 34 Playwright journeys,
  lint, typecheck, production build, and diff check pass.
- V3.0 Task 1 taxonomy and exact case-metadata contracts are committed as
  `f5b3fbf`: 3 focused files / 24 tests, lint, and typecheck pass.
- V3.0 Task 2 contracts are committed as `7e7cd46`: 4 focused files / 20
  tests, lint, and typecheck pass.
- V3.0 Task 3 is committed as `095c8fc`: 2 focused files / 16 tests, 64 files /
  310 tests in the full unit suite, lint, and typecheck pass.
- V3.0 Task 4 is committed as `f0e0a83`: 4 focused data files / 36 tests, 65
  files / 318 tests in the full unit suite, lint, and typecheck pass.
- V3.0 Task 5 is committed as `126ea91`: 7 focused files / 28 tests, 70
  files / 330 tests in the full unit suite, one Playwright journey, lint,
  typecheck, and production build pass.
- V3.0 Task 6 is committed as `2b81cd7`: 5 focused files / 35 tests, 71
  files / 343 tests in the full unit suite, four phone-width axe-scanned
  Playwright journeys, lint, typecheck, and production build pass.
- V3.0 Task 7 implementation is complete: active and exact-version routes,
  course-context validation, recent attempts, saved-attempt review, retired
  history behavior, and preserved `/drills` compatibility are covered. The
  full gate passes 75 test files / 352 tests, 40 Playwright journeys, lint,
  typecheck, production build, and `git diff --check`.
- The Task 7 revision pass expands every flagship lab to three varied
  repetitions, strengthens Exhibit decisions and stable per-attempt ordering,
  replaces unsupported inputs with structured feedback, adds resumable exit
  and learner-centered completion review, rewrites Progress coaching, derives
  lightweight achievements, and uses the static typography stack site-wide.
  Validation passes 77 test files / 359 tests and 46 Playwright journeys,
  plus lint, typecheck, production build, and `git diff --check`.
- Tasks 1–11 are committed on `feature/case-practice-mvp`.
- The post-Task-11 owner gate records `proceed` in `PRODUCT_DECISION_LEDGER.md`.
- Task 12 committed as `666fa19` (`content: complete v2 diagnostic drill pilot`).
- Task 13 committed as `3caf4d9` (`content: upgrade paypilot for v2 intermediate practice`).
- Task 14 committed as `6cec8a8` (`content: add goldenloaf v2 transfer case`).
- Task 15 committed as `9422518` (`feat: embed exact v2 practice in learn modules`).
- Task 16 committed as `feat: add diagnostic v2 progress coaching`.
- Task 17 adds owned exact-version historical replay, safe unavailable-version
  summaries, Progress replay links, release documentation, and release gates.
- Task 17 initial implementation committed as `a5390a7` (`chore: harden and
  document casework v2 pilot`).
- Final release fix adds a red-green component regression and extends the full
  AlpineFit browser journey through wrong-unit feedback and same-session retry.

## Remaining work

- Owner replaytests Clarifying, Exhibit Analysis, Brainstorming, and Hypothesis
  and records `proceed`, `revise and replaytest`, or `stop`.
- Tasks 8-12 remain gated on a recorded `proceed` decision.

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
- Review fix round 1 focused repository/route regressions pass, and both the
  successful ordered exact-V2 replay and unknown-version stop browser journeys
  pass.
- Review fix round 1 full local gate: 54 test files / 264 tests passed; lint,
  typecheck, production build, and `git diff --check` passed; all 34 Playwright
  journeys passed.
- The migration SQL contract tests passed. The controller confirmed a linked
  dry-run containing migrations `002` and `003`, confirmed checksummed schema
  and data backups, applied both migrations, and confirmed that the remote list
  aligns from `001` through `003`.
- The transaction-scoped production RLS smoke passed: owner reads succeeded,
  cross-user reads returned no rows, and the transaction rolled back. The
  recoverable backup remains retained, and the temporary credential file was
  removed. No credentials or user identifiers are recorded here.
- Final wrong-unit release fix: the regression failed with the action stuck as
  disabled “Saving,” then passed after the success-state reset. Focused checks
  passed 9 files / 52 tests and the complete AlpineFit browser journey. The
  full local gate passed 57 files / 272 tests, all 34 Playwright journeys,
  lint, typecheck, production build, and `git diff --check`.
- A directly related replay regression now proves repeated calculation attempts
  render without duplicate React keys.
- The production release exposed the V2 API shape. The live AlpineFit
  journey then passed wrong-unit grading, visible corrective feedback,
  immediately enabled retry, and successful correction without refresh.

## Known deferred issues

- Live signed-in replay and rollback rehearsal remain optional operational
  follow-ups; they are not blockers for the completed V2 release.

## Blockers

- None currently known.

## Exact next action

Run the mandatory owner replaytest from `/practice` and record `proceed`,
`revise and replaytest`, or `stop` in `PRODUCT_DECISION_LEDGER.md`. Do not begin
Task 8 without `proceed`.
