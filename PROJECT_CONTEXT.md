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

### Casework V3 implementation plan — draft for owner review

- Reconciled the proposed V3 roadmap with the released V2 baseline at
  `c9dde86` and saved the implementation-ready draft in
  `CASEWORK_V3_IMPLEMENTATION_PLAN.md`.
- The draft limits detailed implementation planning to V3.0, keeps V3.1 and
  V3.2 behind production-evidence gates, preserves legacy schemas, and adds the
  missing immutable course-step evidence contract.
- V3 implementation, migration, and deployment remain unauthorized.
- Next action: owner review of the V3.0 scope and plan. If approved, create a
  clean V3 branch/worktree and execute Task 0 only.

### V2 final wrong-unit retry release fix — deployed

- Reproduced the release blocker: after a correct number with the wrong unit,
  corrective feedback appeared but the calculation action stayed disabled as
  “Saving” until refresh.
- Root cause was a missing successful-submit state transition in
  `CaseGeneratedStep`; the shared API, evaluation, persistence, and recovery
  contracts were already correct. The fix adds the same idle reset used by the
  other practice submitters, with no refresh workaround.
- Added a red-green component regression proving wrong-unit feedback,
  immediate retry availability, and successful same-session correction. The
  existing AlpineFit Playwright journey now covers the same integrated path
  alongside refresh recovery, response revision, and answer secrecy.
- The retry journey also exposed duplicate React keys for repeated calculation
  attempts in replay. A focused red-green regression now keeps every retry
  entry independently keyed and rendered.
- Final local verification: 57 test files / 272 tests, all 34 Playwright
  journeys, lint, typecheck, production build, and `git diff --check` pass.
- The final production release is live at `https://cases-pi-five.vercel.app`.
  The production AlpineFit journey graded the wrong unit incorrect, displayed
  corrective feedback, enabled retry immediately, and accepted the corrected
  unit without refresh. Its precommit session responses contained neither the
  authored numeric answer nor recommendation decision.
- V2 is released. No further V2 release work is assigned.

### Post-plan case-flow remediation — complete

- Legacy cases now treat an exhausted authored investigation graph as a valid
  synthesis state. The learner sees a completion message instead of an empty,
  required “Next investigation” menu; the engine and scorer accept the explicit
  no-further-investigation marker only after every authored node was visited.
- Completed cases now provide explicit “Review case replay” and “Practice case
  again” actions. Fresh practice clears the prior attempt identity, event
  history, timers, evidence, and workspace before loading a new session.
- Added unit, component, and browser regressions for exhausted NorthStar
  synthesis, replay navigation, and clean restart behavior.
- Fresh verification: 53 test files / 256 tests, lint, typecheck, production
  build, and `git diff --check` pass; all 32 Playwright journeys pass.
- The pre-existing untracked `supabase/.temp/` and
  `src/content/drills/quantitative 2.json` remain untouched.

### Casework V2 Task 16: Diagnostic Progress coaching — complete

- V2 diagnostics now aggregate by stable code, evidence source, skill, first
  and latest occurrence, and scaffolding level while Legacy V1 remains isolated.
- Progress exposes committed, reviewed, revised, transferred, and reduced-
  scaffolding evidence. Self-assessments and objective system findings retain
  explicit, distinct labels.
- The deterministic recommendation engine selects recurring unresolved
  blocking/coaching patterns, retires a pattern after a successful reviewed
  retry, and maps every actionable diagnostic area to one exact content-version
  2 transfer drill or pilot case.
- Recommendation URLs resolve the declared rep and content version; sparse
  history falls back to an exact V2 diagnostic starting rep.
- Unit and component coverage proves mixed-source/mixed-version aggregation,
  retry rotation, V1 exclusion, exact targets, and evidence labels. Browser
  coverage exercises empty, sparse, and dense guest states plus a signed-in
  Supabase history, accessibility, 320px reflow, and exact target navigation.
- Final Task 16 gate: 53 test files / 253 tests, lint, typecheck, production
  build, and diff check pass; all 31 Playwright journeys pass.
- Next action: run the final assigned Tasks 12–16 verification and acceptance
  audit. Task 17 remains outside this run.

### Casework V2 Task 15: Exact V2 practice in Learn — complete

