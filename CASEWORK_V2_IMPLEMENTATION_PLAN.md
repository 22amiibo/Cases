# Casework V2 Learning Foundation — Approved Implementation Plan

Status: Approved with staged-drill amendment; implementation not started
Prepared: 2026-09-17  
Approved: 2026-09-17
Inputs: `PRODUCT_DECISION_LEDGER.md`, `CURRENT_STATE_GAP_MATRIX.md`, and
`PRODUCT_AUDIT_PLANNING_PLAN.md`

## 1. Release Outcome

Wave 1 will prove a stronger learning loop on a deliberately small surface:

> Learners generate a response before reveal, commit it, diagnose it against a
> structured rubric and authored comparison, retry it, and then demonstrate the
> same reasoning with less scaffolding in a full case.

The release upgrades three cases—AlpineFit, PayPilot, and GoldenLoaf—adds Case
Opening & Clarification as skill six, tracks hypothesis formation and updates,
and turns V2 Progress into a diagnostic coaching view. It retains all V1 data
as clearly separated legacy history.

## 2. Scope Boundary

### Included in Wave 1

- A reusable deterministic generated-answer learning cycle.
- Explicit `beginner`, `intermediate`, and `interview` scaffolding contracts.
- Versioned drills, cases, events, scoring, attempts, and progress readers.
- P0 fixes for unreachable case exhibit scoring and flattened framework events.
- Case/content versioning before any pilot definition changes.
- Six trainable V2 skills: opening/clarification, structure, prioritization,
  quantitative reasoning, exhibit interpretation, and synthesis.
- Hypothesis formation/update as a cross-case diagnostic behavior.
- A staged 18-drill pilot: first build six high-quality V2 reps, one per
  trainable skill; build the remaining 12 only after the AlpineFit learning
  cycle passes a mandatory playtest/review gate.
- One exact embedded V2 practice rep for each of the six core-skill lessons;
  pattern lessons remain concise and link to the most relevant V2 rep.
- Three upgraded pilot cases with progressively reduced scaffolding.
- V2 diagnostic Progress and targeted next-rep recommendations.
- Version-safe signed-in history and replay for V2 attempts.

### Explicitly out of scope

- AI or semantic grading.
- Standalone brainstorming or market-sizing curricula.
- Spoken-response recording or evaluation.
- Full timed Interview Mode and unrestricted interview simulation.
- Conversion of NorthStar, FleetFix, or MorningJet to V2.
- Conversion of all 50 V1 drills.
- New case categories or expansion beyond the existing six cases.
- A single numeric score derived from generated free text.

### Mandatory staging rule

The first implementation stage ends after exactly six V2 drills—one per
trainable skill—and the complete AlpineFit V2 vertical slice. Work must stop at
that point for playtesting and owner review. Do not begin the remaining 12
drills, PayPilot, GoldenLoaf, or downstream release work until the owner gives
an explicit post-playtest proceed decision.

## 3. Learner Experience Contract

Every generated interaction uses these states in order:

1. **Generate:** The learner receives only the prompt and support allowed by the
   scaffolding level.
2. **Commit:** The response is frozen as revision 1 and may now be persisted.
3. **Self-check:** The learner answers authored yes/no or bounded rubric items.
4. **Compare:** One or more authored defensible examples and rationale become
   visible. They were not present in the pre-commit browser projection.
5. **Diagnose:** Deterministic system checks and self-check outcomes are shown
   separately, each with a specific diagnostic code and next action.
6. **Retry:** The learner submits a linked revision without erasing the first
   attempt. The cycle records what changed.

A learner may skip a retry, but the skip is explicit. Progress distinguishes
`committed`, `reviewed`, `revised`, and `transferred` evidence.

### Scaffolding behavior

| Level | Prompt support | Choice visibility | Hints | Feedback |
| --- | --- | --- | --- | --- |
| Beginner | Guided fields and labels | Only after commitment | Optional, recorded when used | Immediate after self-check |
| Intermediate | Neutral field labels | Only in authored comparison | No answer-bearing hints | Immediate at checkpoints |
| Interview | Prompt and neutral workspace | No pre-commit choices | None | Delayed to checkpoint or case end |

GoldenLoaf uses the `interview` scaffolding contract for its reasoning
checkpoints, but Wave 1 must label it “lower-scaffolding transfer,” not “full
Interview Mode.” Timers, spoken practice, and unrestricted navigation remain
deferred.

## 4. Scoring and Diagnostic Rules

### Objective results

The system may score only directly verifiable work: numeric correctness,
required units, selected evidence, framework concept coverage, overlap,
priority choice, event legality, investigation value, and authored structured
selections made after commitment.

