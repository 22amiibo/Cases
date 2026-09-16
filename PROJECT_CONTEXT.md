# Casework Project Context

Last updated: 2026-09-16

## Purpose

Casework is a no-AI case-interview practice website. It teaches consulting
problem-solving through targeted drills, six deterministic interactive cases,
case replay, transparent scoring, and progress-based practice recommendations.

This file is the durable handoff point for future chats. Read it before making
changes, then update the Progress Log and Next Action before ending a work
session.

## Source of Truth

- Implementation plan: `/Users/noahmartz/Downloads/2026-09-15-case-interview-practice-mvp.md`
- Local repository: `/Users/noahmartz/Desktop/Case`
- GitHub repository: `https://github.com/22amiibo/Cases`
- Base branch: `main`
- Active implementation branch: `feature/case-practice-mvp`
- Active worktree: `/Users/noahmartz/Desktop/Case/.worktrees/case-practice-mvp`

The plan references `deep-research-report (4).md`, but that file was not
present when implementation began. The implementation plan itself is treated
as the approved specification unless that report is later supplied.

## Non-Negotiable Product Constraints

- No AI, LLM, embeddings, paid inference, or machine-learning dependency in V1.
- Train five drill skills: structuring, prioritization, quantitative reasoning,
  exhibit interpretation, and synthesis.
- Full-case scoring also covers clarification and recommendation quality.
- Ship exactly six hand-authored cases: two profitability, two market
  entry/growth, one operations/capacity, and one pricing/break-even.
- All content, reveal rules, calculations, and scoring are deterministic and
  validated from the same authoritative case definitions.
- Do not grade users against one exact investigation path.
- Guest users can complete a demo case; accounts unlock durable Supabase-backed
  progress.
- Core domain logic is test-driven. Critical journeys use Playwright.
- Structured inputs replace chatbot-style or arbitrary free-text grading.

## Technical Direction

- Next.js 16 App Router, React 19, TypeScript, and a `src/` layout.
- UI-independent deterministic logic lives under `src/core`.
- Zod validates versioned content under `src/content`.
- Vitest and Testing Library cover domain/component behavior.
- Playwright covers critical browser journeys and accessibility flows.
- Recharts renders declarative charts with accessible text/table alternatives.
- Guest persistence uses browser session storage behind a repository interface.
- Signed-in persistence uses Supabase Auth/Postgres with row-level security.

## Workflow and Quality Gates

- Work on the isolated `feature/case-practice-mvp` branch, not `main`.
- Follow red-green-refactor for product behavior.
- Use the commit messages prescribed by the implementation plan after each task.
- Before release, run:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Progress Log

### Repository preparation — complete

- Initialized the dedicated repository in the Desktop `Case` folder.
- Connected `origin` to `22amiibo/Cases`.
- Added a safe Node/Next/Vercel `.gitignore`.
- Created the isolated worktree and `feature/case-practice-mvp` branch.

### Task 1: Scaffold application and testing harness — complete

- Commit: `a73fe4c chore: scaffold case practice app and test harness`
- Scaffolded Next.js 16.3.5 with TypeScript and the App Router.
- Installed Zod, Recharts, Supabase, Vitest, Testing Library, Playwright, and
  accessibility-test dependencies.
- Added lint, typecheck, unit-test, watch, and Playwright scripts.
- Verified the home-page Playwright test failed before implementing the required
  heading, then passed after implementation.
- Added the initial Casework visual direction and three non-interactive practice
  path cards.
- Latest Task 1 checks: lint passed, typecheck passed, unit harness passed, and
  the Chromium smoke test passed (1 test).

### Task 2: Define the domain schema — complete

- Added the canonical concept bank with stable IDs and aliases.
- Added Zod schemas and exported TypeScript types for cases, drills, events,
  frameworks, exhibits, calculations, and recommendations.
- Added cross-content schema validation for exhibit source facts and enforced a
  non-zero recommendation evidence requirement.
- Verified the schema suite failed before `schema.ts` existed, then passed after
  implementation (4 tests); typecheck also passed.

### Task 3: Content validation and invariants — complete

- Added deterministic formula evaluation and tolerance checking.
- Added validation for duplicate IDs, unknown graph/fact/exhibit references,
  invalid recommendation evidence, unreachable critical nodes, invalid efficient
  paths, and calculation-answer mismatches.
- `assertValidCase` reports all discovered issues together before content loads.
- Verified the validation suite failed before implementation, then passed after
  implementation (7 tests); typecheck also passed.

### Task 4: First profitability case — complete

- Added the validated AlpineFit vertical-slice case.
- Hidden causal path: costs → variable cost → labor → overtime → turnover.
- Included revenue/materials alternatives, two exhibits, an overtime-expense
  calculation, evidence-gated recommendation choices, and two efficient paths.
