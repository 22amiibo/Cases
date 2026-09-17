# Casework Project Context

Last updated: 2026-09-17

## Purpose

Casework is a no-AI case-interview practice website. It teaches consulting
problem-solving through targeted drills, six deterministic interactive cases,
case replay, transparent scoring, and progress-based practice recommendations.

This file is the durable handoff point for future chats. Read it before making
changes, then update the Progress Log and Next Action before ending a work
session.

## Source of Truth

- Implementation plan: `/Users/noahmartz/Downloads/2026-09-15-case-interview-practice-mvp.md`
- Product upgrade decision ledger: `PRODUCT_DECISION_LEDGER.md`
- Approved V2 implementation plan: `CASEWORK_V2_IMPLEMENTATION_PLAN.md`
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

### Active V2 checkpoint — 2026-09-17

- V2 Tasks 1–7 are complete through scoreable exhibit interpretation.
- Do not stage or commit `supabase/.temp/`; it predates the V2 work and contains
  local Supabase link metadata.
- Continue with Task 8, the clarification skill and first V2 drill rep.
- Continue only through Task 11, then stop at the mandatory owner playtest gate
  before authoring any remaining drills or upgrading another case.

### Casework V2 Task 1: Versioned learning contracts — complete

- Added strict V2 content/event/scoring/scaffolding schemas while preserving
  parseability of legacy V1 learning records.
- Added validated committed-response revision chains, rubric outcomes, and
  diagnostic outcomes plus a centralized stable diagnostic taxonomy.
- Red proof: the six new schema tests failed before the contracts existed.
- Verification: focused schema/diagnostic tests, full unit suite, typecheck, and
  lint pass.
- Decision: `recommendation` remains a full-case score dimension but the V2
  trainable-skill identifier set contains exactly the six approved skills.
- Next action: add immutable versioned content registries without changing any
  validated V1 case projection.

### Casework V2 Task 2: Immutable versioned content registries — complete

- Added immutable registries that resolve cases, drills, and lessons by stable
  ID plus explicit content version, with active-version selection kept separate.
- Historical lookup returns `undefined` for unknown versions and the case API
  returns a safe not-found response instead of replaying current content.
- Locked all six V1 case artifacts to reviewed SHA-256 hashes and retained the
  existing deterministic solve-through coverage.
- Red proof: registry, explicit lookup, and unknown-version route tests failed
  before the versioned loaders existed.
- Verification: content and route tests, full unit suite, typecheck, lint, and
  production build pass.
- Decision: retain the V1 JSON paths as immutable artifacts and add registries
  around them; future V2 definitions are new entries, never in-place edits.
- Next action: add the additive V2 persistence migration and repository contract.

### Casework V2 Task 3: Versioned learning evidence persistence — complete

- Added the additive `002_v2_learning_evidence.sql` migration with nullable
  legacy-safe metadata, strict complete-V2 constraints, clarification support,
  JSONB evidence/diagnostics, an idempotent V2 save RPC, and an RLS/user-scoped
  ordered event reader. The original V1 save RPC remains available for rollback.
- Memory and Supabase repositories now share V1/V2 metadata behavior, reject
  unknown or internally mixed versions, preserve retry idempotency, and expose
  ordered case-event reads scoped to the owning learner.
- Existing rows with absent metadata normalize to V1 and never gain fabricated
  V2 evidence.
- Red proof: old Supabase mapping assertions failed when the normalized V1
  metadata was first introduced; V2 round-trip, unknown-version, event-order,
  owner-scope, and migration-safety regressions are now green.
- Verification: 124 unit/component tests, typecheck, lint, and diff checks pass.
- Local SQL application is unavailable because this worktree has no PostgreSQL,
  Supabase CLI, or container runtime. The linked/live project was not modified;
  production application still requires owner approval and backup confirmation.
- Rollback: switch writes to the retained V1 RPC; nullable V2 columns and rows
  can remain without changing legacy reads.