### Generated responses

Generated prose receives no semantic numeric score. Progress stores:

- the committed response and revision chain;
- rubric answers selected by the learner;
- system-observed and self-assessed diagnostic outcomes;
- whether an authored comparison was viewed;
- whether the learner retried;
- scaffolding level and hint usage;
- content and scoring versions.

### V2 Progress rule

V2 does not publish one composite “readiness score.” It shows objective checks
where they exist and evidence states for generated behaviors. A skill may be
described as `Not started`, `Building`, or `Consistent` using deterministic
minimum-evidence rules. The UI must identify self-assessed evidence as such.
The product must not label a user “Interview ready” before full Interview Mode
exists.

Suggested `Consistent` rule for Wave 1: at least three reviewed V2 attempts,
including one retry or transfer rep, with no blocking diagnostic recurring in
all three most recent attempts. This rule is configurable and must be tested as
an algorithm, not embedded in UI copy.

## 5. Diagnostic Taxonomy

Every code has a skill/behavior, source (`system` or `self_assessment`), severity
(`strength`, `coaching`, or `blocking`), authored explanation, and recommended
next repetition.

| Area | Initial Wave 1 codes |
| --- | --- |
| Opening & clarification | `objective_not_reframed`, `material_term_unresolved`, `constraint_missed`, `low_value_question`, `question_overload`, `strong_opening` |
| Structure | `missing_major_branch`, `overlapping_branches`, `branch_too_vague`, `branch_not_testable`, `priority_missing`, `strong_structure` |
| Prioritization | `low_information_value`, `premature_detail`, `hypothesis_not_linked`, `failed_to_update`, `immaterial_branch_continued`, `strong_priority` |
| Quantitative | `setup_error`, `arithmetic_error`, `unit_error`, `sense_check_missing`, `business_implication_missing`, `strong_quantitative_reasoning` |
| Exhibit | `observation_error`, `comparison_missed`, `implication_missing`, `next_test_missing`, `strong_exhibit_chain` |
| Synthesis | `answer_not_first`, `evidence_dump`, `evidence_unsupported`, `implication_missing`, `next_step_missing`, `strong_synthesis` |
| Recommendation | `recommendation_not_answer_first`, `support_insufficient`, `risk_missing`, `next_step_missing`, `strong_recommendation` |
| Hypothesis | `hypothesis_missing`, `evidence_link_missing`, `update_missing`, `contradicted_hypothesis_retained`, `strong_hypothesis_update` |

Codes are stable identifiers. Learner-facing copy is authored separately so it
can be case-specific without changing historical analytics.

## 6. Technical Design

### Version identifiers

- `contentVersion`: positive integer on every lesson, drill, and case
  definition.
- `eventSchemaVersion`: positive integer on case event streams.
- `scoringVersion`: stable string; existing data maps to `v1`, new pilot data
  uses `v2`.
- `scaffoldingLevel`: `beginner | intermediate | interview`; nullable for
  legacy rows and required for V2.

Case content becomes an immutable registry keyed by `(caseId, contentVersion)`.
Existing JSON definitions become version 1 artifacts and are never edited in
place. Pilot edits create version 2 artifacts. The active case library points
to the approved version; historical replay resolves the version recorded on
the attempt.

### Generated-response record

Use one reusable contract across drills and cases:

```ts
type CommittedResponse = {
  responseId: string;
  interactionId: string;
  revision: number;
  revisionOf: string | null;
  responseKind: string;
  text: string;
  committedAtMs: number;
};

type RubricOutcome = {
  criterionId: string;
  met: boolean;
};

type DiagnosticOutcome = {
  code: string;
  source: "system" | "self_assessment";
  severity: "strength" | "coaching" | "blocking";
  responseId?: string;
};
```

Exact runtime types will be Zod-validated. Text limits are safety and storage
limits only; they are never used as quality scores.

### Case events

V2 adds or upgrades events for:

- opening commitment and clarification questions;
- full framework tree, sibling order, priority, and rationale;
- initial hypothesis and evidence-linked updates;
- generated exhibit interpretation plus rubric outcomes;
- quantitative setup, objective answer, sense check, and implication;
- generated synthesis and recommendation commitments;
- authored-comparison view and retry/revision actions.

Legacy V1 events remain parseable. Server replay applies the schema and content
version declared by the attempt and rejects mixed or unknown versions.

### Persistence migration

Create `supabase/migrations/002_v2_learning_evidence.sql` as an additive
migration. Add version/scaffolding metadata and JSONB evidence/diagnostics to
attempts, update validated skill IDs to include `clarification`, and update the
retry-safe case-save function. Add an RLS-protected read path for ordered case
events. Existing rows remain valid and are interpreted as V1 without requiring
a destructive backfill.

