# Casework Product Upgrade Decision Ledger

Status: Accepted and binding
Decision date: 2026-09-17  
Last amended: 2026-09-17
Decider: Product owner  
Recorded by: Codex  

## Purpose

This ledger closes Phase 2 of `PRODUCT_AUDIT_PLANNING_PLAN.md`. Its decisions
are binding inputs to the Casework V2 implementation plan. They do not authorize
product implementation on their own. The plan is approved, but implementation
remains paused until the owner separately instructs work to begin.

## Release Objective

The next release must prove that Casework can make learners generate their own
reasoning, identify how that reasoning failed, retry it, and transfer the same
behavior into cases with less help. It is a learning-and-diagnosis release, not
a case-library expansion release.

## Binding Decisions

### D1. Deterministic, no-AI architecture

**Decision:** The next release remains fully deterministic. It will not use an
LLM, embeddings, semantic grading, or another machine-learning dependency.

**Rationale:** Deterministic behavior remains explainable, inexpensive,
testable, and compatible with the existing answer-secrecy architecture. The
current learning problem is insufficient generation and diagnosis, not the
absence of an AI evaluator.

**Rejected for this release:** Semantic LLM grading, generated coaching, and
hidden probabilistic quality scores.

**Consequence:** Free-text quality cannot be inferred automatically. Product
flows and progress reporting must distinguish objective checks from structured
self-assessment.

### D2. Generated-answer learning contract

**Decision:** Objective and structured components may be scored automatically.
Genuinely generated answers use this required sequence:

> Generate → Commit → Structured rubric self-check → Authored comparison →
> Diagnostic feedback → Retry

The system must not assign an apparently objective numeric score to arbitrary
free text that it cannot semantically evaluate.

**Rationale:** The sequence forces independent production while preserving
deterministic, useful feedback. It avoids teaching recognition and avoids false
precision.

**Required distinction:**

- System-observed outcomes cover facts the software can verify, such as a
  numeric answer, unit, selected evidence, branch coverage, or legal event.
- Learner-confirmed outcomes come from a structured rubric self-check performed
  only after commitment.
- Authored comparisons may show more than one defensible example where the
  problem supports multiple approaches.
- Retry records a new revision linked to the committed response; it does not
  overwrite the original.

### D3. Privacy and durable evidence

**Decision:** Scratch work remains private and browser-local. Persist committed
answers, structured rubric responses, diagnostic codes, retries/revisions, and
relevant case events.

**Rationale:** Learners should be able to think messily without creating a
permanent record, while committed practice evidence must survive so Progress
can identify recurring problems.

**Data boundary:**

- Never persist scratchpad text to Supabase.
- Persist a generated answer only after the learner explicitly commits it.
- Label whether each diagnostic came from an objective system rule or a learner
  self-check.
- Preserve the original and each retry as an append-only revision chain.
- Continue using retry-safe attempt IDs and user-scoped row-level security.

### D4. Scaffolding levels

**Decision:** Define `beginner`, `intermediate`, and `interview` in the domain
model now. Pilot reduced scaffolding on selected cases instead of converting the
whole platform. Full Interview Mode remains deferred.

**Level contract:**

| Level | Before commitment | After commitment | Feedback timing |
| --- | --- | --- | --- |
| `beginner` | Guided fields, limited prompts, and optional hints; no strong answer is revealed | Structured self-check, authored comparison, diagnostics, retry | Immediate |
| `intermediate` | Learner generates the response with labels only; no choices or example answer | Structured self-check, authored comparison, diagnostics, retry | Immediate at checkpoints |
| `interview` | Prompt and neutral workspace only; learner controls the reasoning sequence | Review artifacts are available only at defined case checkpoints or completion | Delayed by default |

**Architecture requirement:** Scaffolding is attempt metadata and authored
content configuration, not inferred from case difficulty. The data model must
support all three values even where the Wave 1 UI exposes only a controlled
pilot.

**Deferred from full Interview Mode:** Timer-led simulation, unrestricted case
navigation, end-only feedback across every step, and spoken evaluation.

### D5. Case Opening & Clarification is skill six

**Decision:** Add `Case Opening & Clarification` as the sixth trainable skill in
Wave 1.

**Behavior covered:** Restating the objective, resolving material ambiguity,
identifying constraints, choosing high-information questions, and avoiding
question overload.

**Scoring rule:** Structured or objectively verifiable portions may receive
deterministic outcomes. Generated restatements and questions follow D2 and
produce diagnostic evidence rather than semantic scores.

