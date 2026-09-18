# Task State

## Objective

Complete Casework V2 implementation-plan Tasks 12–16 in order, preserving V1/V2 separation, immutable historical content, answer secrecy, deterministic evaluation, and existing user work.

## Remaining task set

1. Task 12 — Author the remaining twelve V2 pilot drills.
2. Task 13 — Upgrade PayPilot as the intermediate strategy case.
3. Task 14 — Upgrade GoldenLoaf as the lower-scaffolding transfer case.
4. Task 15 — Bind concise lessons to exact embedded V2 reps.
5. Task 16 — Turn V2 Progress into diagnostic coaching.

## Current task

Task 16 — turn V2 Progress into diagnostic coaching. Inspect current progress aggregation, recommendation, repository selectors, and UI tests before adding mixed-source/version RED tests.

## Completed tasks

- Tasks 1–11 are committed on `feature/case-practice-mvp`.
- The post-Task-11 owner gate records `proceed` in `PRODUCT_DECISION_LEDGER.md`.
- Task 12 committed as `666fa19` (`content: complete v2 diagnostic drill pilot`).
- Task 13 committed as `3caf4d9` (`content: upgrade paypilot for v2 intermediate practice`).
- Task 14 committed as `6cec8a8` (`content: add goldenloaf v2 transfer case`).
- Task 15 implementation and its full verification gate are complete; commit is pending.

## Remaining work

- Commit Task 15, then implement, verify, document, and commit Task 16.
- Run final verification for the assigned Tasks 12–16 and audit their acceptance criteria.

## Important decisions and invariants

- Deterministic/no-AI architecture; generated prose is never semantically scored.
- Generate → Commit → Self-check → Compare → Diagnose → Retry; no authored answers or correctness metadata before commitment.
- V1 content/history remains immutable and separate from V2 progress.
- Historical attempts resolve their recorded content version.
- Scratchpad content remains browser-local and is never persisted.
- Reuse the shared V2 learning-cycle, case, and repository contracts; add no speculative abstractions or dependencies.
- The completed-case replay/retry entry-point issue is deferred and outside Task 12 scope.
- Do not stage or edit pre-existing `supabase/.temp/` or `src/content/drills/quantitative 2.json`.

## Verification already performed

- Task 12 fresh gate: 48 test files / 233 tests passed; lint, typecheck, production build, and `git diff --check` passed; all 25 Playwright journeys passed.
- Task 13 fresh gate: 50 test files / 240 tests passed; lint passed without warnings; typecheck, production build, and `git diff --check` passed; all 26 Playwright journeys passed.
- Task 14 fresh gate: 52 test files / 246 tests passed; lint, typecheck, production build, and `git diff --check` passed; all 27 Playwright journeys passed.
- Task 15 fresh gate: 52 test files / 246 tests passed; lint, typecheck, production build, and `git diff --check` passed; all 29 Playwright journeys passed, including exact Learn routing, answer secrecy, save retry, axe, and phone reflow checks.

## Known deferred issues

- Completed-case replay/retry entry point remains missing; the owner explicitly allowed Task 12 despite this.
- Live deployment/migration work is outside Tasks 12–16.

## Blockers

- None currently known.

## Exact next action

Commit the intended Task 15 files as `feat: embed exact v2 practice in learn modules`, then inspect V2 Progress and add Task 16 mixed-source/version RED tests.