### Answer secrecy

Rubric criteria required for self-check may be sent only after commitment.
Authored comparisons, insight strength, root-cause flags, efficient-path
metadata, recommendation weights, and future facts stay server-side until the
corresponding reveal or completed review.

## 7. Executable Task Plan

Each task is an independent review and commit boundary. Red tests must be
observed before behavior is added. After every task, update `PROJECT_CONTEXT.md`
with the commit, tests, decisions, and exact next action.

### Task 1 — Establish V2 version, scaffolding, and diagnostic contracts

**User-visible outcome:** None yet; later work has one stable and validated V2
language.

**Expected files:** `src/core/schema.ts`, new `src/core/diagnostics.ts`, new
tests under `src/core`, and representative fixtures in `src/test/fixtures.ts`.

**Contract changes:** Add content/event/scoring versions, scaffolding levels,
committed responses, rubric outcomes, diagnostic outcomes, and a six-skill V2
identifier set. Keep legacy V1 event and attempt shapes parseable.

**Red → green → refactor:** First add schema tests for accepted V1 data,
accepted V2 data, invalid diagnostic sources, invalid revision chains, and
missing V2 metadata. Implement the smallest schemas, then remove duplicated
identifier/version validation.

**Checks:** Focused schema/diagnostic tests, full unit suite, typecheck, lint.

**Compatibility/data safety:** No stored row or V1 JSON becomes invalid.

**Dependency:** None.  
**Commit:** `feat: define versioned v2 learning contracts`  
**Completion evidence:** V1 fixtures and all new V2 fixtures parse; invalid
mixed-version fixtures fail with useful paths.

### Task 2 — Add immutable content registries and version-safe replay lookup

**User-visible outcome:** Historical attempts can never be silently interpreted
against edited content.

**Expected files:** `src/content/cases/index.ts`, new versioned case registry
modules/directories, lesson/drill loaders, `src/core/validation.ts`, API route
tests, and content tests.

**Contract changes:** Resolve content by `(id, version)` and declare one active
version separately. Preserve all six current definitions as immutable V1
artifacts before creating any V2 content.

**Red → green → refactor:** Tests first prove that version 1 and version 2 with
the same ID resolve independently, unknown versions stop safely, and active
lookup does not change historical lookup. Refactor loaders only after parity.

**Checks:** Content validation, API route tests, deterministic solve-through for
every V1 case, full unit suite, build.

**Compatibility/data safety:** File moves must not alter parsed V1 definitions;
compare serialized validated output before and after refactor.

**Dependency:** Task 1.  
**Commit:** `refactor: add immutable versioned content registries`  
**Completion evidence:** All six V1 hashes/validated projections remain stable,
and explicit historical lookup is covered.

### Task 3 — Migrate persistence without blending legacy data

**User-visible outcome:** Existing progress remains intact while V2 attempts can
store versions, scaffolding, committed evidence, diagnostics, and revisions.

**Expected files:** new `supabase/migrations/002_v2_learning_evidence.sql`,
`src/data/repository.ts`, `src/data/supabase-repository.ts`,
`src/data/memory-repository.ts`, `src/data/attempts.ts`, and repository/migration
tests.

**Contract changes:** Add V2 metadata/evidence fields, `clarification` support,
ordered historical event reads, and idempotent inserts. Readers map absent
metadata to `v1` and never fabricate V2 evidence.

**Red → green → refactor:** Add repository contract tests and SQL-text migration
assertions first. Test old row mapping, new row round trip, duplicate save,
event order, user scoping, and unknown-version behavior. Then implement both
browser and Supabase repositories behind the same interface.

**Checks:** Repository/migration tests, typecheck, lint; apply migration to a
fresh local database and a copy containing representative V1 rows before live
application.

**Compatibility/data safety:** Additive migration only; no drop, truncate, or
destructive backfill. Production migration requires owner approval and a
pre-migration snapshot/backup confirmation.

**Dependency:** Tasks 1–2.  
**Commit:** `feat: persist versioned v2 learning evidence`  
**Completion evidence:** V1 and V2 round trips pass; RLS and ordered-event reads
are verified; rollback notes are documented.

### Task 4 — Separate V1 legacy history from V2 progress

**User-visible outcome:** Progress clearly labels old results as Legacy V1 and
does not use them for V2 trends or recommendations.

**Expected files:** `src/core/progress.ts`, `src/core/progress-dashboard.ts`,
`src/app/progress/page.tsx`, related styles/components, and progress tests.

