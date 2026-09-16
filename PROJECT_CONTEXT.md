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

### Task 9: Interactive full-case workspace — complete

- Prepared the SDD task brief at
  `.superpowers/sdd/2026-09-15-case-interview-practice-mvp/task-9-brief.md`.
- Added the case library and AlpineFit workspace with prompt/objective,
  structured framework and investigation controls, evidence/exhibits, and a
  session-backed scratchpad.
- Added the complete guest browser journey through clarification, framework,
  investigation, exhibit reveal, calculation, synthesis, and recommendation.
- Guest event history, clarification draft state, and scratchpad recover after
  refresh. Event timestamps remain monotonic across refresh boundaries.
- Full case definitions remain server-only. A deterministic session endpoint
  replays events with the case engine and returns only currently available
  actions, revealed evidence, and stage-appropriate choices. Hidden causal
  flags, future responses, scoring metadata, and calculation answers are not
  sent to the browser.
- Independent review found and verified fixes for hidden data exposure,
  timestamp resets, the missing home-page route, incomplete recovery coverage,
  clarification checkbox behavior, and stale API response races.
- Fresh verification: 36 unit/component tests pass; lint and typecheck pass;
  all 4 Playwright journeys pass.

### Task 10: Full-case scoring — complete

- Commits: `3fcb9eb feat: score case reasoning from user events` and
  `00d7670 fix: score case events chronologically`.
- Added deterministic scoring for clarification, structure, prioritization,
  quantitative reasoning, exhibit interpretation, synthesis, and
  recommendation quality.
- Scores derive from authored case rubrics and recorded events rather than one
  required investigation sequence. Authored alternate paths receive credit.
- Recommendation and synthesis evidence only receive credit when discovered
  before submission. Calculation evidence and credit require prerequisites
  investigated before the calculation event.
- Investigation efficiency remains separate diagnostic output: critical nodes
  found/missed, low-value investigations, and repeated investigations.
- Independent review found a temporal ordering defect where later discoveries
  could retroactively support earlier submissions. Fix round 1 added a
  regression test and chronological evidence snapshots; scoped re-review found
  all findings addressed with no new breakage.
- Fresh controller verification: 42 unit/component tests pass; lint, typecheck,
  and `git diff --check` pass.

### Task 11: Structured recommendation and case replay — review fixes pending

- Implementation commit: `0731be1 feat: add recommendation builder and case
  replay`; pushed to both `origin/feature/case-practice-mvp` and
  `origin/main`.
- Added the structured recommendation builder, completed-session review route,
  replay graph, score breakdown, deterministic feedback, example efficient
  path, and browser journey through review.
- Implementer verification reported 43 unit/component tests and 2 focused
  case-flow Playwright tests passing; lint, typecheck, and diff check passed.
- Independent review found one Critical issue: a shape-valid early
  `recommendation_submitted` event can forge completion and expose
  critical-derived replay states and the efficient path. Server-side event
  validation must enforce legal stages, authored choices, and discovered
  evidence before returning review data.
- Important review findings: tie cross-exhibit feedback to one valid synthesis
  event; show pending/error/retry state for recommendation submission; add
  focused projection/API safety and positive scoring/replay tests.
- Minor findings: derive evidence-count copy from authored minimum, handle
  sessionStorage exceptions, distinguish network errors from incomplete cases,
  and rename the expanded browser test.
- Task 11 is not complete until a fix round, scoped re-review, and fresh
  controller verification pass.

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

Resume Task 11 fix round 1. Add failing regression tests for forged early
completion and temporal/cross-exhibit feedback, then enforce semantic event
validation server-side. Add recommendation pending/error handling and focused
review projection tests. Address the recorded minor findings, append evidence
to the Task 11 report, commit, run scoped re-review and fresh verification,
then update this file before Task 12.