- Next action: separate Legacy V1 history from V2 diagnostic progress.

### Casework V2 Task 4: Legacy/V2 progress separation — complete

- Replaced the blended readiness dashboard with independent V2 diagnostic
  evidence and clearly labeled Legacy V1 history sections.
- V2 shows exactly six trainable skills and deterministic `Not started`,
  `Building`, or `Consistent` states from a configurable evidence rule:
  three reviewed attempts, at least one revision or transfer, and no blocking
  diagnostic recurring across all three most recent reviewed attempts.
- V2 evidence distinguishes committed, reviewed, revised, and transferred reps;
  self-assessed diagnostics are explicitly labeled separately from system checks.
- Legacy numeric scores remain visible but cannot affect V2 statuses,
  diagnostics, or next-practice recommendations. “Interview ready” is no longer
  published before full Interview Mode exists.
- Red proof: existing progress callers failed when scoring-version filters became
  required; mixed-history, consistency, recurrence, and recommendation isolation
  regressions now pass.
- Verification: 125 unit/component tests, typecheck, lint, focused mixed-history
  Playwright journeys, keyboard-native links, axe scan, and 320px reflow pass.
- Gate A result: foundation contracts, versioned content, additive persistence,
  and strict progress separation are implemented. Local SQL execution remains the
  only unavailable gate check; no pilot V1 JSON artifact was modified.
- Next action: preserve full V2 framework hierarchy in events and replay.

### Casework V2 Task 5: Full framework hierarchy preservation — complete

- V2 framework events retain the complete ordered branch tree, starting
  priority, committed rationale, and event schema version from submission
  through engine validation, scoring, browser recovery, and case replay.
- V1 flat `conceptIds` events remain accepted only by V1 definitions and replay
  through an explicit adapter that does not invent parent-child relationships.
- V1 and V2 definitions reject the other version's framework event shape.
- The framework builder requires a rationale for V2 and keeps nested branches
  and sibling order intact; replay labels legacy-flat and preserved-hierarchy
  evidence distinctly.
- Verification: 133 unit/component tests, typecheck, lint, production build,
  four legacy case browser journeys, and focused storage-reload/replay coverage
  pass.
- Next action: build the reusable generated-response cycle with answer secrecy,
  linked revisions, deterministic diagnostics, recovery, and accessible focus.

### Casework V2 Task 6: Reusable generated-response cycle — complete

- Added one deterministic state machine for generate, commit, self-check,
  comparison reveal, diagnostics, retry, completion, and pre-commit skip.
- Learner-safe prompt projection excludes rubric criteria, diagnostic rules,
  and authored comparisons; the server-side reveal helper requires a validated
  committed response for the matching interaction and response kind.
- The shared component creates correctly linked revisions, labels diagnostics
  as self-assessed, moves focus to each new phase, and keeps authored comparison
  content hidden until both commitment and self-check are complete.
- Session recovery validates phase/response consistency and restores committed
  revisions and reveal state. In-progress draft text is component-local and is
  never included in the recovery record or commit payload.
- Red proof: the focused suites failed because the cycle and component modules
  did not exist; all seven new state/projection/component regressions now pass.
- Verification: 140 unit/component tests, typecheck, lint, and production build
  pass. The component includes keyboard-native controls, programmatic phase
  focus, and a 320px-safe layout; axe/browser coverage will run against its
  first real V2 consumer in Tasks 8–9 rather than adding a throwaway demo route.
- Next action: integrate this cycle into V2 exhibit interpretation, gate case
  progress on commitment, and preserve the complete evidence in replay.

### Casework V2 Task 7: Scoreable full-case exhibit interpretation — complete

- Added optional authored V2 exhibit-practice definitions and a V2 event that
  retains the committed response chain, latest rubric outcomes, sourced
  diagnostics, structured insight selection, and comparison-view evidence.