**Contract changes:** Aggregators require a scoring-version filter. V2 evidence
states are separate from legacy numeric readiness.

**Red → green → refactor:** Start with mixed-history tests proving that V1
cannot affect V2 status, diagnostic frequency, or recommendations. Add the
legacy section and empty V2 state, then simplify shared date/session helpers.

**Checks:** Unit/component tests, keyboard behavior, 320px reflow, Playwright
mixed-history journey, accessibility scan.

**Compatibility/data safety:** V1 remains visible; no rewrite or deletion.

**Dependency:** Task 3.  
**Commit:** `feat: separate legacy and v2 progress`  
**Completion evidence:** Injecting extreme V1 scores leaves every V2 output
unchanged.

### Task 5 — Preserve complete framework submissions in case events

**User-visible outcome:** Review and diagnostics reflect the learner's actual
tree, branch order, starting priority, and rationale.

**Expected files:** `src/core/schema.ts`, `src/core/case-engine.ts`,
`src/core/case-scoring.ts`, `src/core/learner-case.ts`,
`src/components/investigation/InvestigationPanel.tsx`, framework/replay
components, and tests.

**Contract changes:** V2 `framework_submitted` contains `branches`,
`priorityConceptId`, and committed rationale. Legacy `conceptIds` events still
replay through an explicit V1 adapter.

**Red → green → refactor:** First prove current flattening loses a nested tree.
Add event round-trip, hierarchy-aware scoring, stable sibling order, recovery,
and replay tests; then remove the V2 flattening helper.

**Checks:** Engine/scoring/component tests and a browser flow that refreshes
after nested submission and sees the same hierarchy in review.

**Compatibility/data safety:** Never reinterpret a V1 flattened event as a
known hierarchy.

**Dependency:** Tasks 1–3.  
**Commit:** `fix: preserve framework hierarchy in case events`  
**Completion evidence:** Nested-tree regression passes and V1 replay remains
unchanged.

### Task 6 — Build the reusable generated-response cycle

**User-visible outcome:** A learner can generate, commit, self-check, compare,
receive diagnostics, and retry without seeing the authored answer early.

**Expected files:** new `src/core/learning-cycle.ts`, new
`src/components/practice/GeneratedResponseCycle.tsx` and styles/tests, session
recovery helpers, and learner-safe projection types.

**Contract changes:** Add state transitions for committed response, rubric,
comparison reveal, diagnostics, retry, and skip. Server projection gates
authored comparison by commitment.

**Red → green → refactor:** Test illegal transitions and answer secrecy first;
then component behavior, revision linking, refresh recovery, and accessible
focus movement. Extract shared persistence only after one vertical slice works.

**Checks:** Unit/component tests, keyboard-only component flow, accessibility
scan, server-projection test, 320px layout.

**Compatibility/data safety:** Uncommitted text stays local; scratchpad is never
included in the record.

**Dependency:** Tasks 1–3.  
**Commit:** `feat: add deterministic generated response cycle`  
**Completion evidence:** Network payload before commit contains no rubric answer
or authored comparison; two linked revisions survive refresh.

### Task 7 — Make full-case exhibit interpretation real and scoreable

**User-visible outcome:** After an exhibit appears, the learner must commit
What / So what / Now what reasoning, self-check it, compare, and optionally
retry before the case can use the exhibit result.

**Expected files:** exhibit content projection, `EvidencePanel`,
`InvestigationPanel`, case engine/scoring/learner projection, generated-cycle
integration, and E2E tests.

**Contract changes:** V2 exhibit events store committed interpretation,
structured rubric outcomes, authored-comparison view, and revisions. Objective
structured insight selections may still feed exhibit scoring after commitment.

**Red → green → refactor:** Add a browser test that currently completes a case
without emitting an exhibit event and fails. Implement commit gating, server
reveal, event emission, score reachability, recovery, and replay.

**Checks:** Engine/scoring/component tests; full AlpineFit V1-compatible browser
journey; new V2 exhibit journey; answer-secrecy assertion; accessibility scan.

**Compatibility/data safety:** V1 attempts keep their original zero/unreachable
exhibit result and are not rescored.

**Dependency:** Tasks 2, 5, and 6.  
**Commit:** `fix: add scoreable case exhibit interpretation`  
**Completion evidence:** A normal UI journey emits the event and earns the
expected score; pre-commit projections reveal no authored insight.

### Task 8 — Add Case Opening & Clarification as skill six

**User-visible outcome:** Learners practice restating an objective and asking
high-information clarification questions, then receive authored responses and
specific diagnostics.

**Expected files:** drill schema/engine, new clarification content file,
`DrillSession`, case opening components, lessons, progress labels, and tests.

