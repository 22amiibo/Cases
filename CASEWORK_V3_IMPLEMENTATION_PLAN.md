# Casework V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans` to
> implement this plan task by task. Track work with the checkboxes in this file.

Status: Approved for V3.0 implementation on 2026-09-18. Production database
migration and deployment remain separately gated.

Prepared: 2026-09-17

**Goal:** Add one connected, deterministic learning loop: learn a concept,
practice it, apply it in a case, review the reasoning, diagnose a weakness, and
practice again.

**Architecture:** Preserve the released V1/V2 content, event streams, attempts,
and replay behavior. Add a separate V3 activity aggregate, then connect it to
the existing case engine through explicit mode policy, exact-version history,
and explainable progress recommendations. V3.0 proves the architecture with
four labs, AlpineFit, and one Profitability course before later releases add
more interaction families or content.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, Supabase
Postgres/RLS, Vitest, Testing Library, Playwright, and axe.

**Specification:** Product requirements and decisions are included in Sections
1-12 of this document so the plan remains self-contained.

## Authorization boundary

- V2 is released at commit `c9dde86b0529901a7bcee801fcb8e070f72b8b86`.
- Production migrations `001` through `003` are applied.
- The production application is `https://cases-pi-five.vercel.app`.
- V2 Tasks 1-17, the owner gate, release verification, and the final wrong-unit
  retry fix are complete.
- The active worktree may contain the pre-existing untracked paths
  `src/content/drills/quantitative 2.json` and `supabase/.temp/`. Never edit,
  stage, delete, or commit them.
- The owner authorized V3.0 implementation on 2026-09-18. Work runs on
  `feature/casework-v3` in `.worktrees/casework-v3` from the reviewed plan
  commit `10f3fcb`.
- Each production migration and deployment requires separate owner approval.
- New V3 activity, lesson, and course definitions start at `contentVersion: 3`.
  Reused V2 lessons and AlpineFit retain their recorded version 2.

## 1. Release sequence

V3 ships as three cumulative releases. Only V3.0 is implementation-planned in
detail here. Write a fresh implementation plan for V3.1 after V3.0 production
evidence exists, and another for V3.2 after V3.1 evidence exists.

### V3.0: Profitability learning loop

- Four public labs: Clarifying, Exhibit Analysis, Brainstorming, and Hypothesis.
- A versioned activity engine and exact-version activity history.
- AlpineFit content version 2 in Practice Mode and Interview Mode.
- Chronological case replay and evidence-backed debrief.
- V3 Progress with Continue, Recommended Next, Quick Practice, Skills Snapshot,
  and Recent Activity.
- One complete Profitability course built from exact lesson, activity, and case
  references.
- Primary navigation: Learn, Practice, Cases, Progress.

### V3.1: Practice expansion

After V3.0 release and review, add Structuring, Case Math, Market Sizing,
Synthesis, and Recommendation labs. Start with one reviewed activity per lab.
Add transfer repetitions only after each interaction passes focused playtesting.

### V3.2: Learn expansion

After V3.1 release and review, add short industry primers and Growth, Market
Entry, Pricing, and Operations courses using exact existing resources. Keep M&A
unpublished until a credible capstone exists. Do not show empty categories or
“coming soon” cards.

## 2. Global constraints

- No runtime AI, embeddings, semantic grading, or hidden heuristic grading.
- Objective facts may be scored. Generated prose uses structured self-checks
  and clearly labeled authored comparisons.
- Preserve Generate → Commit → Self-check → Compare → Diagnose → Retry.
- Never expose authored answers, classifications, efficient paths, or
  correctness metadata before commitment or case completion, as applicable.
- Scratchpad and uncommitted draft text stay in browser session storage.
- Persist committed work, immutable attempt evidence, diagnostics, and ordered
  events only.
- Resolve historical work against its recorded content version. Unknown or
  retired versions fail safely; never substitute active content.
- Keep V1, V2, and V3 progress semantics separate. No old numeric score becomes
  V3 evidence.
- Extend storage additively. Do not rewrite historical rows.
- Keep `CaseMode` separate from V2 `ScaffoldingLevel`. The V2 value
  `scaffoldingLevel: "interview"` is not V3 Interview Mode.
- Reuse current version registries, learning cycle, case engine, learner-safe
  projections, framework builder, exhibit renderer, calculation and
  recommendation components, repository patterns, and pending-attempt recovery.
- Do not add dependencies unless the existing platform cannot meet a confirmed
  requirement.
- Accessibility, keyboard use, touch equivalents, 320px reflow, recovery, RLS,
  and answer secrecy are release requirements.

## 3. Product shape

### Learn

Learn contains concise lessons and the Profitability course. Every lesson ends
with one exact activity reference. Course and standalone launches resolve the
same activity definition and content version.

### Practice

Practice is the new learner-facing name for skill work. `/drills` and
`/drills/[skill]` remain valid during rollout, either as Legacy V1/V2 views or
redirects that preserve deep-link meaning. Each lab shows its purpose,
available repetitions, difficulty, estimated time, recent attempts, and one
primary start/continue action.

### Cases

Cases retain the authored investigation graph. `practice` and `interview` are
run policies over one exact case definition; they are not copied content files.
AlpineFit V2 is the only required dual-mode case in V3.0.

### Progress

Progress answers, in order:

1. What can I continue?
2. What should I do next?
3. What can I practice quickly?
4. Which skills need work?
5. What did I complete recently?

It does not publish a composite readiness score.

## 4. Stable taxonomies