- The case session sends only the safe generate-first prompt. A dedicated commit
  endpoint validates the content version, event history, revealed exhibit, and
  matching response before returning criteria, authored comparison, and safe
  insight labels; hidden insight strengths never leave the server.
- Revealed configured exhibits now block synthesis until interpretation is
  committed. V2 exhibit scoring uses the post-commit structured insight, while
  V1 insight events and scoring remain unchanged.
- The evidence panel runs the shared cycle, supports refresh recovery between
  commitment and structured selection, and submits complete evidence. Case
  replay retains every interpretation revision and selected insight.
- Red proof: the engine regression first demonstrated synthesis could advance
  without V2 exhibit evidence; the new gate and event make that path fail closed.
- Verification: 147 unit/component tests, typecheck, lint, production build,
  commit-endpoint answer-secrecy tests, component journey coverage, and four V1
  browser case journeys pass. The live V2 browser journey will use AlpineFit V2
  in Task 11; no throwaway pilot content was added before that task.
- Next action: add clarification as the sixth trainable skill through one real
  V2 generated-response rep, with relevance rules and diagnostic evidence.

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

### Task 11: Structured recommendation and case replay — complete

- Implementation commit: `0731be1 feat: add recommendation builder and case
  replay`; pushed to both `origin/feature/case-practice-mvp` and
  `origin/main`.
- Added the structured recommendation builder, completed-session review route,
  replay graph, score breakdown, deterministic feedback, example efficient
  path, and browser journey through review.
- Implementer verification reported 43 unit/component tests and 2 focused
  case-flow Playwright tests passing; lint, typecheck, and diff check passed.
- Fix commits: `2a582e9 fix: validate case replay events` and `524a9e2 fix:
  close task 11 review gaps`.
- The server now records only semantically valid events: legal stage, authored
  choices, valid prerequisites, and evidence already discovered by the learner.
  A forged early recommendation cannot complete a session or expose replay data.
- Recommendation submission has pending, failure, and retry states. Review
  storage failures and network failures are handled separately.
- Replay tests cover all four node states, positive recommendation scoring,
  feedback-code conditions, and API projection safety.
- Review round 2 found two additional edge cases: canonical but unscored
  framework concepts were rejected, and cross-exhibit feedback could count an
  undiscovered cited fact. Both received failing regressions and fixes.
- Scoped re-review found both findings resolved with no new regressions.
- Fresh controller verification: 14 test files / 53 tests pass; lint,
  typecheck, and `git diff --check` pass; both case-flow Playwright tests pass.

### Task 12: Persistence, authentication, and progress aggregation — complete

- Added `PracticeRepository` with browser-session and Supabase implementations
  for drill attempts, case attempts, case events, and skill history.
- Guest history survives refresh in `sessionStorage`; signed-in history uses
  Supabase Auth/Postgres when the public environment variables are configured.
- Added passwordless email sign-in without blocking the AlpineFit guest demo.
- Completed drills and cases now persist their deterministic scores, feedback
  codes, and complete case event history.
- Added rolling last-10 skill scores: newest five attempts use weight `1.0`,
  attempts six through ten use `0.6`. The next-practice policy remains a
  diagnostic mix until three skills each have at least three attempts, then
  selects the weakest practiced skill.
- Added the initial Supabase migration for `profiles`, `drill_attempts`,
  `case_attempts`, and `case_events`, including RLS ownership policies, atomic
  case/event persistence, parent-event ownership, and score-shape constraints.
- Persistence uses stable attempt IDs and idempotent writes. Pending drill and
  case payloads survive refresh and clear only after confirmed success, so an
  ambiguous network result can be retried without duplicate progress.
- Independent review found retry/data-loss risks, an auth render loop and
  downgrade path, incomplete event-parent ownership, and weak score validation.
  Fix rounds added regressions and resolved every Critical/Important finding;
  final scoped re-review was clean.