**Contract changes:** Add one initial high-quality V2 clarification drill. Case
opening events preserve generated restatement, committed questions, interviewer
responses, rubric outcomes, and retries. Remove the V2 any-one-checkbox full
credit rule. The other two clarification pilot drills are deferred to Task 12.

**Red → green → refactor:** Begin with missing-skill content and browser tests.
Cover high-value, low-value, overload, missing objective, authored response
display, and recovery. Reuse the learning-cycle component.

**Checks:** Content/engine/component tests, drill and case browser journeys,
keyboard flow, accessibility, responsive layout.

**Compatibility/data safety:** Legacy clarification events/scoring remain V1;
new progress records use V2 metadata.

**Dependency:** Tasks 1, 3, and 6.  
**Commit:** `feat: add case opening and clarification practice`  
**Completion evidence:** Skill six appears in V2 practice and Progress; all
selected case questions return their authored interviewer responses.

### Task 9 — Create one high-quality V2 rep for each skill

**User-visible outcome:** Each trainable skill has one complete generate-first
V2 rep with diagnostic feedback and a linked retry, sufficient to test the
learning cycle without multiplying unvalidated design.

**Expected files:** versioned drill content, drill schemas/loaders,
`DrillSession`, quantitative/framework integrations, and content/browser tests.

**Contract changes:** Complete the initial six-rep set by adding one definition
for each of the other five skills alongside Task 8's clarification rep. The
quantitative rep separates setup, numeric answer/unit, sense check, and
implication. Prioritization, exhibit, and synthesis reveal choices/examples only
after commitment.

**Red → green → refactor:** Add exact total-count and per-skill contract tests
first. Implement and individually review one complete rep for each remaining
skill, including the clarification rep in the six-rep quality review. Do not
author the remaining twelve in this task.

**Checks:** Content validation, evaluator tests, one browser journey per skill,
keyboard/a11y, responsive checks, full unit suite.

**Compatibility/data safety:** Existing 50 drills and attempts remain V1 and
are not silently used as V2 evidence.

**Dependency:** Tasks 4, 6, and 8.  
**Commit:** `content: add six v2 learning cycle reps`
**Completion evidence:** Exactly one validated V2 rep per skill; every rep
proves commit-before-reveal, persists diagnostic sources, and supports a linked
retry. No additional V2 drill definitions exist.

### Task 10 — Enable hypothesis formation and evidence-linked updates

**User-visible outcome:** Pilot cases ask for an initial hypothesis and require
the learner to retain, revise, or reject it using revealed evidence.

**Expected files:** case/event schemas, case engine/scoring, learner projection,
new hypothesis component, `InvestigationPanel`, replay, and tests.

**Contract changes:** Replace the rejected `hypothesis_selected` placeholder for
V2 with generated initial/update events containing status, evidence IDs,
rationale, rubric outcomes, and revision links. Hypothesis is diagnostic, not a
standalone numeric skill.

**Red → green → refactor:** Test legal timing, evidence availability, update
requirement, refresh recovery, and hidden future evidence first. Add review and
diagnostic rules only after engine transitions pass.

**Checks:** Engine/projection/component tests and a browser path with an initial
hypothesis plus one revision after contrary evidence.

**Compatibility/data safety:** Legacy placeholder events remain rejected in V1;
V2 events are version-gated.

**Dependency:** Tasks 1–3 and 6.  
**Commit:** `feat: track hypothesis formation and updates`  
**Completion evidence:** Evidence-linked update is present in replay and
Progress diagnostics without a fabricated semantic score.

### Task 11 — Upgrade AlpineFit as the beginner teaching case

**User-visible outcome:** AlpineFit teaches the complete V2 loop with guided
opening, preserved framework, initial hypothesis, exhibit interpretation,
quantitative reasoning, synthesis, generated recommendation, and retry.

**Expected files:** new AlpineFit V2 definition, case validation/fixtures,
workspace configuration, review content, and focused E2E journey.

**Contract changes:** Increment content version; add scaffolding configuration,
case-specific rubrics/comparisons/diagnostics, and at least two materially
defensible investigative hypotheses where supported.

**Red → green → refactor:** First define a full V2 browser journey and content
invariants. Implement the V2 definition without editing V1, then remove any
AlpineFit-specific UI branches by moving behavior to content/configuration.

**Checks:** Both V1 efficient-path solve-throughs, all V2 paths, full browser
journey, refresh at each major checkpoint, answer secrecy, a11y, 320px layout.

**Compatibility/data safety:** V1 AlpineFit attempts always resolve V1 content.

