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

Task 15 — bind concise lessons to exact embedded V2 reps. Inspect the current lesson registry and Learn page, then add failing route/content-integrity tests before changing production code.

## Completed tasks

- Tasks 1–11 are committed on `feature/case-practice-mvp`.
- The post-Task-11 owner gate records `proceed` in `PRODUCT_DECISION_LEDGER.md`.
- Task 12 committed as `666fa19` (`content: complete v2 diagnostic drill pilot`).
- Task 13 committed as `3caf4d9` (`content: upgrade paypilot for v2 intermediate practice`).
- Task 14 implementation and full verification are complete; its clean commit is the next repository action.

## Remaining work

- Verify and commit Task 14, then implement, verify, document, and commit Tasks 15–16 sequentially.
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

## Known deferred issues

- Completed-case replay/retry entry point remains missing; the owner explicitly allowed Task 12 despite this.
- Live deployment/migration work is outside Tasks 12–16.

## Blockers

- None currently known.

## Exact next action

Run the full Task 14 unit/static/build/browser gate, commit the intended Task 14 files as `content: add goldenloaf v2 transfer case`, then inspect the lesson registry and Learn page for Task 15.