- Preserved every original lesson as an explicit V1 registry entry and added
  active V2 lesson projections with exact `{ drillId, contentVersion }`
  practice references.
- All six core-skill lessons now embed their declared V2 interaction inline
  through the existing clarification or V2 drill session components. Learners
  can also open the same exact rep on its full-page URL.
- The five pattern lessons remain concise and link to explicit relevant V2 reps,
  including mix shift, hidden denominator, bottleneck, segmentation, and the
  distinction between a numeric answer and a business answer.
- Registry integrity tests prove every exact rep exists at content version 2;
  core-skill bindings also match the lesson skill. V1 lesson lookup remains
  stable and no V1 attempt is relabeled.
- Focused browser coverage completes an embedded rep, verifies the authored
  comparison stays hidden before commitment, recovers from a failed save, and
  checks axe and 320px reflow.
- Next action: Task 16, deterministic diagnostic V2 Progress coaching.

### Casework V2 Task 14: GoldenLoaf lower-scaffolding transfer — complete

- Added immutable GoldenLoaf V2 content and made it active while preserving the
  V1 definition and historical lookup.
- Every generated checkpoint uses the `interview` scaffolding contract with a
  neutral prompt and no answer-bearing guidance. The case library and workspace
  explicitly label the experience “lower-scaffolding transfer,” not full
  Interview Mode.
- Added legal demand/mix-pressure and baking/changeover starting hypotheses.
  The complete browser route revises from the broader demand/mix claim to the
  oven constraint, then carries process capacity, premium mix, quality, and
  peak-demand evidence through synthesis and recommendation.
- Authored comparisons and structured choices remain hidden until commitment at
  each defined reasoning checkpoint. Feedback still follows the existing
  checkpoint review contract; full end-only Interview Mode remains deferred.
- Focused verification covers both initial hypotheses, V1/V2 lookup, answer
  secrecy, refresh recovery, complete hypothesis/recommendation review,
  keyboard-native controls, axe, and 320px reflow.
- Next action: Task 15, bind each concise lesson to an exact versioned V2 rep.

### Casework V2 Task 13: PayPilot intermediate strategy case — complete

- Added immutable PayPilot V2 content and made it active while preserving the
  reviewed V1 definition and explicit historical lookup.
- The shared V2 case flow now requires an intermediate-scaffolding decision
  frame, strategic hypothesis, evidence-linked update, three exhibit
  interpretations, quantitative reasoning, synthesis, and recommendation. All
  intermediate cycles use neutral prompts with no answer-bearing guidance.
- Authored installed-base cross-sell and geographic-expansion starting
  hypotheses. Both efficient evidence routes complete legally; decisive
  expansion economics require the expansion hypothesis to revise rather than
  retain a contradicted claim.
- Opening projections omit decision criteria, authored comparisons, question
  responses, and recommendation answers until the generated response is
  committed. Historical PayPilot V1 remains addressable at content version 1.
- Focused verification covers both hypothesis routes, contrary-evidence
  diagnostics, immutable lookup, answer secrecy, refresh recovery, the complete
  browser journey, automated accessibility, and 320px reflow.
- Next action: Task 14, GoldenLoaf V2 lower-scaffolding transfer content and
  delayed-support verification.

### Casework V2 Task 12: Complete diagnostic drill pilot — complete

- Added twelve immutable V2 transfer reps—two per skill—without editing the
  original six Task 9 definitions. The pilot now contains exactly three reps
  for each of clarification, structure, prioritization, quantitative, exhibit,
  and synthesis (18 total).
- Reviewed the transfer content in two six-rep passes. The first set uses
  CedarCare clinic access, QuickCart delivery reliability, Meridian onboarding,
  HarborCart free shipping, Beacon channel mix, and AeroParts supplier risk.
  The second uses StreamWave retention, Verdant market entry, UrbanEats rollout,
  Northwind pricing, CedarCare complaint rates, and BrightLearn onboarding.
  Contexts, response kinds, criterion patterns, and checkpoint demands vary;
  the additions are not renamed or renumbered copies.
- Added set-level validation for duplicate definition IDs, interaction IDs, and
  reasoning-template signatures, plus an exact three-reps-per-skill contract.
  Evaluator coverage now exercises every authored checkpoint and all three
  clarification question sets.