**Dependency:** Tasks 2, 5–10.  
**Commit:** `content: upgrade alpinefit for v2 beginner practice`  
**Completion evidence:** Complete V2 journey passes and produces versioned
diagnostic evidence; V1 replay parity remains green.

### Mandatory stop — Playtest and learning-quality review

Stop implementation after Task 11. Do not begin Task 12 or any later task until
the owner reviews the first six V2 reps and AlpineFit V2 and explicitly says to
proceed.

The review must assess:

- whether learners genuinely generate before seeing answer-bearing material;
- whether the self-check criteria are understandable and behavior-specific;
- whether authored comparisons illuminate more than one defensible response;
- whether diagnostics explain what to change rather than merely label an error;
- whether a retry produces a meaningful revision rather than checkbox
  compliance;
- whether beginner scaffolding supports thinking without giving away the move;
- whether AlpineFit transfers the same behaviors from isolated reps into a
  coherent case; and
- whether learners leave with an accurate—not inflated—sense of performance.

Record observations, concrete interaction changes, and the owner decision in
`PROJECT_CONTEXT.md` and the decision ledger. Possible outcomes are `proceed`,
`revise and replaytest`, or `stop`. Automated tests alone cannot pass this gate.

### Task 12 — Author the remaining twelve V2 pilot drills

**User-visible outcome:** After the learning cycle is validated, each of the six
skills gains two additional V2 reps for transfer and repetition, bringing the
pilot total to 18.

**Expected files:** Versioned drill content, content validation fixtures, and
focused evaluator/browser tests. Shared interaction components should change
only when the playtest approved a documented correction.

**Contract changes:** Add exactly two definitions per skill using the validated
Task 9 contract. Vary business context and reasoning demand rather than merely
changing names or numbers.

**Red → green → refactor:** First add tests expecting three V2 reps per skill
and rejecting duplicate reasoning templates. Author one transfer rep per skill,
review the set, then author the final six. Make any cross-cutting interaction
change in shared code with its own regression test before continuing content
authoring.

**Checks:** Content validation, evaluator tests, representative browser paths,
answer secrecy, keyboard/a11y, responsive checks, and the full unit suite.

**Compatibility/data safety:** The first six attempts retain their original
content versions; the 12 new reps do not change or overwrite them.

**Dependency:** Task 11 plus an explicit `proceed` decision at the mandatory
playtest/review gate.
**Commit:** `content: complete v2 diagnostic drill pilot`
**Completion evidence:** Exactly three validated V2 reps per skill, with no
unreviewed interaction-pattern changes and no fake content variety.

### Task 13 — Upgrade PayPilot as the intermediate strategy case

**User-visible outcome:** PayPilot requires learner-generated decision criteria,
a strategic hypothesis, evidence-based updates, and recommendation reasoning
before authored comparisons appear.

**Expected files:** new PayPilot V2 definition, validation fixtures, authored
comparisons, and focused case E2E tests.

**Contract changes:** Increment content version; reduce prompt leakage; model
distinct cross-sell and expansion hypotheses and defensible evidence routes.

**Red → green → refactor:** Add tests proving criteria are not leaked, both
routes are legal, and an update is required after decisive evidence. Implement
content using shared components only.

**Checks:** V1 parity, V2 solve-throughs, intermediate browser journey, refresh,
answer secrecy, a11y, responsive layout.

**Compatibility/data safety:** Historical PayPilot attempts remain bound to V1.

**Dependency:** Task 12 and the approved playtest gate confirm the shared
learning cycle.
**Commit:** `content: upgrade paypilot for v2 intermediate practice`  
**Completion evidence:** Two materially different hypotheses can reach a
supported conclusion; no pre-commit projection reveals preferred criteria.

### Task 14 — Upgrade GoldenLoaf as the lower-scaffolding transfer case

**User-visible outcome:** GoldenLoaf tests whether the learner can transfer the
V2 behaviors with minimal prompts and delayed checkpoint support.

**Expected files:** new GoldenLoaf V2 definition, scaffolding configuration,
review content, and focused E2E tests.

**Contract changes:** Increment content version; use `interview` scaffolding
metadata while labeling the experience lower-scaffolding transfer. Preserve
process, mix, quality, and peak-demand reasoning paths.

**Red → green → refactor:** Tests first prove no answer-bearing hints or choices
appear before commitment, feedback is delayed as configured, and multiple
process hypotheses remain legal. Implement through existing shared contracts.

**Checks:** V1 parity, V2 solve-throughs, lower-scaffolding browser journey,
recovery, answer secrecy, keyboard/a11y, responsive layout.

**Compatibility/data safety:** Historical GoldenLoaf attempts resolve V1.