- Final verification: 23 test files / 82 tests pass; lint, typecheck, build, and
  `git diff --check` pass; all 4 Playwright tests pass.
- Verification limitation: this machine has no Supabase CLI, PostgreSQL client,
  or Docker runtime, so the SQL migration/RLS contract is statically tested but
  was not executed against a live local Supabase instance.

### Task 13: Progress dashboard and practice recommendations — complete

- Added the `/progress` dashboard with five trainable-skill cards, plain-language
  readiness states, last-10 trends, attempt counts, and common deterministic
  feedback codes.
- Progress counts unique practice sessions rather than counting each skill row
  from one case as a separate session. Drill and case IDs remain distinct even
  if their raw IDs collide.
- Added the deterministic next-session card to both the dashboard and home page.
  It preserves Task 12's diagnostic threshold and recommends the weakest
  drill-supported skill only after sufficient history.
- Unpracticed skills display `Not assessed`; history failures do not masquerade
  as low scores and provide a retry path. Sign-in/sign-out changes clear and
  reload progress to prevent account history from leaking into guest UI.
- Task 13 browser coverage completes two quantitative drills and AlpineFit,
  verifies three saved sessions on the dashboard, then verifies the matching
  recommendation on the home page.
- Independent review found four Important issues involving auth changes,
  loading failures, unassessed skills, and full-case-only recommendation inputs.
  All were fixed; scoped re-review found no Critical or Important regressions.
- Final verification: 24 test files / 92 tests pass; lint, typecheck, production
  build, and `git diff --check` pass; all 5 Playwright journeys pass.
- The first full Playwright run encountered an orphaned local Next.js process on
  port 3000. After stopping that stale process, a fresh standard run passed all
  five journeys without changing test concurrency.

### Task 14: Remaining five V1 cases — complete

- Added the RED library-depth test, which initially failed with only AlpineFit.
- Authored all five planned definitions: NorthStar profitability, FleetFix
  market entry, PayPilot growth, GoldenLoaf operations, and MorningJet pricing.
- The six-case mix now contains exactly four cases with calculations; every case
  has at least two exhibits, a low-value decoy, a relevant noncritical branch,
  and at least two efficient paths.
- Added deterministic clean-session solve-through coverage for every authored
  efficient path. It verifies prerequisite order, discoverable recommendation
  evidence, available synthesis choices, and successful completion.
- Added a validated runtime case registry and generalized the case library,
  case route, session API, and review route to resolve all six definitions.
- Added manual conclusion fixtures for all six cases and explicit regression
  coverage for the required category mix and supported recommendation bundles.
- Added a second-case browser smoke journey for NorthStar and full browser
  completion coverage for both no-calculation cases, NorthStar and GoldenLoaf.
- Independent review found that no-calculation cases could not reach synthesis,
  NorthStar mentioned unsupported interim surcharges, FleetFix assumed unsupported
  one-hub economics, and the category mix was not directly asserted. Two fix
  rounds resolved every actionable Critical/Important finding; scoped re-review
  was clean.
- Review also questioned learner-visible completed replay diagnostics. The plan
  explicitly requires post-completion critical-found/missed states, score bars,
  feedback, and an example efficient path, so those planned review features were
  retained while pre-completion projections continue to hide causal/scoring data.
- Final verification: 24 test files / 97 tests pass; lint, typecheck, production
  build, and `git diff --check` pass; all 7 Playwright journeys pass.
- Final plan commit: `4ffa54f content: complete six-case MVP library`.

### Task 15: Learn section — complete

- Added `/learn` with five concise core-skill lessons and five recurring case
  pattern lessons: segmentation, mix shift, hidden denominator, bottleneck, and
  `math answer != business answer`.
- Every lesson ends with a direct matching drill link, and the home page now
  exposes the Learn section as a primary path.