Define V3 IDs in `src/core/v3-taxonomy.ts`. Do not widen the existing
`SkillIdSchema` or `V2SkillIdSchema`; those schemas protect legacy persistence
and scoring contracts. Export the existing `IdentifierSchema` from
`src/core/schema.ts` without changing its validation so V3 does not copy the
stable-ID rule.

```ts
export const V3SkillIdSchema = z.enum([
  "clarification",
  "structure",
  "prioritization",
  "brainstorming",
  "hypothesis",
  "exhibit",
  "quantitative",
  "market_sizing",
  "synthesis",
  "recommendation",
]);

export const SkillLabIdSchema = z.enum([
  "clarifying",
  "structuring",
  "brainstorming",
  "hypothesis",
  "exhibit",
  "case_math",
  "market_sizing",
  "synthesis",
  "recommendation",
]);

export const CaseTypeIdSchema = z.enum([
  "profitability",
  "growth",
  "market_entry",
  "pricing",
  "m_and_a",
  "operations",
]);

export const IndustryIdSchema = z.enum([
  "fitness",
  "airlines",
  "restaurants",
  "saas",
  "manufacturing",
  "automotive_services",
]);

export const DifficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

export const CaseModeSchema = z.enum(["practice", "interview"]);
```

Use one `hypothesis` skill because the product has one Hypothesis lab and one
learner-facing progress area. Formation and updating remain separate diagnostic
behaviors. Map existing V2 hypothesis diagnostic codes to the V3 `hypothesis`
skill without relabeling historical attempts.

Keep `prioritization` queryable as durable evidence even though V3 has no
required standalone Prioritization lab.

Labels are presentation data and may change without changing IDs. A content
item has one primary skill and zero or more secondary skills. Only declared,
observed evidence affects progress.

Keep immutable case definitions unchanged. Add a sidecar registry in
`src/content/cases/metadata.ts`, keyed by exact `(caseId, contentVersion)`:

```ts
export const CaseMetadataSchema = z.object({
  caseId: IdentifierSchema,
  contentVersion: z.number().int().positive(),
  industryId: IndustryIdSchema,
  estimatedMinutes: z.number().int().positive(),
  practicedSkillIds: z.array(V3SkillIdSchema).min(1),
  supportedModes: z.array(CaseModeSchema).min(1),
});
```

V3.0 metadata covers all six active case definitions. Every case supports
`practice`; only AlpineFit content version 2 supports `interview`. Registry
validation requires the exact case definition to exist. This provides filters
without changing historical content hashes.

## 5. V3 activity contracts

Create `src/core/activity.ts` for the V3.0 schema and pure state transitions.
Split it only if the file becomes difficult to review. Do not pre-create V3.1
formula or market-sizing interaction code.

```ts
export const ActivityDefinitionSchema = z.object({
  id: IdentifierSchema,
  contentVersion: z.number().int().positive(),
  eventSchemaVersion: z.literal(3),
  scoringVersion: z.literal("v3"),
  status: z.enum(["draft", "active", "retired"]),
  title: z.string().min(1),
  labId: SkillLabIdSchema,
  primarySkillId: V3SkillIdSchema,
  secondarySkillIds: z.array(V3SkillIdSchema),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().positive(),
  caseTypeIds: z.array(CaseTypeIdSchema),
  industryIds: z.array(IndustryIdSchema),
  interaction: ActivityInteractionSchema,
  feedback: ActivityFeedbackDefinitionSchema,
  takeaway: z.string().min(1),
});

export const CourseContextSchema = z.object({
  courseId: IdentifierSchema,
  courseVersion: z.number().int().positive(),
  courseStepId: IdentifierSchema,
});

export const V3DiagnosticOutcomeSchema = z.object({
  code: IdentifierSchema,
  skillId: V3SkillIdSchema,
  source: z.enum(["system", "self_assessment"]),
  severity: z.enum(["strength", "coaching", "blocking"]),
});

export const V3SkillEvidenceSchema = z.object({
  skillId: V3SkillIdSchema,
  source: z.enum(["activity", "case"]),
  contextId: IdentifierSchema,
  difficulty: DifficultySchema,
  reviewed: z.boolean(),
  retryOrTransfer: z.boolean(),
  objectiveChecks: z.array(z.object({
    id: IdentifierSchema,
    passed: z.boolean(),
  })),
  diagnosticCodes: z.array(IdentifierSchema),
});
```

V3.0 supports only interaction variants needed by its four labs:

- `single_select`
- `multi_select`
- `ranking`
- `categorization`
- `generated_response`
- `brainstorm_builder`
- `hypothesis_sequence`
- `exhibit_chain`

The first four use generic data-driven controls. The final four may use focused
components behind one activity-shell contract. Drag and drop is optional; every
operation must also work through buttons, selects, or native keyboard controls.

Every activity definition must validate:

- unique `(id, contentVersion)` and active-version selection;
- registered taxonomy IDs;
- unique interaction-local IDs;
- valid authored references;
- diagnostics owned by a declared skill;
- one feedback path for every legal evaluated outcome; and
- a learner projection that omits answers and classifications before commit.

Use ordered immutable events. Each event has `eventId`, `type`, and nonnegative
`atMs`; the database sequence remains authoritative. Persist learner decisions,
not copies of authored answer keys. The V3.0 event union covers activity start;
selection, ranking, categorization, brainstorm, hypothesis, exhibit, and
generated-response commits; self-check commits; authored-comparison views;
retry/skip decisions; takeaway views; and completion. Each interaction commit
contains its interaction ID and learner payload. Completion contains no answer
key or derived feedback copy.