**Dependency:** Tasks 11–13.
**Commit:** `content: add goldenloaf v2 transfer case`  
**Completion evidence:** Learner can finish without beginner/intermediate help;
review shows the complete hypothesis and revision chain.

### Task 15 — Bind concise lessons to exact embedded V2 reps

**User-visible outcome:** Each core-skill lesson ends with the exact promised
practice interaction on the same learning path, not an unrelated ten-question
rotation.

**Expected files:** versioned `lessons.json` or lesson registry, Learn page,
embedded-rep component, lesson validation, and browser tests.

**Contract changes:** Six core-skill lessons reference exact V2 drill IDs and
content versions. Pattern lessons link to an explicit relevant V2 rep without
adding long copy.

**Red → green → refactor:** Add route/content-integrity tests first; implement
one embedded rep; then data-drive the other lessons through the shared cycle.

**Checks:** Lesson/content tests, embedded-rep browser flow, save retry,
keyboard/a11y, responsive layout.

**Compatibility/data safety:** Existing V1 lesson URLs continue to resolve or
redirect explicitly; completed V1 drills remain legacy.

**Dependency:** Task 9.  
**Commit:** `feat: embed exact v2 practice in learn modules`  
**Completion evidence:** Every core lesson launches its declared exact rep and
no authored comparison appears before commitment.

### Task 16 — Turn V2 Progress into diagnostic coaching

**User-visible outcome:** Learners see recurring reasoning errors, evidence of
revision and reduced scaffolding, and one targeted next repetition tied to the
specific problem—not merely the weakest average score.

**Expected files:** progress core modules, diagnostic recommendation engine,
Progress/Home recommendation components, repository selectors, and tests.

**Contract changes:** Aggregate V2 diagnostics by stable code, source, recency,
skill, and scaffolding. Recommendation maps each actionable code to a versioned
drill or pilot case. Legacy output remains separate.

**Red → green → refactor:** Add mixed-source/mixed-version tests first. Prove
recommendations select recurring blocking/coaching diagnoses, rotate after a
successful retry, and never choose a V1 attempt. Then build UI explanations.

**Checks:** Unit/component tests; guest and signed-in Playwright histories;
accessibility; empty, sparse, and dense responsive states.

**Compatibility/data safety:** No V1 score influences V2 status; self-assessed
diagnostics are labeled and not presented as objective findings.

**Dependency:** Tasks 4 and 8–15.
**Commit:** `feat: add diagnostic v2 progress coaching`  
**Completion evidence:** Seeded histories deterministically produce the expected
diagnostic and exact next rep, with strict version separation.

### Task 17 — Add version-safe history/replay and release the pilot

**User-visible outcome:** Signed-in learners can reopen V2 attempts against the
exact historical content version, and the Wave 1 pilot is resilient,
accessible, and deployable.

**Expected files:** repository history API, case review route/components,
failure states, E2E/accessibility suites, README, `PROJECT_CONTEXT.md`, and
release notes.

**Contract changes:** Historical replay uses attempt metadata and ordered stored
events. Missing definitions produce a safe summary—not current-content replay.

**Red → green → refactor:** Add signed-in historical replay tests, unknown
version stop-state tests, and cross-user/RLS checks first. Complete full pilot
journeys, then remove obsolete V2 feature flags only if rollout approval allows.

**Checks:** `npm run lint`, `npm run typecheck`, `npm test`,
`npm run test:e2e`, `npm run build`, migration smoke tests, keyboard-only pilot
journeys, automated accessibility scans, 320/768/1440 reflow, refresh recovery,
and production answer-secrecy inspection.

**Compatibility/data safety:** Deployment and live migration require owner
approval. Keep a rollback path that selects V1 active content without deleting
V2 rows.

**Dependency:** Tasks 1–16.
**Commit:** `chore: harden and document casework v2 pilot`  
**Completion evidence:** All quality gates pass on reviewed code; live smoke
testing is recorded separately after approved deployment.

## 8. Release Sequence and Gates

### Gate A — Foundation safe

After Task 4: versioned contracts, immutable content lookup, additive migration,
and strict V1/V2 progress separation are reviewed. No pilot JSON may be edited
before this gate.

### Gate B — P0 mechanics trustworthy

After Task 7: framework hierarchy survives, exhibit interpretation is reachable,
and generated responses are hidden/revealed correctly. Do not collect pilot
results before this gate.

### Gate C — Vertical slice proven

After Task 11: one complete beginner V2 case plus six-skill drill coverage is
usable end to end. This is a mandatory implementation stop, not an ordinary
engineering review. Playtest the learning cycle and obtain an explicit owner
decision before authoring the remaining 12 drills, PayPilot, or GoldenLoaf.

