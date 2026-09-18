# Task State

## Objective

Implement the approved Casework V3.0 Profitability learning loop while
preserving released V1/V2 behavior, immutable historical content, answer
secrecy, deterministic evaluation, and existing user work.

## Remaining task set

V3.0 Tasks 1-12 remain. Task 7 is a mandatory owner playtest gate.

## V3 planning

`CASEWORK_V3_IMPLEMENTATION_PLAN.md` was approved for V3.0 implementation on
2026-09-18. Production migration and deployment remain separately gated.

## Current task

Task 0 freezes the released compatibility baseline before V3 contracts are
added. The isolated `feature/casework-v3` worktree starts from `10f3fcb`.

## Completed tasks

- V3.0 Task 0 compatibility coverage and full baseline gate are complete and
  ready to commit: 58 test files / 276 tests, 34 Playwright journeys, lint,
  typecheck, production build, and diff check pass.
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

- No assigned release work remains.

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

Commit Task 0, then begin Task 1 with failing V3 taxonomy and exact case-metadata
tests. Do not apply migration `004` or deploy without separate owner approval.