```ts
export type ActivityAttempt = {
  attemptId: string;
  userId: string;
  activityId: string;
  contentVersion: number;
  eventSchemaVersion: 3;
  scoringVersion: "v3";
  startedAt: string;
  completedAt: string;
  primarySkillId: V3SkillId;
  skillEvidence: V3SkillEvidence[];
  diagnostics: V3DiagnosticOutcome[];
  courseContext: CourseContext | null;
  events: ActivityEvent[];
};
```

`ActivityEvent`, `CourseContext`, `V3SkillEvidence`, and
`V3DiagnosticOutcome` are the inferred types from the schemas in this module.
The activity registry validates every diagnostic code against one V3 diagnostic
definition containing owning skill, learner copy, rationale, severity, allowed
sources, recommended activity target, and optional superseding strength code.

Activity states are `context`, `interaction`, `feedback`, `takeaway`, and
`complete`. Generated responses embed the existing stricter V2 learning cycle
inside `interaction`. Invalid transitions throw and API handlers return a safe
4xx response.

Server modules own complete definitions. Client components receive only a
learner-safe projection. The commit endpoint resolves the exact definition on
the server and returns the post-commit reveal. No complete definition may be
imported by a `"use client"` module.

## 6. Feedback and evidence

Feedback may include objective checks; authored `strong`, `reasonable`, `weak`,
`premature`, `unsupported`, or `redundant` classifications; system diagnostics;
explicitly labeled self-assessment diagnostics; one general principle; and one
better next action.

Every result explains:

1. What happened.
2. Why it matters.
3. Which principle applies.
4. What to try next.

Do not score free text by keywords, response length, regex matches, or hidden
pseudo-semantic rules.

The four V3.0 labs start with these stable codes. Reused V2 codes keep their
existing spelling; the compatibility map changes ownership, not history.

| Skill | Initial codes |
| --- | --- |
| Clarification | `objective_not_reframed`, `material_term_unresolved`, `constraint_missed`, `low_value_question`, `question_overload`, `strong_opening` |
| Exhibit | `observation_error`, `comparison_missed`, `implication_missing`, `next_test_missing`, `strong_exhibit_chain` |
| Brainstorming | `brainstorm_breadth_narrow`, `brainstorm_categories_overlap`, `brainstorm_idea_redundant`, `brainstorm_off_objective`, `brainstorm_priority_missing`, `strong_brainstorm` |
| Hypothesis | `hypothesis_missing`, `evidence_link_missing`, `update_missing`, `contradicted_hypothesis_retained`, `strong_hypothesis_update` |

Objective selections and authored classifications may produce system findings.
Quality claims about learner-written restatements, implications, ideas, or
rationales may only produce labeled self-assessment findings.

V3 evidence states are:

- `Not started`: no reviewed V3 evidence.
- `Needs practice`: a blocking diagnostic recurs in at least two of the last
  three applicable attempts, or the two latest objective checks fail.
- `Developing`: reviewed evidence exists but consistency criteria are unmet.
- `Consistent`: at least three reviewed attempts, at least one retry or
  transfer/full-case attempt, evidence from at least two contexts or difficulty
  levels, and no blocking diagnostic repeated across the last three applicable
  attempts.

Keep these thresholds in a frozen, tested policy object, not page components.

## 7. Case modes and replay

Add a policy type without renaming or reusing `ScaffoldingLevel`:

```ts
export type CaseRunContext = {
  mode: "practice" | "interview";
  contentVersion: number;
};

export type CaseModePolicy = {
  showHints: boolean;
  allowCheckpointRetry: boolean;
  showImmediateFeedback: boolean;
  allowEvidenceReview: boolean;
  allowBacktracking: boolean;
  timer: "none" | "count_up" | "count_down";
  finalRecommendationSeconds: number | null;
};

export function getCaseModePolicy(mode: CaseMode): CaseModePolicy;
```

Practice Mode preserves current AlpineFit behavior. Interview Mode has a visible
timer, no hints, no checkpoint retry, no immediate correctness display, limited
backtracking enforced by the engine, and debrief only after completion.

AlpineFit remains case content version 2. Its existing event schema remains 2
unless an event payload actually changes. `scoringVersion: "v3"` and persisted
`caseMode` identify the new run semantics; version numbers must not be bumped
merely to make them match.

Extend existing legality functions to accept `CaseRunContext`. Do not fork the
case engine. API projections and commit handlers must both apply mode policy;
UI-only hiding is insufficient.

Build replay as a pure projection over the exact definition and stored ordered
events:

```ts
export function buildCaseReplayTimeline(
  definition: CaseDefinition,
  attempt: CaseAttempt | V3CaseAttempt,
): CaseReplayEntry[];
```

Entries connect the decision, evidence available at that moment, learner
interpretation, resulting next decision, and post-completion diagnostic. Derive
authored evidence reveals from the definition instead of duplicating them in
events. If historical content is unavailable, show attempt metadata and raw
learner submissions with a clear limitation; never load the active version.

## 8. Persistence design

Create `supabase/migrations/004_v3_learning.sql` only after the V3.0 contract
tests pass. The migration is additive but must replace the current
`case_attempts_v2_metadata_check` with an explicit V1/V2/V3 compatibility check.
Do not broaden `is_valid_skill_scores`; V3 evidence is not a new legacy numeric
score.

Add:

### `activity_attempts`