### Gate D — Drill expansion validated

After Task 12: the validated interaction has been extended to exactly three V2
reps per skill without duplicating weak design or creating fake variety. Review
content quality before continuing the case progression.

### Gate E — Pilot release candidate

After Task 17: all three cases, Progress, replay, migrations, accessibility,
responsive behavior, and recovery pass. Production migration/deployment still
requires explicit owner approval.

## 9. Estimate

Estimated focused engineering time: **60–90 hours**, approximately **9–14
focused working days** for one agent/developer, assuming the current test and
deployment baseline remains stable.

The mandatory playtest/review wait is not included in those engineering hours.
The first stage through Task 11 is estimated at **38–55 hours**. The estimate
for Tasks 12–17 should be revisited after the playtest because the gate exists
specifically to expose interaction changes before content multiplication.

Approximate allocation:

- Versioning, persistence, and legacy separation: 14–20 hours.
- Shared learning cycle plus P0 framework/exhibit fixes: 16–24 hours.
- Skill six, V2 drills, and hypothesis behavior: 12–18 hours.
- Three pilot case upgrades and lesson binding: 12–18 hours.
- Progress, replay, hardening, and release verification: 10–16 hours.

Pilot observation time is separate. Run the first learning-quality review before
authoring the remaining 12 drills, then allow additional real learner sessions
before deciding whether to convert the remaining V1 content in Wave 2.

## 10. Risk Register

| Risk | Impact | Mitigation / release evidence |
| --- | --- | --- |
| Self-checks create false confidence | High | Label source, require authored comparison, retain revisions, and avoid semantic scores |
| Authored comparisons leak before commitment | High | Server projection tests and browser network assertions |
| Historical attempts replay against changed content | High | Immutable version registry and attempt-bound version lookup |
| Migration blends or invalidates V1 data | High | Additive migration, old-row fixtures, fresh/copy DB checks, no destructive backfill |
| Three scaffolding levels turn into three one-off UIs | Medium | One behavior contract with configuration and shared components |
| Pilot content still supports only one hidden route | High | Content validation plus explicit route/hypothesis tests per pilot |
| Free text is accidentally scored by keywords/length | High | Contract prohibition and reviewer checklist; no evaluator API accepts text for points |
| Diagnostic codes become generic or misleading | Medium | Stable taxonomy plus case-specific authored messages and next-rep mapping |
| Progress overstates readiness | High | No composite V2 readiness score; no “Interview ready” label in Wave 1 |
| Event payloads grow too large | Medium | Length caps, normalized revision metadata, storage-size tests, no scratch persistence |
| Guest refresh or save retry loses revisions | Medium | Session recovery and idempotent-save browser tests at every checkpoint |
| V2 work breaks V1 journeys | High | Keep V1 fixtures/content, run V1 solve-through and browser regression at each gate |
| An unvalidated interaction is copied across the drill set | High | Build only six initial reps, stop after AlpineFit, and require owner approval before the remaining 12 |

## 11. Pre-Implementation Challenge Review

The approved plan was checked against the planning failure modes:

- It establishes the learning loop before broad content conversion.
- It does not claim deterministic semantic grading of free text.
- It requires multiple defensible pilot hypotheses where business logic allows.
- It defines diagnostics before Progress and content expansion.
- It versions content and scoring before pilot definitions change.
- It keeps lessons concise and invests in difficult repetitions.
- It validates six isolated reps plus AlpineFit before multiplying the
  interaction across the remaining drill set.
- It upgrades three cases, not 15–20.
- It makes scaffolding explicit and does not call GoldenLoaf full Interview Mode.
- It retains accessibility, responsive, recovery, privacy, and answer-secrecy
  gates.

Two intentional limitations remain visible: structured self-assessment cannot
prove prose quality, and the pilot cannot prove live conversational performance.
Those are honest Wave 1 boundaries, not hidden scoring claims.

## 12. Approval and Execution State

**Plan approval:** Approved by the owner on 2026-09-17 with the binding staged-
drill amendment. All other decisions and tasks are approved as written.

**Current execution state:** Paused before implementation at the owner's
instruction. Do not start Task 1 until the owner separately asks to begin V2.

**Exact first implementation action when authorized:** Create Task 1's failing
schema tests for V1 compatibility and the new version/scaffolding/diagnostic
contracts. Do not edit pilot content or apply a database migration at that
point.

**Mandatory second stop:** After Task 11, stop with exactly six V2 reps and the
AlpineFit V2 vertical slice complete. Save all evidence and wait for an explicit
post-playtest `proceed` decision before Task 12.