- Added reusable URL-addressable rep selection on every V2 skill page. Selected
  reps survive refresh, remain keyboard-accessible, preserve pre-commit answer
  secrecy, and reflow from three columns to one at phone width. The selector is
  data-driven and does not special-case AlpineFit or alter drill evaluation.
- RED evidence: the content contract initially found 6 rather than 18 reps and
  no duplicate-template validator; component tests found the old hard-coded
  single-rep label; the browser test found no rep navigation. The browser
  accessibility test also exposed a 4.06:1 selected-label contrast regression,
  fixed with a selected-state text color and reverified at the same checkpoint.
- Final verification: 48 unit/component files and 233 tests pass; lint,
  typecheck, production build, and `git diff --check` pass; all 25 Playwright
  journeys pass. Browser coverage includes URL selection and refresh, answer
  secrecy, keyboard semantics, automated accessibility, and 320px reflow.
- The completed-case replay/retry entry-point issue reported at the owner gate
  was deferred at this task boundary and resolved by the later post-plan
  case-flow remediation. Task 12 itself did not alter case logic, scoring,
  persistence, or replay semantics.
- Next action: stop at the Task 12 commit boundary. Task 13 (PayPilot V2) has not
  started and requires a separate continuation instruction.

### Post-Task-11 owner playtest remediation — complete

- The first owner playtest recorded `revise and replaytest`; it did not authorize
  Task 12 or any later implementation.
- Incorrect quantitative responses now show the submitted value and unit,
  separate numeric/unit correctness, the authored correct answer, and authored
  reasoning only after grading. This applies to AlpineFit V2, the quantitative
  V2 rep, and the Legacy V1 quantitative drills; correct feedback stays concise.
- Learner choices use seeded ID-based ordering that stays stable for the browser
  session and across refresh/recovery. Learner payloads still exclude correctness
  metadata and scoring never depends on display position.
- The framework builder now explains major areas, supporting points, and what it
  means to investigate an area first, with clearer hierarchy and learner-facing
  controls while preserving the submitted V2 tree and rationale.
- AlpineFit now has an optional, skippable, reopenable keyboard-accessible “How
  this case works” walkthrough. It explains the workflow without revealing case
  answers.
- Choice rows and controls have larger targets. Scratchpad notes support bullet
  continuation and Tab/Shift+Tab indentation, remain browser-session-only, and
  are never added to graded or durable evidence.
- The homepage is shorter for returning learners, decorative section numbering
  and the requested AI phrase are removed, typography uses the system UI stack,
  and quantitative units use a styled accessible listbox.
- During the owner re-playtest, AlpineFit V2 exposed the Legacy V1 synthesis
  form before the generated V2 synthesis checkpoint was ready, producing an
  empty “Next investigation” menu. The fallback is now restricted to V1;
  AlpineFit remains in investigation until its V2 synthesis prerequisites are
  complete. The focused AlpineFit browser regression passes.
- A subsequent owner replay request replaced AlpineFit's flat investigation and
  replay lists with reusable business-category sections for Revenue, Operating
  Costs, and Labor & Staffing. Optional display metadata controls only section
  labels and prerequisite-derived indentation. Authored node order, graph
  fields, availability, evidence, scoring, critical-node states, and replay
  events remain unchanged. V1 and cases without authored categories retain an
  ungrouped list.
- Verification: 48 unit/component files and 209 tests pass; typecheck, lint,
  production build, and all 24 Playwright journeys pass with no skips. Browser
  coverage includes stable order after refresh, educational wrong-answer
  feedback, grouped AlpineFit investigation and replay sections, prerequisite
  labels, walkthrough focus/reopening, scratchpad behavior, axe, and 320px
  reflow. A graph-invariant regression confirms that V2 categories add no case
  logic changes.
- `supabase/.temp/` remains untracked and untouched.
- Mandatory state: stop for owner re-playtest. Task 12 has not started. Only an
  explicit post-re-playtest `proceed` decision may open Task 12; `revise again`
  keeps work inside the existing Stage-One interaction.

### Casework V2 Task 11: AlpineFit beginner teaching case — complete