- `id uuid primary key`
- `user_id uuid not null`
- `activity_id text not null`
- `content_version integer not null check (content_version > 0)`
- `event_schema_version integer not null check (event_schema_version = 3)`
- `scoring_version text not null check (scoring_version = 'v3')`
- `primary_skill_id text not null`
- `skill_evidence jsonb not null check (jsonb_typeof(skill_evidence) = 'array')`
- `diagnostics jsonb not null check (jsonb_typeof(diagnostics) = 'array')`
- nullable `course_id`, `course_version`, and `course_step_id`, constrained to be
  all null or all non-null
- `started_at timestamptz not null`
- `completed_at timestamptz not null`
- `created_at timestamptz not null default now()`
- unique `(id, user_id)` for composite child ownership

### `activity_events`

- `activity_attempt_id uuid not null`
- `user_id uuid not null`
- `sequence integer not null check (sequence >= 0)`
- `event_id text not null`
- `event jsonb not null`
- unique `(activity_attempt_id, sequence)`
- unique `(activity_attempt_id, event_id)`
- composite foreign key `(activity_attempt_id, user_id)` with cascade delete

### `course_enrollments`

- `(user_id, course_id, course_version)` primary key
- `started_at`, `last_activity_at`, and `last_step_id`
- no completed-step count

### `course_step_events`

- immutable evidence for `lesson_viewed`
- `user_id`, `course_id`, `course_version`, `course_step_id`, exact lesson ID and
  version, and `occurred_at`
- unique `(user_id, course_id, course_version, course_step_id, event_type)`

Extend `case_attempts` with nullable `case_mode`, `course_id`, `course_version`,
`course_step_id`, and V3 evidence/diagnostic JSON. Historical V1/V2 rows keep
null V3 columns. A V3 case row requires exact version metadata and `case_mode`.

Create one transactional, authenticated activity-save RPC that inserts the
attempt and its ordered events idempotently. It must verify `auth.uid()`, reuse
the stable attempt ID, reject malformed arrays, tolerate an identical retry
without duplicating events, and reject a retry whose metadata or event payload
differs. Add a parallel V3 case-save RPC for the new mode, course, and evidence
columns; leave `save_case_attempt_v2` unchanged. Add user-ownership RLS policies
to all four new tables and indexes for recent history.

V3.0 does not add a server-side `learning_runs` table. Existing session-storage
recovery keeps drafts private and handles refresh. “Continue” means the next
incomplete course step or a locally recoverable activity/case. Add durable
cross-device mid-activity runs only after a confirmed product requirement and
a separate privacy design.

Extend repository behavior through focused interfaces while retaining
`PracticeRepository` as the V1/V2 compatibility facade:

```ts
export interface ActivityAttemptRepository {
  saveActivityAttempt(attempt: ActivityAttempt): Promise<void>;
  getActivityAttempt(userId: string, attemptId: string): Promise<ActivityAttempt | null>;
  listActivityAttempts(userId: string): Promise<ActivityAttempt[]>;
}

export interface V3CaseAttemptRepository {
  saveV3CaseAttempt(attempt: V3CaseAttempt): Promise<void>;
}

export interface CourseRepository {
  enroll(userId: string, courseId: string, courseVersion: number): Promise<void>;
  recordLessonViewed(event: CourseStepEvent): Promise<void>;
  listCourseEvidence(userId: string): Promise<CourseEvidence>;
}

export type V3Repository = ActivityAttemptRepository &
  V3CaseAttemptRepository & CourseRepository & PracticeRepository;
```

The new supporting types are explicit and separate from the legacy attempt
union:

```ts
export type V3CaseAttempt = {
  attemptId: string;
  userId: string;
  caseId: string;
  contentVersion: number;
  eventSchemaVersion: 2;
  scoringVersion: "v3";
  scaffoldingLevel: "beginner" | "intermediate" | "interview" | null;
  caseMode: "practice" | "interview";
  completedAt: string;
  skillScores: Partial<Record<SkillId, number>>;
  feedbackCodes: string[];
  skillEvidence: V3SkillEvidence[];
  diagnostics: V3DiagnosticOutcome[];
  courseContext: CourseContext | null;
  events: CaseEvent[];
};

export type CourseStepEvent = {
  eventType: "lesson_viewed";
  userId: string;
  courseId: string;
  courseVersion: number;
  courseStepId: string;
  lessonId: string;
  lessonVersion: number;
  occurredAt: string;
};

export type CourseEvidence = {
  enrollments: CourseEnrollment[];
  lessonEvents: CourseStepEvent[];
  activityAttempts: ActivityAttempt[];
  caseAttempts: V3CaseAttempt[];
};

export type CourseEnrollment = {
  userId: string;
  courseId: string;
  courseVersion: number;
  startedAt: string;
  lastActivityAt: string;
  lastStepId: string;
};
```

Guest implementations use session storage behind the same interfaces. Auth
changes clear in-memory state before loading the next identity. Pending state
is cleared only after the immutable attempt and all events are confirmed saved.

## 9. Course contracts

Create versioned static definitions under `src/content/courses/`:

```ts
export type CourseDefinition = {
  id: string;
  contentVersion: number;
  title: string;
  caseTypeId: CaseTypeId;
  difficulty: "beginner" | "intermediate";
  estimatedMinutes: number;
  steps: CourseStep[];
};

export type CourseStep = {
  id: string;
  title: string;
  resource:
    | { type: "lesson"; id: string; contentVersion: number }
    | { type: "activity"; id: string; contentVersion: number }
    | { type: "case"; id: string; contentVersion: number; mode: "practice" };
  completionRule: "viewed" | "completed";
};
```