### D6. Hypothesis behavior is embedded and tracked

**Decision:** Hypothesis formation and updating enter Wave 1 as a cross-case
behavior. It is tracked and diagnosable, but it is not a standalone drill skill
or a seventh readiness score in this wave.

**Required checkpoints:** Initial hypothesis after the framework and at least
one evidence-linked update before recommendation in each upgraded pilot case.
The learner may retain, revise, or reject the hypothesis, but must state why.

**Deferred to Wave 2:** Standalone brainstorming and market-sizing training.

### D7. Wave 1 pilot cases

**Decision:** Upgrade these three cases:

| Case | Role | Scaffolding intent |
| --- | --- | --- |
| AlpineFit | Beginner teaching case | Guided opening and checkpoints; immediate comparison and retry |
| PayPilot | Intermediate strategic-comparison case | Learner-generated criteria and hypothesis updates before authored comparison |
| GoldenLoaf | Lower-scaffolding transfer case | Minimal prompts, process reasoning, and delayed checkpoint support; uses the `interview` scaffolding contract without claiming to be full Interview Mode |

**Rationale for GoldenLoaf:** It tests nontrivial process and business reasoning
and prevents the pilot from becoming overly quantitative.

**Non-pilot cases:** NorthStar, FleetFix, and MorningJet remain available on
their current V1 interaction model in Wave 1. They are not silently relabeled
as V2 practice.

### D8. V1 and V2 history are strictly separated

**Decision:** Preserve all V1 progress as legacy scoring. Add explicit
`scoringVersion`, `contentVersion`, and `scaffoldingLevel` metadata. V1 results
must not feed V2 readiness, trends, weakness detection, or next-practice
recommendations.

**Display rule:** Progress may show a clearly labeled Legacy V1 section, but V1
and V2 values must not share a trend line, average, readiness label, or
recommendation algorithm.

**Compatibility rule:** Existing rows without version metadata are interpreted
as V1 by readers; they are not destructively rewritten.

### D9. Stage drill authoring behind an AlpineFit playtest gate

**Decision:** Do not author all 18 V2 pilot drills before validating the
learning interaction. First create one high-quality V2 rep for each of the six
skills, complete the AlpineFit V2 vertical slice, and stop for playtesting and
owner review. Author the remaining 12 drills only after the owner approves the
learning cycle based on that evidence.

**Rationale:** The dominant remaining risk is learning quality, not technical
feasibility. Multiplying an unvalidated Generate → Commit → Self-check → Compare
→ Diagnose → Retry design across 18 exercises would make weak interaction
choices more expensive to correct.

**Rejected approach:** Building three drills per skill before the first complete
case-based playtest. It offers more content but does not reduce the main risk.

**Consequences:**

- The first validation cohort contains exactly six drills, one per skill, plus
  AlpineFit V2.
- The implementation must stop after the AlpineFit vertical slice even if later
  tasks are technically unblocked.
- The playtest must evaluate learning quality, not merely correctness or test
  coverage.
- The remaining 12 drills, PayPilot, and GoldenLoaf require an explicit
  post-playtest proceed decision.

### Post-Task-11 gate record: revise and replaytest

**Owner decision:** `revise and replaytest`.

The first owner playtest did not authorize Task 12. It found that another
learning-quality test would be distorted by generic quantitative corrections,
predictable choice positions, unclear framework-builder language, missing case
tool onboarding, small answer targets, limited scratchpad behavior, and several
visual inconsistencies.

The authorized remediation pass is limited to the existing Stage-One product:

- educational post-grade quantitative correction without pre-commit answer
  reveal;
- stable session-level choice shuffling with ID-based scoring;
- clearer framework hierarchy, prioritization meaning, and learner language;
- optional, skippable, reopenable case-tool onboarding;
- larger answer targets and note-like private scratch behavior; and
- repeat-use homepage, typography, and accessible unit-picker cleanup.

The remediation does not expand the case or drill set. Task 12, the remaining
twelve V2 drills, PayPilot V2, GoldenLoaf V2, and all later work remain blocked
until the owner re-playtests and explicitly records `proceed`. A `revise again`
decision authorizes only another Stage-One remediation pass.

## Wave 1 P0 Preconditions

These defects and data protections must be completed before collecting or
interpreting pilot results.

### P0-A. Reachable exhibit interpretation