- AlpineFit V2 is now the active version while the immutable V1 definition,
  hashes, explicit lookup, replay, and efficient-path solve-throughs remain
  intact.
- The beginner case requires the full generated learning loop: opening,
  preserved framework plus priority rationale, initial and revised hypothesis,
  both exhibit interpretations, quantitative reasoning, synthesis, generated
  recommendation, and optional response revision.
- Authored criteria, comparisons, checkpoint choices, calculation answers, and
  recommendation choices stay server-side until the learner commits at the
  legal phase. Server replay rejects premature reveals, forged diagnostics,
  duplicate evidence, incomplete loop histories, and stale content versions.
- Recovery covers refreshes at major checkpoints and a failed final save without
  creating a duplicate attempt. Replay retains each generated response chain,
  structured details, and versioned diagnostics.
- Required case steps cannot be skipped into a dead end. The opening is keyboard
  operable, generated widgets use unique accessible labels, and the complete
  journey passes axe and 320px overflow checks.
- Verification: 43 unit/component files and 196 tests pass; typecheck, lint,
  production build, and all 23 Playwright journeys pass with no skips.
- Final review fixes closed premature answer reveal, weak diagnostic replay
  validation, duplicate-evidence inflation, early synthesis, and missing V2
  failed-save recovery coverage.
- Mandatory state: stop here. Do not begin Task 12 or later work until the owner
  playtests the six V2 reps plus AlpineFit V2 and explicitly records `proceed`,
  `revise and replaytest`, or `stop`.
- Continue leaving `supabase/.temp/` untracked and untouched; it predates this
  work and contains local Supabase link metadata.

### Casework V2 Task 10: Evidence-linked hypothesis updates — complete

- V2 cases can require a generated initial hypothesis before investigation and
  one retain/revise/reject update linked to revealed evidence before synthesis.
  Legacy `hypothesis_selected` events remain rejected and the new events are
  version-gated.
- Hypothesis events retain the committed response chain, latest rubric outcomes,
  deterministic diagnostics, selected status, evidence IDs, rationale, and the
  link to the prior hypothesis response. Replay renders the full chain.
- Hypothesis diagnostics persist at the case level and appear in a separate V2
  Progress section. They never create or contaminate a numeric skill score.
- Learner projections and commit APIs keep future facts, rubric criteria, and
  authored comparisons hidden until the legal phase and response commitment.
- Final adversarial review made server replay reject partially accepted event
  histories, rebuild completed learning cycles from authored rules, reject
  tampered diagnostic/reveal state, validate latest self-check diagnostics, and
  clear completed hypothesis recovery keys after save or a fresh restart.
- Verification: 188 unit/component tests, typecheck, lint, production build,
  and 21 browser tests pass. Browser coverage includes formation, contrary
  evidence, refresh recovery, revision linkage, keyboard/accessibility checks,
  Progress isolation, and 320px reflow.
- Next action: Task 11 architecture and test design for an immutable AlpineFit
  V2 beginner case. Stop again before bulk implementation per the required model
  checkpoint, then stop after Task 11 at the owner playtest gate. Do not begin
  Task 12.
- Continue leaving `supabase/.temp/` untracked and untouched; it predates this
  work and contains local Supabase link metadata.

### Casework V2 Task 9: Six complete learning-cycle reps — complete

- The pilot now contains exactly six validated V2 reps: one each for
  clarification, structure, prioritization, quantitative reasoning, exhibit
  interpretation, and synthesis. No additional V2 drill definitions exist.
- Every rep requires a generated response before criteria, authored comparison,
  or checkpoint choices appear; the shared cycle supports a linked retry and
  preserves the full response chain.
- Server-side checkpoint evaluation keeps framework rubrics, correct choices,
  expected numeric answers, and synthesis answer keys out of learner payloads.
  Quantitative reasoning separately records setup, sense check, implication,
  numeric answer, and unit.
- V2 attempts persist self-assessed and system diagnostics as versioned learning
  evidence. The existing 50 drills remain available in a separately labeled
  Legacy V1 library and cannot count as V2 progress.
- Verification: 169 unit/component tests, typecheck, lint, production build,
  and six V2 browser journeys pass. Browser coverage includes commit-before-
  reveal, linked retry, keyboard operation, axe scans, and 320px reflow.
