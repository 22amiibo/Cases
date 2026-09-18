# Casework Release Notes

## V3.0 Profitability learning loop — local release candidate

Date: 2026-09-18

Status: Tasks 0–12 are implemented locally. Production migration and
deployment have not been performed and require separate owner approval.

### Included

- Shared primary navigation with the exact destinations Learn, Practice,
  Cases, and Progress; current-section state, keyboard use, and responsive
  behavior are covered at 320px, 768px, and 1440px. One shared axe pass covers
  all four primary destinations, including the Cases inventory.
- Four flagship Skill Labs with three reviewed repetitions each: Clarifying,
  Exhibit Analysis, Brainstorming, and Hypothesis.
- AlpineFit Practice and Interview modes with server-enforced policy and no
  pre-completion Interview correctness reveal.
- Exact-version chronological replay and an evidence-backed case debrief.
- V3 Progress with resumable work, explained recommendations, skill evidence,
  history, and training achievements kept separate from V1/V2 meaning.
- One exact nine-step Profitability course ending in AlpineFit Practice Mode.
- Guest session continuation and signed-in cross-device evidence through the
  existing repository contracts.
- Preserved `/drills` and `/drills/[skill]` compatibility.

No inventory filters ship in V3.0. Four lab groupings and six mostly unique
case metadata combinations are too small for filters to improve discovery.
Published metadata remains available for later expansion.

### Local verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 90 files / 480 tests passed.
- `npm run test:e2e`: all 60 Playwright journeys passed at their authored
  viewports. The representative V3 route matrix separately passed at 320px,
  768px, and 1440px.
- `npm run build`: passed; 22 static pages generated and all V3 routes included.
- `git diff --check`: passed.
- Pre-commit network inspection checks AlpineFit activity and case responses
  for selected hidden authored feedback, diagnostic codes, and option outcome
  mappings.
- After `npm run build`, `npm run check:answer-secrecy` recursively scans
  `.next/static/chunks/**/*.js` for these three exact server-only authored
  markers:
  - Activity feedback: `You connected the labor outlier to margin pressure and a focused next cut.`
  - Evaluation criterion: `Connects labor growth to margin pressure`
  - Completed-case answer: `Stabilize staffing in the six high-overtime clubs through faster hiring and targeted retention while tightening overtime controls.`
  The command fails if a marker is missing from its authored source or appears
  in a browser chunk. The final production build contained 23 browser chunks;
  all three markers were absent.
- Static migration tests verify additive 001→004 ordering, V1/V2/V3 row
  compatibility branches, all V3 ownership-policy read/write clauses, and the
  caller identity guard in each V3 transactional save function.

The full browser gate exposed one stale recovery assertion that still read the
legacy `caseAttempts` array after AlpineFit became an explicit V3-mode attempt.
The regression now verifies one retry-safe `v3CaseAttempts` Practice record.
Response-body secrecy checks read intercepted API bodies before delivering
them to the page, or read a document before navigation, so refreshes cannot
discard a body before inspection.

### Remaining production gate

This worktree has no PostgreSQL server, `psql`, Supabase CLI, or Docker runtime.
A real fresh-schema apply, representative 001→004 database upgrade, and
transaction-scoped RLS execution therefore remain required in an isolated
database before production approval. Hosted Supabase was not touched.

Rollback disables V3 active content and the V3 primary navigation while
retaining the additive schema and immutable V3 attempts. It does not delete or
rewrite learner history.

## V2 Wave 1 pilot

Date: 2026-09-17

Status: released to production. Production migrations are applied and the
wrong-unit feedback → immediate retry → successful completion smoke passed.

## Included

- Generate → Commit → Self-check → Compare → Diagnose → Retry across three
  deterministic V2 reps for each of six skills.
- AlpineFit beginner, PayPilot intermediate, and GoldenLoaf lower-scaffolding
  pilot cases with versioned authored content.
- V2 diagnostic Progress coaching kept strictly separate from Legacy V1 scores.
- Signed-in case history links that load owned attempt metadata and ordered
  events, then replay against the exact stored content version.
- A safe stored-attempt summary when a historical definition is unavailable;
  active content is never substituted.
- Keyboard, automated accessibility, 320/768/1440 reflow, refresh recovery,
  retry-safe persistence, and answer-secrecy release gates.
- Immediate same-session quantitative retry after corrective wrong-unit
  feedback; no page refresh is required.
- Repeated quantitative attempts retain distinct entries in case replay.

## Data safety and rollback

Migrations `002_v2_learning_evidence.sql` and
`003_case_event_evidence.sql` are additive. They preserve V1 rows and keep V2
attempt metadata/events available under row-level security. The recoverable
backup remains retained after migration.

Rollback selects version `1` for the three pilot case IDs in
`activeCaseVersions` and redeploys. It does not delete V2 rows or reverse the
additive schema.

## Honest Wave 1 boundaries

- Structured self-assessment cannot prove the semantic quality of learner prose.
- The pilot does not simulate live conversational interview performance.
- Full timed Interview Mode and AI evaluation are not part of this release.

## Live release record

This section is the release-candidate evidence record. Controller-held command
transcripts, artifact paths, and checksums must be linked or copied here before
the owner approves production deployment; values not supplied to this worktree
are intentionally not invented.

| Gate | Status and evidence |
| --- | --- |
| Linked migration dry-run | Complete, controller-confirmed: the linked-project dry-run included additive migrations `002_v2_learning_evidence.sql` and `003_case_event_evidence.sql`. The command transcript remains in the controller's release record. |
| Recoverable backup | Complete, controller-confirmed: checksummed schema and data backups were created and remain retained. Artifact locations and checksum values remain in the controller's release record. |
| Live migration apply | Complete, controller-confirmed: production migrations `002` and `003` were applied, and the remote migration list aligns from `001` through `003`. |
| Transaction-scoped live RLS smoke | Complete, controller-confirmed: the owner could read the owned attempt and ordered events, cross-user reads returned no rows, and the smoke transaction was rolled back. No smoke identifiers are retained here. |
| Credential hygiene | Complete, controller-confirmed: the temporary credential file used by the release controller was removed. |
| Final local release gate | Complete: the wrong-unit regression failed before the fix and passed afterward; 57 test files / 272 tests, all 34 Playwright journeys, lint, typecheck, production build, and diff validation passed. |
| Production application deployment | Complete: the final release build reached `https://cases-pi-five.vercel.app` and exposed the V2 session API shape. |
| Live wrong-unit retry smoke | Complete: production graded the wrong unit incorrect, displayed corrective feedback, enabled retry immediately, and accepted the corrected unit without refresh. |
| Live signed-in save and exact-version replay | Pending approved release smoke. Record the saved attempt ID, content version, and replay result without learner content. |
| Production answer-secrecy inspection | Complete for the AlpineFit release journey: precommit session responses contained neither the numeric answer nor recommendation decision. |
| Rollback rehearsal | Pending approved release window. Record the V1 active-version selection and restoration result without deleting V2 rows. |