Validate every exact resource reference. Retired resources remain resolvable
for history but cannot enter a new active course. A course activity URL carries
`version`, `course`, `courseVersion`, and `step` query parameters; the completion
handler resolves the course definition and rejects mismatched context before
persisting it.

Course completion is derived:

- lesson: matching immutable `lesson_viewed` course-step event;
- activity: completed exact activity attempt with matching course context;
- case: completed exact case attempt with matching course context and mode.

Independent practice does not complete a course step unless a future course
version explicitly declares equivalent prior work.

The V3.0 Profitability course has nine resource steps. The full AlpineFit case
is the integrated scenario, so a second miniature capstone is unnecessary. The
course completion page provides the debrief and next-practice action:

1. New exact lesson: how profitability cases work.
2. New exact lesson: revenue, price, volume, fixed cost, and variable cost.
3. AlpineFit Clarifying activity.
4. Profit-driver Brainstorming activity.
5. Existing `structuring` lesson, content version 2.
6. Existing `quantitative-implication` lesson, content version 2.
7. AlpineFit Exhibit Analysis activity.
8. AlpineFit Hypothesis activity.
9. AlpineFit content version 2 in Practice Mode.

The course must not depend on V3.1 lab pages or V3.2 content.

## 10. Recommendations

Choose one primary action in this order:

1. Resume a locally recoverable unfinished run.
2. Continue the current course's next required step.
3. Address a recurring blocking diagnostic.
4. Address the most recent unresolved coaching diagnostic.
5. Add missing transfer evidence for a Developing skill.
6. Offer a short unpracticed active lab.

Tie-break by recency, severity, active activity availability, and lower
estimated time. Do not repeat the exact completed activity when an active
transfer activity targets the same diagnostic. The UI states the evidence used
to choose the recommendation.

## 11. Routes

```text
/
/learn
/learn/lessons/[lessonId]
/learn/courses/[courseId]
/practice
/practice/[labId]
/practice/activities/[activityId]
/practice/attempts/[attemptId]
/drills                                  # compatibility
/drills/[skill]                          # compatibility
/cases
/cases/[caseId]
/cases/[caseId]/review                   # current session
/cases/[caseId]/attempts/[attemptId]     # historical
/progress
/progress/history
```

Use the existing repository and authenticated browser session for owned history
reads. Do not add a duplicate history API merely to mirror repository methods.
Activity session and commit endpoints are required because they protect hidden
definition data.

## 12. V3.0 content acceptance

The first public activities reuse the AlpineFit learning context so the course,
labs, case, replay, and recommendation form one coherent loop:

- Clarifying: adapt the exact AlpineFit V2 opening and authored interviewer
  responses into an activity wrapper.
- Exhibit Analysis: use AlpineFit's cost-category evidence and require Observe
  → Prioritize → Interpret → Act.
- Brainstorming: generate, organize, deduplicate, and prioritize plausible
  AlpineFit profit drivers; breadth is based on authored category coverage, not
  raw item count.
- Hypothesis: form a starting claim, reveal authored AlpineFit evidence, then
  retain/revise/reject with cited evidence across at least two evidence rounds.

Before each definition is marked active, its fixtures must cover a strong path,
a defensible reasonable path, and a weak path; exact diagnostics and feedback;
commit-before-reveal; retry; refresh; and save retry.

## 13. V3.0 implementation tasks

Every task ends with a reviewable commit and the focused tests named below.
Run `git diff --check` before every commit. Do not stage the two protected
untracked paths.

### Task 0: Create the approved V3 worktree and freeze compatibility

**Files:**

- Create: `src/core/v3-compatibility.test.ts`
- Create: `src/fixtures/v3-baseline/` only for small stable serialized fixtures
- Modify: `PROJECT_CONTEXT.md`, `TASK_STATE.md`

**Produces:** A clean V3 branch, recorded baseline commit, active case-version
map, migration list, test counts, and representative V1/V2 parse/replay hashes.

- [x] After owner approval, create a V3 branch/worktree from `c9dde86` or the
  newer explicitly approved production commit.
- [x] Assert the six active case IDs and versions: AlpineFit 2, NorthStar 1,
  FleetFix 1, PayPilot 2, GoldenLoaf 2, MorningJet 1.
- [x] Add representative V1 and V2 attempt/event parsing fixtures and replay
  output fixtures. Hash stable authored definitions only if the serialization
  order is controlled.
- [x] Run `npm test -- src/core/v3-compatibility.test.ts` and confirm green.
- [x] Run the full V2 gate and record exact counts in `PROJECT_CONTEXT.md`.
- [ ] Commit `test: freeze v3 compatibility baseline`.

### Task 1: Add V3 taxonomies without widening legacy schemas

**Files:**

- Create: `src/core/v3-taxonomy.ts`
- Create: `src/core/v3-taxonomy.test.ts`
- Modify: `src/core/schema.ts` and its tests only to export the existing
  `IdentifierSchema`
- Create: `src/content/cases/metadata.ts`
- Create: `src/content/cases/metadata.test.ts`

**Produces:** `V3SkillIdSchema`, `SkillLabIdSchema`, `CaseTypeIdSchema`,
`IndustryIdSchema`, `DifficultySchema`, `CaseModeSchema`, labels, the
V2-diagnostic-to-V3-skill compatibility map, and exact sidecar metadata for all
six active cases.

- [x] Write failing tests for every accepted ID, unknown-ID rejection, unique
  labels, one `hypothesis` skill, and unchanged legacy `SkillIdSchema` behavior.