- Do not stage or commit `supabase/.temp/`; it predates this work and contains
  local Supabase link metadata.
- Next action: Task 10, evidence-linked hypothesis formation and updates. Then
  complete Task 11 and stop at the mandatory owner playtest gate; do not begin
  Task 12.

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

### Casework V2 Task 8: Case opening and clarification skill — complete

- Added exactly one V2 clarification pilot rep and a separate V2 lesson without
  modifying the 50 legacy drill artifacts or ten legacy lesson artifacts.
- Learners generate and commit an objective restatement before rubric criteria,
  authored comparison, or question choices appear; selected questions then
  return their exact authored interviewer responses.
- Deterministic question evaluation distinguishes high-information questions,
  low-value choices, and overload. Prose remains self-assessed against explicit
  criteria; no keyword or length rule pretends to grade its meaning.
- Completed attempts persist full V2 metadata, linked responses, rubric outcomes,
  and source-labeled self-assessment/system diagnostics. Refresh restores the
  committed cycle and post-commit question choices.
- Added the parallel V2 full-case opening contract: generated restatement,
  verified authored question responses, rubric evidence, diagnostics, and
  revisions. V2 clarification requires multiple focused questions; one legacy-
  style high-value checkbox cannot earn full credit.
- Verification: 156 unit/component tests, typecheck, lint, production build,
  focused engine/scoring tests, and the clarification Playwright journey pass;
  the browser journey covers answer secrecy, authored responses, keyboard focus,
  axe, and 320px overflow.
- Next action: author exactly one V2 rep for each remaining skill using the same
  cycle, then verify the total is exactly six before proceeding.

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

### Task 17: Version-safe history/replay and pilot release candidate — complete locally

- Added an owned historical case-attempt repository lookup that joins saved
  attempt metadata with schema-validated events in stored sequence order.
- Signed-in and guest V2 case attempts are now listed once on Progress and link
  to replay by stable attempt ID. Completed cases also carry their attempt ID
  directly into review.
- Historical review always posts the saved content version and stored events to
  the authoritative session projection. If that immutable definition is absent,
  review shows a stored metadata summary and explicitly refuses to substitute
  current content.
- Cross-user repository coverage, existing Supabase RLS policy checks, and
  user-filtered attempt/event reads protect historical attempts from disclosure.
- Added signed-in browser journeys for both ordered exact-V2 replay from
  Progress and the unavailable-version stop state. The stop state retains
  automated accessibility and 320px reflow checks; existing pilot suites retain
  full case journeys, keyboard operation, 320/768/1440 reflow, refresh recovery,
  and precommit answer-secrecy assertions.
- Updated the README and added `RELEASE_NOTES.md` with the additive migration
  smoke sequence, separate live-release record, honest Wave 1 boundaries, and a
  rollback that selects V1 active cases without deleting V2 rows.
- No obsolete V2 feature flag existed. Pilot activation remains explicit in the
  immutable case/drill version registries.
- The controller confirmed a linked dry-run containing additive migrations
  `002` and `003` plus checksummed schema/data backups. Migration apply,
  transaction-scoped live RLS smoke, and deployment were not performed in this
  implementation task and remain external release gates.

## Decisions and Notes

- `create-next-app` selected current stable Next.js 16.3.5.
- Next.js 16 dynamic route params are promises; dynamic pages must `await params`
  or use React `use` in a client page.
- Vitest 5 requires `@types/node` 22+; the generated Node 20 type dependency was
  upgraded to resolve the peer conflict.
- Playwright commands need elevated execution in this environment because the
  sandbox cannot bind the local Next.js test port.
- The current visual direction is editorial and calm: warm paper, deep green,
  restrained orange, a consistent system UI sans-serif stack, and
  high-information layouts.

## Next Action

Task 17 is implemented locally and its initial changes are committed as
`a5390a7`. Review the fix commit, then have the controller apply migrations
`002` and `003` under the required approval and record the transaction-scoped
cross-user/RLS result in `RELEASE_NOTES.md`. Deployment still requires explicit
owner approval and separate live sign-in/save, historical replay, rollback, and
answer-secrecy evidence.