- Verified the content-loader test failed with no cases, then passed after the
  case was authored; typecheck also passed.

### Task 5: Deterministic case engine — complete

- Added immutable case sessions with events, revealed facts/exhibits, completed
  calculations, and explicit interaction stages.
- Investigation availability and reveal behavior derive only from authored
  prerequisites and references.
- Repeated investigations remain in the event stream for diagnostics without
  duplicating revealed evidence.
- Correct calculations reveal their authored evidence fact.
- Verified the engine suite failed before implementation, then passed after
  implementation (5 tests); typecheck also passed.

### Task 6: Structured framework builder and scorer — complete

- Added weighted concept coverage, required-concept diagnostics, overlap and
  duplicate penalties, and priority scoring.
- Added a searchable canonical concept bank UI with four top-level branches,
  three levels, priority selection, removal, and keyboard-operable move buttons.
- Fixed the shared test harness to explicitly clean up rendered components when
  Vitest globals are disabled.
- Verified the scoring/component suites failed before implementation, then
  passed after implementation. Full suite: 23 tests; lint and typecheck pass.

### Task 7: Five deterministic drill modes — complete

- Added deterministic evaluators for structure, prioritization, quantitative,
  exhibit, and synthesis submissions with explicit feedback codes.
- Authored and schema-validated 50 exercises: 10 per V1 skill.
- Added the drill library and interactive session routes with immediate scoring
  and next-question progression; enabled the home-page skill-practice route.
- Verified the evaluator and content gates, lint, typecheck, and the quantitative
  Playwright journey. The browser test first failed on the absent route and then
  passed after implementation.

### Task 8: Exhibits and calculation tasks — complete

- Wrote the exhibit and calculation component tests first and observed the
  expected missing-module failures.
- Implemented table exhibits plus grouped-bar, stacked-bar, line, and waterfall
  chart modes with units sourced from content.
- Every chart includes a visible data-table alternative; hidden exhibits render
  nothing.
- Implemented calculation input, optional scratch work, tolerance grading, and
  `{ taskId, answer }` submission output.
- Wired the reusable exhibit renderer into exhibit drill sessions.
- Task-specific verification is green: 5 component tests pass; lint and
  typecheck pass.
- Added a browser regression test proving chart SVGs fit within their visible
  phone-width container. It failed at 640px against a 282px container before
  the responsive fix and passed afterward.
- Completed desktop and 320px visual checks. All chart categories, legends,
  authored units, and the visible table alternative render without page-level
  horizontal overflow.
- An independent task review caught that waterfall data was still displayed as
  ordinary zero-baseline bars. Fix commit `ca1c100` now renders first/last
  values as totals and intermediate signed values as cumulative deltas, with a
  dedicated regression test; scoped re-review found no blocking breakage.
- Fresh controller verification on the reviewed commit: 35 unit/component
  tests pass, lint and typecheck exit successfully, and the focused 320px
  Playwright regression passes.

### Task 9: Interactive full-case workspace — paused before implementation

- Prepared the SDD task brief at
  `.superpowers/sdd/2026-09-15-case-interview-practice-mvp/task-9-brief.md`.
- A Task 9 implementer reviewed the brief, deterministic engine, AlpineFit
  content, existing components, and current tests, then was interrupted at the
  user's request before making any edits or commits.
- No Task 9 tests have been run and no Task 9 production files have changed.
- The worktree was clean at commit `543d1d5` when the pause was requested.
- Task 10's brief is also prepared, but Task 10 must not begin until Task 9 is
  implemented, verified, and independently reviewed.

## Decisions and Notes

- `create-next-app` selected current stable Next.js 16.3.5.
- Next.js 16 dynamic route params are promises; dynamic pages must `await params`
  or use React `use` in a client page.
- Vitest 5 requires `@types/node` 22+; the generated Node 20 type dependency was
  upgraded to resolve the peer conflict.
- Playwright commands need elevated execution in this environment because the
  sandbox cannot bind the local Next.js test port.
- The current visual direction is editorial and calm: warm paper, deep green,
  restrained orange, serif display typography, and high-information layouts.

## Next Action

Resume Task 9 from its first TDD step:

1. Read the prepared Task 9 brief and this context file.
2. Add the required full-case browser journey to `e2e/case-flow.spec.ts`.
3. Run that focused Playwright test and confirm it fails for the expected
   missing-workspace behavior before writing production code.
4. Implement the workspace, session recovery, and four required UI regions by
   reusing the deterministic engine, framework builder, exhibit renderer, and
   calculation task.
5. Run Task 9 verification and its independent review loop, update this file,
   then continue to the already prepared Task 10 brief.