- [x] Write failing metadata tests for exact case lookup, all six active cases,
  positive duration, registered industries/skills, Practice support everywhere,
  and Interview support only on AlpineFit V2.
- [x] Run `npm test -- src/core/v3-taxonomy.test.ts src/core/schema.test.ts` and
  confirm the new module is missing.
- [x] Implement the constants and schemas exactly as Section 4 defines.
- [ ] Run the focused tests and commit `feat: define casework v3 taxonomies`.

### Task 2: Define versioned activity and course schemas

**Files:**

- Create: `src/core/activity.ts`
- Create: `src/core/activity.test.ts`
- Create: `src/core/v3-diagnostics.ts`
- Create: `src/core/v3-diagnostics.test.ts`
- Create: `src/core/course.ts`
- Create: `src/core/course.test.ts`
- Create: `src/content/activities/index.ts`
- Create: `src/content/courses/index.ts`

**Consumes:** Task 1 taxonomy schemas and `createVersionedRegistry`.

**Produces:** V3.0 interaction/event/attempt schemas, diagnostic definitions,
active and exact-version registries, course schemas, and exact
resource-reference validation.

- [ ] Write failing schema tests for duplicate IDs/versions, unknown taxonomy
  values, duplicate interaction IDs, invalid references, retired active content,
  all-or-none course context, and unknown exact course resources.
- [ ] Write diagnostic registry tests for unique codes, declared skill
  ownership, allowed source/severity combinations, active recommendation
  targets, and optional superseding strength codes.
- [ ] Add only the eight V3.0 interaction variants from Section 5.
- [ ] Reuse `createVersionedRegistry`; do not create a second registry class.
- [ ] Add one test-only definition in the test file, not public content.
- [ ] Run `npm test -- src/core/activity.test.ts src/core/course.test.ts
  src/content/versioned-registry.test.ts`.
- [ ] Commit `feat: define versioned v3 activity contracts`.

### Task 3: Implement the pure activity engine and learner projection

**Files:**

- Modify: `src/core/activity.ts`
- Modify: `src/core/activity.test.ts`
- Create: `src/core/activity-projection.ts`
- Create: `src/core/activity-projection.test.ts`

**Produces:** `createActivityState`, `applyActivityEvent`,
`projectLearnerActivity`, and `evaluateActivityCompletion`.

- [ ] Write failing tests for the legal outer flow, illegal transition
  rejection, event ordering, retry revision linkage, deterministic completion,
  and unknown version failure.
- [ ] Write leakage tests that recursively inspect the pre-commit projection for
  authored answers, strengths, classifications, and diagnostic outcomes.
- [ ] Implement pure transitions and projection with no React or repository
  imports.
- [ ] Run the two focused test files and commit
  `feat: add deterministic v3 activity engine`.

### Task 4: Add V3 persistence and repository adapters

**Files:**

- Create: `supabase/migrations/004_v3_learning.sql`
- Create: `src/data/v3-repository.ts`
- Create: `src/data/v3-repository.test.ts`
- Modify: `src/data/memory-repository.ts`
- Modify: `src/data/memory-repository.test.ts`
- Modify: `src/data/supabase-repository.ts`
- Modify: `src/data/supabase-repository.test.ts`
- Modify: `src/data/migration.test.ts`

**Consumes:** Task 2 attempt and course-event schemas.

**Produces:** `V3Repository`, guest and Supabase implementations, transactional
V3 activity/case save RPCs, owned exact-attempt reads, and course evidence.

- [ ] Write failing migration-contract tests for tables, composite foreign
  keys, uniqueness, RLS, all-or-none course context, and the V1/V2/V3 case-row
  compatibility constraint.
- [ ] Write failing repository tests for ordered round trip, identical retry,
  conflicting duplicate event rejection, cross-user absence, auth-state reset,
  and save-before-pending-clear.
- [ ] Implement migration and adapters. Keep current V1/V2 repository methods
  behaviorally unchanged.
- [ ] Run focused data tests plus `npm run typecheck`.
- [ ] Test the migration on a fresh database and a representative copy upgraded
  through migrations 001-003. Do not apply it to production.
- [ ] Commit `feat: persist v3 activity and course evidence`.

### Task 5: Build one private vertical slice through the activity shell

**Files:**

- Create: `src/components/activity/ActivityShell.tsx`
- Create: `src/components/activity/ActivityShell.test.tsx`
- Create: `src/components/activity/InteractionRenderer.tsx`
- Create: `src/components/activity/InteractionRenderer.test.tsx`
- Create: `src/app/api/activities/[activityId]/session/route.ts`
- Create: `src/app/api/activities/[activityId]/session/route.test.ts`
- Create: `src/app/api/activities/[activityId]/commit/route.ts`
- Create: `src/app/api/activities/[activityId]/commit/route.test.ts`
- Create: `src/app/api/activities/[activityId]/complete/route.ts`
- Create: `src/app/api/activities/[activityId]/complete/route.test.ts`

**Produces:** One test-only activity that loads a learner-safe projection,
commits, receives feedback, retries, completes, saves, restores, and replays.

- [ ] Write route tests proving exact-version lookup, server-only reveal,
  validated course context, idempotent completion, and safe unknown-version
  failure.
- [ ] Write component tests for native single/multi select, ranking controls,
  categorization controls, focus movement, keyboard use, save error retry, and
  session recovery.
- [ ] Implement the minimum shell and renderer needed by the test activity.
- [ ] Run focused unit/component/route tests and one Playwright journey.
- [ ] Commit `feat: prove v3 activity vertical slice`.