- Added content validation that requires the exact V1 lesson set and verifies
  every referenced skill and `/drills/{skillId}` route against the existing
  drill registry.
- RED checkpoint: `47be279 test: define learn content contract`; the focused
  suite failed because `lessons.json` did not exist.
- GREEN plan commit: `23497de feat: add concise learning modules tied to drills`.
- Final scoped review found no Critical or Important Task 15 issue.
- Final verification: 25 test files / 99 tests pass; lint, typecheck,
  production build, and diff check pass; all 7 Playwright journeys pass.

### Task 16: Accessibility, resilience, responsive layout, and release — complete

- Added a keyboard-only AlpineFit browser journey covering framework building,
  button-based branch reordering, investigation, exhibit access, calculation,
  synthesis, recommendation, and review.
- Added automated accessibility checking and explicit chart table-alternative
  assertions in the complete keyboard journey. Global keyboard focus is now
  visibly styled.
- Added explicit stop/recovery screens for invalid case content, unknown case
  IDs, corrupt or expired browser sessions, and failed session loading. Existing
  drill/case persistence failures retain their retry paths.
- Corrupt session data is never partially replayed. Case controls remain hidden
  until the authoritative server projection loads, and malformed API JSON now
  returns a controlled HTTP 400.
- Added browser reflow checks for home, Learn, drill library, case library, case
  workspace, and progress at 320px, 768px, and 1440px with no horizontal overflow.
- Replaced the starter README with real local setup, public Supabase variables,
  migration commands, content-authoring rules, verification commands, Vercel
  notes, and the explicit `No AI in V1` architecture decision.
- RED checkpoint: `1310572 test: define release hardening requirements`.
- GREEN plan commit: `10fb150 chore: harden and document case practice MVP`.
- Final review found one Important adjacent issue: clarification/framework actions
  appeared before the authoritative session request completed. Regression and fix
  commit: `2c93da0 fix: block partial case sessions`; final review is clean.
- Final release gate on reviewed code: 26 test files / 101 tests pass; lint,
  typecheck, production build, and diff check pass; all 13 Playwright journeys pass.

### Implementation plan — complete

- Tasks 1–16 are implemented and verified in the isolated feature worktree.
- The guest V1 is ready to run locally and to connect to Vercel.
- External follow-up remains: configure a real Supabase project, apply
  `supabase/migrations/001_initial.sql`, verify passwordless sign-in/RLS/cloud
  history live, and deploy to Vercel. These actions require project credentials
  or deployment approval and were not performed automatically.

### Live deployment — complete

- Supabase project `vvyozwyodgyszkzuuznr` is connected and migration
  `001_initial.sql` was applied successfully.
- Vercel production deployment is live at
  `https://cases-pi-five.vercel.app` with the public Supabase URL and
  publishable key configured.
- Supabase authentication redirect settings were configured for the production
  and Vercel preview domains.
- Live passwordless sign-in and signed-in progress persistence were verified by
  the owner.

### Product audit planning — approved

- The owner supplied a full playtest/product audit covering interview transfer,
  generation versus recognition, missing skills, case breadth, diagnostic
  feedback, reduced scaffolding, and a proposed three-wave roadmap.
- Created and owner-approved
  `PRODUCT_AUDIT_PLANNING_PLAN.md`. This is a plan for producing the next
  implementation plan; it does not authorize product implementation yet.
- Approved direction: improve the learning loop and diagnostic coaching before
  expanding the case library. The first priority is Generate → Commit → Compare
  → Feedback → Retry, followed by clarification, explicit hypothesis updates,
  diagnostic Progress, and progressively reduced scaffolding.
- Recommended default for the next release is still deterministic/no-AI, using
  authored comparisons and structured self-assessment for generated work unless
  the owner explicitly chooses otherwise during product decisions.

### Product audit Phase 1 — complete

- Audited every Learn lesson, all 50 drills, the full-case workspace, scoring,
  replay, Progress, guest persistence, Supabase persistence, and all six hidden
  case definitions.
