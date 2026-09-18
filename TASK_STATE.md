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

Task 13 — upgrade PayPilot as the intermediate strategy case. Begin by reading the current V1/V2 case contracts and adding failing PayPilot V2 content/flow tests.

## Completed tasks

- Tasks 1–11 are committed on `feature/case-practice-mvp`.
- The post-Task-11 owner gate records `proceed` in `PRODUCT_DECISION_LEDGER.md`.
- Task 12 implementation is complete and freshly verified; its clean commit is the next repository action.

## Remaining work

- Implement, verify, document, and commit Tasks 13–16 sequentially.
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

## Known deferred issues

- Completed-case replay/retry entry point remains missing; the owner explicitly allowed Task 12 despite this.
- Live deployment/migration work is outside Tasks 12–16.

## Blockers

- None currently known.

## Exact next action

Commit only intended Task 12 files as `content: complete v2 diagnostic drill pilot`, then inspect the PayPilot V1 definition, AlpineFit V2 implementation, versioned registries, and shared case-flow tests before writing Task 13 RED tests.