### Task 6: Add the four flagship activity definitions

**Files:**

- Create: `src/content/activities/alpinefit-clarifying-v3.ts`
- Create: `src/content/activities/alpinefit-exhibit-v3.ts`
- Create: `src/content/activities/alpinefit-brainstorming-v3.ts`
- Create: `src/content/activities/alpinefit-hypothesis-v3.ts`
- Create: `src/content/activities/content.test.ts`
- Create only the focused components that the four definitions require under
  `src/components/activity/`

**Consumes:** Existing AlpineFit V2 facts, opening responses, exhibits,
hypothesis choices, `GeneratedResponseCycle`, and `ExhibitRenderer`.

**Produces:** Four active exact-version activities meeting Section 12.

- [ ] Author fixtures first for strong, reasonable, and weak legal paths and
  expected source-labeled diagnostics.
- [ ] Implement Clarifying by adapting the existing exact interviewer responses;
  do not copy and silently edit them.
- [ ] Implement Exhibit Analysis with accessible table alternative and the four
  required reasoning stages.
- [ ] Implement Brainstorming with authored category coverage, overlap removal,
  and prioritization; do not reward raw count.
- [ ] Implement Hypothesis with at least two evidence-linked update rounds.
- [ ] Add pre-commit leakage, retry, refresh, keyboard, touch-equivalent, axe,
  and 320px checks for each interaction family.
- [ ] Run focused suites and commit `content: add v3 flagship skill activities`.

### Task 7: Publish Practice routes and stop for the learning-quality gate

**Files:**

- Create: `src/app/practice/page.tsx`
- Create: `src/app/practice/[labId]/page.tsx`
- Create: `src/app/practice/activities/[activityId]/page.tsx`
- Create: `src/app/practice/attempts/[attemptId]/page.tsx`
- Modify: `src/app/drills/page.tsx` and `src/app/drills/[skill]/page.tsx` only as
  required for explicit compatibility behavior
- Add colocated tests and CSS modules.

**Produces:** Discoverable labs, exact activity launch/review, recent attempts,
and preserved `/drills` behavior.

- [ ] Add route tests for active and exact versions, retired history, invalid lab
  IDs, refresh, and course query context.
- [ ] Add one browser journey per lab plus shared axe and 320px coverage.
- [ ] Run focused tests and commit `feat: launch v3 flagship skill labs`.
- [ ] Stop. Owner playtests all four labs and records `proceed`,
  `revise and replaytest`, or `stop` in `PRODUCT_DECISION_LEDGER.md`.
- [ ] Do not begin Task 8 until the recorded decision is `proceed`.

### Task 8: Add explicit AlpineFit case modes

**Files:**

- Create: `src/core/case-mode.ts`
- Create: `src/core/case-mode.test.ts`
- Modify: `src/core/case-engine.ts` and tests
- Modify: `src/core/learner-case.ts` and tests
- Modify: `src/components/investigation/InvestigationPanel.tsx` and tests
- Modify: AlpineFit case/API route tests as required

**Produces:** Persisted `caseMode`, server-enforced mode policy, timer UI, and
AlpineFit completion in both modes without duplicating content.

- [ ] Write failing tests for policy values, retry/hint rejection in Interview
  Mode, delayed reveal, limited backtracking, refresh, save retry, and distinct
  scaffolding/mode fields.
- [ ] Implement `CaseRunContext` at the shared legality/projection seams.
- [ ] Preserve current Practice Mode behavior and all V1/V2 journeys.
- [ ] Run focused tests and both AlpineFit browser journeys.
- [ ] Commit `feat: add alpinefit practice and interview modes`.

### Task 9: Add chronological replay and debrief

**Files:**

- Create: `src/core/replay-timeline.ts`
- Create: `src/core/replay-timeline.test.ts`
- Modify: `src/components/review/CaseReplay.tsx` and tests
- Create: `src/app/cases/[caseId]/attempts/[attemptId]/page.tsx`
- Modify: current review route only where shared rendering requires it

**Produces:** `buildCaseReplayTimeline`, historical route, and debrief sections
for strengths, improvements, and exact next practice.

- [ ] Test evidence timing, contrary evidence without update, repeated attempts,
  exact historical version, unavailable version, and cross-user absence.
- [ ] Reuse existing review projections and repository reads; do not build a
  parallel scoring engine or duplicate history API.
- [ ] Add keyboard, axe, 320px, and signed-in exact-version browser coverage.
- [ ] Commit `feat: add chronological case debrief`.

### Task 10: Add V3 Progress and deterministic recommendations

**Files:**

- Create: `src/core/v3-progress.ts`
- Create: `src/core/v3-progress.test.ts`
- Create: `src/core/v3-recommendations.ts`
- Create: `src/core/v3-recommendations.test.ts`
- Modify: `src/app/progress/page.tsx` and tests
- Create: `src/app/progress/history/page.tsx` and tests

**Produces:** Version-separated evidence states, five ordered dashboard areas,
unified activity/case history, and one explained recommendation.

- [ ] Write policy tests for all four states, source labels, recurring blockers,
  successful transfer rotation, retired/missing resources, and V1/V2 isolation.
- [ ] Write recommendation-order tests for all six priorities in Section 10.
- [ ] Implement pure aggregators before page components.
- [ ] Add guest and signed-in browser journeys, including identity change.
- [ ] Commit `feat: add v3 progress coaching`.

### Task 11: Add course infrastructure and the Profitability course

**Files:**