- Saved the evidence and `keep` / `adapt` / `replace` / `add` matrix in
  `CURRENT_STATE_GAP_MATRIX.md`.
- Confirmed all six cases are internally coherent and all four authored
  calculations are correct. Existing alternate efficient paths are generally
  permutations of the same required analysis rather than materially different
  hypotheses.
- Confirmed the largest learning gap is choice-first recognition. Structure and
  numeric calculation provide partial generation; prioritization, exhibit
  interpretation, synthesis, clarification, and recommendation remain heavily
  authored-choice driven.
- Found one additional product gap: the case scorer supports
  `exhibit_insight_submitted`, but the full-case UI never emits that event, so a
  normal learner cannot earn the case exhibit score.
- Recorded compatibility constraints for the next plan: the Supabase schema
  accepts only the existing five progress skills, case attempts do not store a
  content version, signed-in historical replay does not load saved case events,
  and changed rubrics should not silently overwrite the meaning of V1 scores.
- Fresh Phase 1 verification: lint passed; typecheck passed; 26 test files / 101
  tests passed; production build passed; all 13 Playwright journeys passed.

### Product audit Phase 2 and V2 implementation-plan approval — complete

- The owner approved eight original binding product decisions, three P0
  prerequisites, and a ninth staged-drill decision.
- Recorded the accepted decisions in `PRODUCT_DECISION_LEDGER.md`. The next
  release remains deterministic/no-AI and uses Generate → Commit → Structured
  rubric self-check → Authored comparison → Diagnostic feedback → Retry for
  genuinely generated answers.
- Scratch work remains private. Committed responses, rubric outcomes,
  diagnostic sources/codes, revisions, and relevant case events become durable
  V2 evidence.
- The model must define `beginner`, `intermediate`, and `interview` scaffolding
  now, while full timed Interview Mode remains deferred.
- Case Opening & Clarification is the sixth Wave 1 skill. Hypothesis formation
  and evidence-linked updating are tracked cross-case behaviors rather than a
  separate scored skill.
- The Wave 1 pilot cases are AlpineFit (beginner), PayPilot (intermediate), and
  GoldenLoaf (lower-scaffolding transfer). NorthStar, FleetFix, and MorningJet
  remain V1 in this wave.
- V1 history is preserved as strictly separate legacy scoring. V1 data cannot
  affect V2 readiness, trends, weakness detection, or recommendations.
- P0 order is binding: add case/content versioning before editing pilot
  definitions, preserve the full framework tree/order/rationale, and make
  full-case exhibit interpretation reachable before collecting pilot results.
- The owner approved `CASEWORK_V2_IMPLEMENTATION_PLAN.md` after requiring a
  staged learning-quality validation. The plan now contains 17 TDD tasks,
  release gates, a 60–90 hour estimate, a risk register, and an exact first
  action.
- Stage one creates exactly six V2 drills—one high-quality rep per skill—and the
  complete AlpineFit V2 vertical slice. Implementation must stop after Task 11
  for playtesting and owner review. The remaining 12 drills, PayPilot,
  GoldenLoaf, and later tasks cannot begin without an explicit post-playtest
  `proceed` decision.
- The staging decision treats learning quality as the dominant remaining risk
  and prevents an unvalidated interaction design from being copied across all
  18 drills.
- No product code, case content, database schema, or deployment configuration
  was changed during planning. Despite plan approval, the owner explicitly
  instructed that V2 implementation must not start yet.

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

Do not redo the MVP, deployment setup, audit, decisions, or implementation
planning. Do not begin V2 implementation until the owner gives a separate start
instruction. When authorized, begin only Task 1 with failing V1-compatibility
and V2 contract tests; do not edit pilot content or apply a database migration
at that point. Execute through Task 11, then stop for the mandatory playtest and
owner review before Task 12.