The full-case UI must collect a committed exhibit interpretation and emit the
event used by deterministic exhibit scoring. New pilot results cannot be
trusted while the exhibit score is unreachable through the learner journey.

The learner must generate an interpretation before authored insights are
revealed. Existing authored insight strengths may be used only after commitment
through a structured comparison/self-check flow.

### P0-B. Preserve framework reasoning

Case events must retain the submitted framework tree, sibling order, selected
priority, and learner rationale. Scoring and replay must consume the preserved
tree instead of reconstructing every concept as a top-level branch.

Backward-compatible replay must still accept legacy events that contain only
flattened `conceptIds`.

### P0-C. Version content before editing pilots

Case attempts and events must be bound to an immutable case/content version
before AlpineFit, PayPilot, or GoldenLoaf definitions change. Historical
attempts must never be replayed or rescored against a newer definition.

If the exact historical definition is unavailable, the product must show a
safe historical summary and explain that detailed replay is unavailable; it
must not substitute current content.

## Wave Boundaries

### Wave 1 — approved planning scope

- Versioned V2 learning, event, and persistence contracts.
- Generate/commit/self-check/compare/diagnose/retry interaction foundation.
- Reachable full-case exhibit interpretation.
- Preserved framework tree, order, priority, and rationale.
- Case Opening & Clarification as skill six.
- Embedded hypothesis formation and updating.
- Diagnostic taxonomy and coaching-oriented V2 Progress.
- Explicit scaffolding levels and the three-case pilot.
- A staged V2 drill set: first six high-quality reps, one per skill, followed by
  AlpineFit and a mandatory playtest/review gate; the remaining 12 pilot drills
  are authored only after that gate is approved.
- Existing V1 content remains identifiable as legacy.

### Wave 2 — explicitly deferred

- Standalone brainstorming and market sizing.
- Full mid-case synthesis curriculum.
- Spoken structures/recommendations and self-review.
- Full timed Interview Mode.
- Harder exhibits, mental math, and ambiguous prompts across all current cases.
- Conversion of all remaining V1 lessons, drills, and cases.

### Wave 3 — explicitly deferred

- Expansion toward 15–20 cases.
- M&A/investment, product launch, competitive response, public-sector/nonprofit,
  and dedicated market-sizing cases.
- Case variants, spaced review, mixed practice, and broader transfer systems.

## Accepted Phase 1 Dispositions

| Audit finding | Decision |
| --- | --- |
| Existing deterministic engine, answer secrecy, auth/RLS, retry-safe saves, responsive behavior, and accessibility | Keep |
| Concise lessons and skill-isolation philosophy | Keep |
| Framework builder, event replay, formula engine, exhibits, and recommendation evidence model | Adapt, not replace |
| Choice-first prioritization, exhibit interpretation, synthesis, and clarification as primary interactions | Replace in V2 pilot flows with generate-first interactions |
| Quantitative numeric entry | Keep exact checking; add setup, unit, sense-check, and implication diagnostics |
| Current recommendation builder | Keep as deterministic evidence capture after a generated recommendation commitment |
| Existing six case concepts and validated calculations | Keep; only three cases are edited in Wave 1 |
| Alternate paths that are merely reordered | Upgrade pilot content to support materially different hypotheses where defensible |
| Generic case feedback and AlpineFit-specific copy | Replace with taxonomy-backed, case-appropriate diagnostics |
| Raw-score Progress and always-AlpineFit recommendation | Replace for V2; preserve in a labeled legacy view |
| Guest session storage | Keep for Wave 1, including private scratch behavior |
| Signed-in event storage without historical event reads | Adapt so V2 committed evidence and version-safe replay can be retrieved |

## Non-Negotiable Validation Rules

- Generated text is never semantically scored by string matching, keywords,
  answer length, or hidden heuristics presented as quality assessment.
- Authored answers remain server-hidden until the learner commits.
- Every durable diagnostic records its source: `system` or `self_assessment`.
- Every V2 attempt records scoring, content, and scaffolding versions.
- Every pilot definition change increments its immutable content version.
- V1 readers and rows remain valid after forward migrations.
- Scratch work remains outside durable attempt/event storage.
- Progress never blends V1 and V2 evidence.

## Approval Gate

This ledger and the implementation plan derived from it are approved with the
staged-drill amendment in D9. Implementation is deliberately paused by the
owner. No V2 product work begins until the owner gives a separate instruction
to start. Once work begins, it must stop again after the six initial reps and
AlpineFit V2 for the required playtest/review gate.