- Create: `src/content/courses/profitability-v3.ts`
- Create: `src/content/lessons/profitability-overview-v3.json`
- Create: `src/content/lessons/profitability-drivers-v3.json`
- Modify: `src/content/lessons/index.ts` and tests for immutable exact lookup
- Create: `src/core/course-progress.ts`
- Create: `src/core/course-progress.test.ts`
- Create: `src/app/learn/courses/[courseId]/page.tsx`
- Modify: lesson rendering to record validated course-context `lesson_viewed`

**Produces:** Exact nine-resource-step course, completion-page debrief,
enrollment/continue behavior, and derived completion.

- [ ] Test every exact resource reference, standalone-vs-course completion,
  one-step-only completion, signed-in cross-device course continuation, retired
  course history, and guest session behavior.
- [ ] Extend lesson practice references with a backward-compatible V3 activity
  shape `{ activityId, contentVersion }`; keep existing V2 `{ drillId,
  contentVersion: 2 }` objects byte-for-byte unchanged. Point the two new
  lessons to the exact Clarifying and Brainstorming activities.
- [ ] Run a browser journey from enrollment through AlpineFit and debrief.
- [ ] Commit `feat: add profitability learning course`.

### Task 12: Add shared navigation and harden V3.0

**Files:**

- Create: `src/components/navigation/PrimaryNavigation.tsx` and tests
- Modify: `src/app/layout.tsx`, primary route pages, metadata, and release docs
- Modify: `PROJECT_CONTEXT.md`, `TASK_STATE.md`, `RELEASE_NOTES.md`, and
  `PRODUCT_DECISION_LEDGER.md`

**Produces:** Final V3.0 information architecture and a release candidate.

- [ ] Make Learn, Practice, Cases, and Progress the exact primary navigation.
- [ ] Add only filters backed by published V3.0 metadata/content.
- [ ] Inspect client bundles and pre-commit network responses for authored-answer
  leakage.
- [ ] Run fresh migration, representative 001→004 upgrade, and transaction-
  scoped RLS tests.
- [ ] Run V1/V2 compatibility fixtures and all V3.0 browser journeys at 320px,
  768px, and 1440px.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run test:e2e`, `npm run build`, and `git diff --check` on a clean checkout.
- [ ] Record exact evidence. Commit `chore: harden casework v3 profitability loop`.
- [ ] Stop for separate production migration and deployment approval.

## 14. V3.0 release acceptance

V3.0 is complete only when:

- all four labs have one reviewed deterministic activity;
- the Gate 7 learning-quality decision is `proceed`;
- activities save, restore, retry, and replay through shared contracts;
- AlpineFit V2 completes in Practice and Interview modes;
- Interview Mode exposes no checkpoint correctness before completion;
- chronological replay explains decisions against evidence available at the
  time;
- every debrief claim cites a real event, objective outcome, or labeled
  self-assessment;
- Progress explains one valid next action without mixing V1/V2/V3 semantics;
- the Profitability course completes using exact-version resources;
- guest history is session-scoped and signed-in history is durable;
- accessibility, keyboard, responsive, recovery, answer-secrecy, migration,
  RLS, full test, typecheck, lint, and build gates pass; and
- rollback can disable active V3 content and navigation without deleting V3
  attempts.

## 15. Follow-on planning gates

After V3.0 production evidence, write the V3.1 plan from the released contracts.
It should add one lab at a time in this order: Structuring, Case Math, Market
Sizing, Synthesis, Recommendation. Add `formula_builder`,
`market_sizing_tree`, and recommendation-specific schema variants only when
their task begins. Require one reviewed vertical slice before authoring transfer
repetitions.

After V3.1 production evidence, write the V3.2 plan for primers and courses.
Publish only courses whose exact lesson, activity, and capstone references
already exist or are explicitly included in that plan. M&A remains outside the
release until its capstone is approved.

## 16. Risks and controls

| Risk | Control |
| --- | --- |
| V3 changes released V2 semantics | Separate schemas, frozen fixtures, exact versions |
| Generic engine becomes framework work | Only V3.0 variants; one private slice before public content |
| Free text receives fake scoring | Objective checks plus labeled self-assessment only |
| Answers reach client bundles | Server-owned definitions and recursive projection/network tests |
| Case modes fork the engine | One engine with explicit `CaseRunContext` policy |
| Mode is confused with scaffolding | Separate types, columns, copy, and tests |
| Replay uses active content | Exact-version lookup and safe unavailable state |
| Progress mixes versions | Dedicated V3 aggregator and frozen V1/V2 fixtures |
| Course completion drifts | Immutable attempts and course-step events, no counters |
| Draft storage creates privacy risk | Session-only drafts; no V3.0 server run table |
| Content multiplies before quality is known | Mandatory four-lab owner gate |
| Later releases delay V3.0 | Separate post-release plans and hard release boundaries |

## 17. Effort and first authorized action

Treat estimates as planning ranges, not deadlines. V3.0 is approximately
180-300 focused engineering/content hours plus owner playtest and revision time.
Estimate V3.1 and V3.2 only when their implementation plans are written against
released evidence.

After explicit V3.0 approval:

1. Create a clean V3 branch/worktree from the approved production baseline.
2. Execute Task 0 and commit the compatibility baseline.
3. Execute Tasks 1-7 in order.
4. Stop at the flagship-lab owner gate.
5. Continue Tasks 8-12 only after the recorded decision is `proceed`.

The first planned commit is:

```text
test: freeze v3 compatibility baseline
```

The first feature commit is:

```text
feat: define casework v3 taxonomies
```
