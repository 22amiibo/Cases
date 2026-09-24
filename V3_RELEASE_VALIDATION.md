# Release candidate

**Current verdict (2026-09-20 UTC): RELEASED — PRODUCTION LIVE WITH LIMITED POST-DEPLOY BROWSER SMOKE.** Owner-authorized migration004 and candidate **`628ada71d99e3ce115c3ba8f26e00518e5164336`** were deployed successfully. Database verification and corrected V2 write/replay compatibility passed; the Vercel deployment is Ready and owns the production alias. The owner's normal Chrome session remains signed in, but the isolated Chromium harness could not complete the authenticated V3 journey, so the remaining focused browser flows are recorded as unverified rather than passed. See “Owner-authorized production rollout” at the end.

- Validation date: 2026-09-18 (America/Chicago).
- Repository/worktree: Casework, `.worktrees/casework-v3`.
- Branch: `feature/casework-v3`.
- Original candidate: `94249c5b1d272a3c01bc6be0905e64c536f61a22`.
- Revised candidate validated: `3b0e6be478c9905ae442570fa08283c4c1c07635` (`fix: enforce v3 case metadata during release validation`). **The candidate commit changed.** The original candidate is not approved: validation found and corrected a V3 metadata constraint defect.
- Validator: Codex; local macOS ARM64, Node 26.4.0, npm 11.17.0, PostgreSQL 17.11, Supabase CLI 2.117.0, Chromium/Playwright 1.63.0, Next.js 16.3.5.
- At the time of this original validation section, no production migration or deployment had occurred. The later owner-authorized production rollout is recorded at the end of this report.

## Integrity and environment

Initial branch and HEAD matched the request; initial worktree was clean. Migrations 001–003 and both protected paths have no tracked differences from the documented V2 production baseline `c9dde86b0529901a7bcee801fcb8e070f72b8b86`.

Running the Supabase CLI initially created untracked `supabase/.temp/cli-latest` in the candidate worktree. This is an unexpected protected-path side effect, disclosed during validation. It was not edited, staged, or deleted. Subsequent CLI operations used temporary projects outside the worktree. The final worktree is therefore **not clean**, even apart from this report.

The original generated `.next` cache contained duplicate filenames and produced TypeScript errors. It was moved intact to the evidence directory. A later generated Turbopack cache also failed with `invalid digit found in string`. Final application verification used a clean `git archive` export outside the Desktop directory, with the existing installed dependencies copied into it. The cause of the duplicate files was not established. The export began at the original SHA; only the documented migration/test fixes were subsequently copied into it.

Required application configuration is exactly:

| Variable | Requirement |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Actual isolated/production Supabase **HTTP API** URL, selected for the intended environment at build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Matching public anon key; RLS remains mandatory |

With neither configured, the application supports guest session storage. Never put a service-role key, database password, or privileged token in a `NEXT_PUBLIC_*` variable. CLI database credentials are operational secrets, not application variables. No other application environment variable or runtime V3 disable flag was found. Production values and platform configuration were not verified.

The production-mode test build used `http://127.0.0.1:54321` and `e2e-anon-key`, matching the repository's mocked browser suite. **No Supabase HTTP service was listening there.** An earlier build used PostgreSQL port 55432 as the public URL; that was not a valid API configuration and is not accepted as connected-application evidence.

## Surgical release fix

Original migration 004 allowed an authenticated owner to insert a V3 case with `case_mode = NULL`. PostgreSQL CHECK constraints accept an unknown/NULL expression. The application requires the mode and parses V3 cases strictly; an invalid owned row can therefore break that user's history/course reads.

Changed only the V3 branch of `case_attempts_version_metadata_check` to `coalesce((...), false)`. V1/V2 branches remain unchanged. This also rejects NULL content version, event schema version, diagnostics, and skill evidence for V3 cases. Added `supabase/tests/v3_required_metadata.sql`, a real transaction-scoped database regression:

- Before fix: exit 3, `V3 required metadata accepted NULL: case_mode`.
- After fix: all five NULL-field checks pass on fresh and V2-upgraded databases.
- Valid V1, V2, and V3 rows remain accepted, including nullable V3 scaffolding; all fixture changes roll back.

Production-mode browser verification additionally exposed five tests refreshing before asynchronous commits were confirmed. Added five visible-state waits across four existing e2e files, preserving every post-refresh assertion. No application UI, content, API, or TypeScript persistence implementation changed. Before: 54 passed / 5 failed; after: 59 passed / 0 failed in production mode.

Migration 004 is documented as unreleased. Editing it is appropriate only while production has 001–003. **If any target already applied the original 004, abort this rollout proposal:** the CLI will not reapply an edited migration. That environment requires a separately reviewed forward migration, not migration-history repair or an unrecorded constraint edit.

# Fresh migration

## Isolation and process

Dedicated cluster: `/tmp/casework-v3-validation-94249c5/pgdata`, loopback `127.0.0.1:55432`, socket `/tmp/casework-v3-validation-94249c5/socket`. This is a disposable local PostgreSQL cluster, not production. Local trust authentication is confined to this test cluster; it is not a production recommendation.

The bootstrap supplied Supabase prerequisites: `auth.users`, `auth.uid()`, authenticated/anon/service roles, schema usage, and the legacy Supabase default table/sequence/function grants. It did **not** implement Supabase Auth, JWT verification, PostgREST, or a full managed Supabase installation. The roles and RLS policies execute in real PostgreSQL.

The original candidate passed a fresh psql single-transaction apply per migration and a separate actual Supabase CLI apply. The corrected candidate was applied from scratch to `casework_fixed_fresh` using CLI 2.117.0:

```sh
/tmp/casework-v3-validation-94249c5/supabase-cli/supabase \
  --workdir /tmp/casework-v3-validation-94249c5/fixed-project \
  db push \
  --db-url 'postgresql://noahmartz@127.0.0.1:55432/casework_fixed_fresh?sslmode=disable' \
  --include-all --skip-vault --yes
```

Exact order: `001_initial.sql`, `002_v2_learning_evidence.sql`, `003_case_event_evidence.sql`, `004_v3_learning.sql`. All succeeded. No application seed is required by this history. CLI migration ledger contains versions 001–004.

Migration SHA-256 values:

| Migration | SHA-256 |
| --- | --- |
| 001 | `38877c00adcf5eaa3628023888d0fdecc8e2f1e85e1aaba5daf03ef41c641121` |
| 002 | `42e34d899dd3f7c6ef6547f5e9cedac550d7f6e6a009d98513c778d35a53e502` |
| 003 | `dbb06b367ebf23ee18ff2eaed010a4f5cf60147f57a423db62fbec5851d55a26` |
| corrected 004 | `dfd1e8d456b8f3aa06f98ffd581f8e8b6454565a2d4ab019a98014a7d409e844` |

Original 004 hash was `dea562291d8880a73e74c53e0b3d4a2809793a525d618cd4e52bcb13cdc7b010`.

## Schema evidence

Verified eight public tables, expected repository columns, 45 constraints, 21 indexes (including seven explicitly named query indexes), defaults/identity columns, five persistence RPCs, the signup/profile trigger, grants, eight RLS-enabled tables, and eight owner policies. The complete catalog is in `schema-catalog.log`; the corrected schema differs only in the documented V3 CHECK branch.

- Tables: profiles, drill_attempts, case_attempts, case_events, activity_attempts, activity_events, course_enrollments, course_step_events.
- Composite ownership FKs bind activity/case events to the matching attempt and user. Course-step events require the matching enrollment.
- Unique event sequences, activity event IDs, enrollment keys, and lesson-step event keys are present.
- Activity version fields require positive content version, event schema 3, scoring `v3`; case V3 retains event schema 2. Content version is independent of scoring version: current activities/course use version 1, AlpineFit uses version 2.
- Course context is all NULL or all populated; versions are positive. Activity completion cannot precede start.
- Defaults include creation timestamps, legacy UUIDs/empty arrays, and generated event identities. New activity attempt IDs are supplied by the application.
- All five persistence RPCs are SECURITY INVOKER with an empty search path. The profile-creation trigger function is SECURITY DEFINER with an empty search path; two auth user inserts produced two profiles.
- No `learning_runs` table is intended: unfinished runs are browser session drafts.

Fresh representative writes produced two users/profiles, two drills, two activity attempts/four events, two V3 case attempts/two events, two enrollments, and two lesson events. Practice and Interview modes, standalone and course contexts, and exact versions survived reads. The real repository parsed these rows through a SQL-backed validation adapter.

**Limit:** migrations rely on platform default table/sequence grants. They do not independently install every authenticated table privilege. This rehearsal modeled legacy Supabase defaults; a project using opt-in grants requires explicit verification before approval. Grants and RLS are independent controls ([Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)).

# Upgrade migration

Starting shape: exact unchanged migrations 001–003, matching the repository's latest documented V2 production shape. No production export was used; this is a synthetic representative fixture, not proof of the current live catalog or production-scale migration timing.

For the corrected candidate, `casework_fixed_upgrade` received 001–003 through the actual CLI. `upgrade_seed.sql` then inserted V1/V2 attempts, versioned events, users, and historical scores/diagnostics. Row counts and stable JSON digests of every original persisted field were captured. Only corrected 004 was then copied to the isolated migration project and applied with `db push`.

| Resource | Before | After | Original values |
| --- | ---: | ---: | --- |
| profiles | 2 | 2 | unchanged |
| drill_attempts | 2 | 2 | unchanged |
| case_attempts | 3 | 3 | unchanged |
| case_events | 3 | 3 | unchanged |

All ten row digests match. Case versions remain one V1 and two V2; none were relabeled V3. No historical rows were rewritten or removed. Migration 004 adds tables/nullable columns/indexes/functions/policies and replaces a metadata constraint; it performs no data UPDATE/DELETE.

`read-persisted.mjs` read the actual upgraded rows under an authenticated owner role and passed them through the candidate repository and exact-definition review code. V1 and V2 attempt parsing/review passed; history returned four owned skill records; the other user's case detail was absent. This adapter uses SQL instead of PostgREST, so it is not a substitute for the missing browser integration gate.

New V3 activity/case/course-context writes and reads passed on the fresh corrected schema. The SQL regression also accepted a valid V3 row on the upgraded schema. Complete browser workflows against the upgraded database remain unverified.

# RLS matrix

Users: A `11111111-1111-4111-8111-111111111111`; B `22222222-2222-4222-8222-222222222222`. Every ownership query/mutation used `BEGIN; SET LOCAL ROLE authenticated;` and a transaction-local `request.jwt.claim.sub`, never an owner/superuser role for the tested operation. Mutations were rolled back. This exercises real PostgreSQL RLS, including permissive table grants, without an application mock. JWT issuance/validation is outside this evidence.

The following direct-table matrix was run in **both directions**, A→B and B→A. Counts are per user; activity_events has two own rows, every other resource one. Cross-user INSERT tests used unused IDs, avoiding primary-key collisions.

| Resource | Own SELECT / UPDATE / DELETE expected → actual | Other SELECT / UPDATE / DELETE expected → actual | Own INSERT expected → actual | Other INSERT expected → actual |
| --- | --- | --- | --- | --- |
| profiles | 1 / 1 / 1 → 1 / 1 / 1 | 0 / 0 / 0 → 0 / 0 / 0 | signup trigger → profile created | direct INSERT not tested |
| drill_attempts | 1 / 1 / 1 → 1 / 1 / 1 | 0 / 0 / 0 → 0 / 0 / 0 | 1 → 1 | denied → denied |
| case_attempts | 1 / 1 / 1 → 1 / 1 / 1 | 0 / 0 / 0 → 0 / 0 / 0 | 1 → 1 | denied → denied |
| case_events | 1 / 1 / 1 → 1 / 1 / 1 | 0 / 0 / 0 → 0 / 0 / 0 | 1 → 1 | denied → denied |
| activity_attempts | 1 / 1 / 1 → 1 / 1 / 1 | 0 / 0 / 0 → 0 / 0 / 0 | 1 → 1 | denied → denied |
| activity_events | 2 / 2 / 2 → 2 / 2 / 2 | 0 / 0 / 0 → 0 / 0 / 0 | 1 → 1 | denied → denied |
| course_enrollments | 1 / 1 / 1 → 1 / 1 / 1 | 0 / 0 / 0 → 0 / 0 / 0 | 1 → 1 | denied → denied |
| course_step_events | 1 / 1 / 1 → 1 / 1 / 1 | 0 / 0 / 0 → 0 / 0 / 0 | 1 → 1 | denied → denied |

Progress/history/detail reads use these owned tables; there is no separate unrestricted history view or learning-run persistence surface.

| RPC/security scenario | Expected | Actual |
| --- | --- | --- |
| get_case_events, own / other attempt, A and B | 1 / 0 events | 1 / 0 |
| save_case_attempt, save_case_attempt_v2, save_case_attempt_v3, save_activity_attempt_v3 with other user ID, A and B | reject | all rejected by identity guard |
| V3 case/activity retry with own identity but foreign attempt ID, A and B | reject | conflicting-attempt error; no takeover |
| Identical activity retry, A and B | one attempt/two events | unchanged counts |
| Identical V3 case retry, A and B | one attempt/one event | unchanged counts |
| Changed activity/case metadata on retry, A | reject | both rejected |
| Change ownership of existing rows, eight tables, A and B | reject | all SQLSTATE 42501 |
| Insert child event with own user ID and other user's parent, A and B | reject | both composite FKs reject, SQLSTATE 23503 |
| Activity RPC with missing event ID, A and B | reject entire save | SQLSTATE 23502; parent attempt absent |
| New transaction without claim, all eight tables | zero rows | zero rows; prior identity did not leak |
| anon activity table read / V3 activity RPC | zero / reject | zero / rejected |

No tested cross-user access succeeded. Under the modeled default grants, anon still has explicit function EXECUTE despite revoking PUBLIC. The identity guards and RLS fail closed; do not mistake PUBLIC revocation for removal of an explicit anon grant ([Supabase function privileges](https://supabase.com/docs/guides/database/functions)).

Owner UPDATE/DELETE are allowed by the existing FOR ALL policies. Thus historical immutability is an application/RPC convention, not a database prohibition against an owner manually changing their own data. This validation does not claim otherwise.

# Persistence smoke

| Flow | Proven | Missing |
| --- | --- | --- |
| Activity start/commit/refresh/resume/complete/reopen | guest browser suite; production-mode flagship/review journeys | real authenticated browser → Supabase round trip |
| Activity retry/idempotency | guest save recovery; real SQL RPC retries and atomic failure | HTTP retry/auth integration |
| Case start/refresh/recover/complete | guest browser suite, both AlpineFit modes | real authenticated completion/save |
| Persist case mode/exact version/reopen/replay | SQL modes/versions; real-row repository parsing; guest and mocked owned replay | real HTTP saved-attempt URL |
| Profitability start/steps/leave/resume/completion | complete nine-step guest browser journey; repository tests for derived completion | real signed-in cross-device course against migrated DB |
| Activity/case course context | SQL storage and repository parsing; guest course journey | HTTP/RLS integration of complete course saves |
| Identity switch/stale data | browser identity-switch test with mocked auth/REST; real SQL identity isolation | real sign-out/sign-in/session refresh |

The original five production-mode refresh failures were resolved by waiting for the committed state before refreshing. This proves recovery of confirmed commits. It does **not** promise that a request interrupted before confirmation survives navigation; unfinished server runs are not persisted by V3.0 design.

# Regression suite

Final results are from fresh runs during this validation, not copied from RELEASE_NOTES.md. Final application source is unchanged from the original commit; migration and test changes are listed above.

| Check | Result / evidence |
| --- | --- |
| `npm run lint` | pass, exit 0; `lint-fixed.log` |
| `npm run typecheck` | pass, exit 0 after production type generation; `typecheck-fixed.log` |
| `npm test` | 90 files / 480 tests passed, exit 0; `unit-fixed.log` |
| legacy V1/V2 fixtures | all four `v3-compatibility.test.ts` tests included in the 480; actual upgraded-row parse/review also passed |
| `CI=1 npm run test:e2e` | 60 passed, 0 failed, no retries reported, exit 0, 1.3m; `playwright-fixed-ci.log` |
| production browser suite | 59 passed, 0 failed, exit 0, 38.1s; `playwright-production-fixed.log` |
| production build | pass, 22 static pages; `build-clean.log` |
| answer-secrecy bundle scan | 23 chunks / three exact server-only markers absent; `secrecy-clean.log` |
| accessibility / keyboard / reflow | included in browser suites; axe, keyboard navigation, 320/768/1440 checks |
| precommit network secrecy | activity/case response checks included in browser suites; selected authored markers/metadata, not an exhaustive proof of every possible disclosure |
| SQL metadata regression | five rejected NULL fields plus valid V1/V2/V3 rows on fresh and upgraded schemas |
| `git diff --check` | pass; staged surgical fix also passed before commit |

Production browser command:

```sh
node node_modules/@playwright/test/cli.js test \
  --config=/tmp/casework-v3-validation-94249c5/playwright-production.config.ts
```

This temporary config runs `next start`, two workers, no retries, and the existing suite except its explicitly development-only private activity. Guest flows use real Next.js APIs and session storage; signed-in flows retain the repository's mocked Supabase responses. No agent-browser executable was available; installed Playwright supplied browser verification.

Earlier attempts are retained as adverse evidence: two original-worktree runs each had 59 pass/1 navigation timeout, their focused repetitions passed 3/3 each, and the pause interrupted a CI run (exit 130, 59 passed/1 flaky). A later start failed on corrupted generated cache. The clean original export then passed all 60 tests. Production mode first had 54/59 pass before the five confirmation waits. None of these failures is silently counted as a clean pass.

# Recovery / rollback

## Demonstrated behavior

The SQL files contain no explicit BEGIN/COMMIT. psql was initially run with `--single-transaction` per migration. Separately, the actual Supabase CLI 2.117.0 path was fault-tested: append `select 1 / 0;` to an isolated copy of 004 after applying 001–003. The CLI failed with SQLSTATE 22012. Ledger remained 001–003; activity_attempts and case_mode were absent; the old V2 constraint remained. Restoring the exact migration and retrying succeeded, ledger 001–004. This proves atomicity for that CLI/migration failure, not for arbitrary deployment runners or connection failures at commit time. The fault experiment used original 004; the corrected migration was independently applied fresh and as an upgrade.

The application must deploy **after** migration 004 and its schema/grants/RLS checks. Deploying V3 first can request nonexistent tables/functions. V2's baseline repository selects explicit legacy columns and ignores non-V1/V2 scoring versions, so code inspection supports a compatibility window with the additive schema. A running V2 application against mixed migrated data was **not rehearsed**.

## Concrete procedure (proposal; production actions not executed)

1. Before migration, retain a recoverable backup/checkpoint, schema dump, migration ledger, application deployment ID, migration checksums, and row-count checks. Demonstrate restoration into a separate environment. Do not accept an untested backup as rollback proof.
2. If 004 fails before application rollout, keep V2 serving. Inspect the ledger and actual catalog; if both remain at 003, correct the execution/environment problem and retry the exact reviewed migration. Never use migration repair to pretend SQL ran.
3. If connection loss makes commit outcome uncertain, inspect both ledger and catalog before retry. If inconsistent or partially applied, stop for recovery assessment; do not blindly rerun non-idempotent CREATE statements.
4. After a successful 004 but before deployment, an application problem does not require schema deletion. Leave additive tables/columns/history in place and keep V2 running, subject to the missing compatibility rehearsal.
5. After V3 deployment, the proposed disable path is to restore the specifically verified previous V2 deployment with the same database configuration. Retain schema 004 and all V3 records. V3 history may temporarily be inaccessible in V2 UI. This deployment rollback is **not yet demonstrated**, and no runtime kill switch exists. Merely changing active content registries would require a separately tested application build and may not close direct routes.
6. If database corruption is suspected, preserve current evidence and writes, stop rollout, and restore the checkpoint to a separate database for comparison. Any production restore/cutover requires separate owner approval and reconciliation of writes after the checkpoint. Do not drop V3 tables or run a down migration to disable the release.

No destructive database rollback, point-in-time restore, or production application rollback was performed. Retained local cluster/artifacts allow further validation; they are not production backup assets.

# Production rollout proposal

**Not executable for approval yet:** close the unresolved validation gates first. The commands below describe a future separately approved production workflow.

1. Finish real Auth/PostgREST browser testing in a disposable Supabase environment using both users; run the persistence matrix on fresh and upgraded schemas. Rehearse V2 application compatibility and deployment rollback there.
2. Owner identifies the production project, current deployed application SHA/deployment ID, and actual schema/ledger. Expected baseline is 001–003 and documented V2 `c9dde86…`, but repository notes are not evidence of current production reality. Abort on drift or any existing 004 until reviewed.
3. Verify and restore-test the production backup/checkpoint; record location, checksum, retention, and recovery owner. Record counts/representative digests, policy/function definitions, and default grants. Choose a window for 004's ALTER TABLE constraint/index locks; production-size timing and concurrent load have not been measured.
4. Obtain separate explicit owner approval for **production migration** and **application deployment**. Pin the revised candidate SHA and corrected 004 hash. Verify the two public environment variables point to the intended project, and that no privileged credentials enter browser assets.
5. In a clean deployment checkout, use the reviewed CLI version. `supabase migration list --linked` must agree with the catalog; `supabase db push --linked --dry-run` must list **only 004_v3_learning.sql**. Abort if anything else is proposed. Do not use `--include-all`, seed, reset, or repair as a production workaround.
6. Apply `supabase db push --linked` only under the approved migration action. Verify ledger 001–004; tables/columns/constraints/indexes/functions/trigger; all RLS policies; authenticated table/sequence/RPC grants; NULL rejection; unchanged historical counts/records. Use transaction-scoped A/B checks with dedicated test identities and rollback mutations. Abort deployment on any discrepancy.
7. Deploy the pinned revised application commit using the verified production public configuration. Do not promote a build containing the local test URL/key. Retain the previous verified deployment.
8. Post-deploy, use dedicated test accounts: sign in; complete/reopen/retry one activity; complete AlpineFit Practice and Interview modes; refresh and reopen exact-version case URLs; enroll/leave/resume Profitability; inspect progress/history; sign out and switch identities; verify guest behavior and precommit answer secrecy. Record IDs/versions/results without learner text or tokens.
9. Observe hosting deployment/build/runtime logs, Supabase Postgres/Auth/API logs, and browser console/network failures for these runs and an owner-defined observation window. No custom telemetry, alert thresholds, or monitoring owner is configured by this repository; establish those operational details before promotion.
10. Declare healthy only after all checks pass. Abort/recover on cross-user data, failed saves/retries, lost historical rows, version/mode mismatch, answer leakage, persistent 5xx/auth failures, or broken refresh/history/course flows. Use the recovery procedure above; retain V3 data. If the agreed previous deployment has not been rehearsed, do not claim an immediate safe rollback.

# Unresolved risks

| Severity | Impact | Recommendation |
| --- | --- | --- |
| Blocking | No full isolated Supabase HTTP/Auth service or real JWT browser session was available. Gates 6/7 signed-in persistence are incomplete. | Provision a disposable full Supabase environment; execute real A/B sign-in, save, refresh, identity switch, exact-history, course, and HTTP retry flows. |
| Blocking | V2 application rollback/compatibility with mixed migrated data and disable procedure are not demonstrated. | Rehearse the exact previous deployment and restoration before owner approval. |
| High, environment-dependent | Table/sequence grants depend on Supabase defaults; local bootstrap modeled legacy grants. | Confirm actual migration owner/default ACLs and API exposure in the isolated target and before production migration. |
| Medium | Historical seed is small/synthetic; no production-scale locks, latency, or data distribution exercised. | Validate production shape and restore-test a representative sanitized backup; plan the migration window. |
| Medium | Owners can directly UPDATE/DELETE their own history; immutable-history behavior is not enforced against manual owner writes. | Record this boundary; separately review stricter privileges if database-enforced immutability is required. No cross-user bypass was observed. |
| Medium | Earlier generated-cache corruption and navigation timeouts occurred on the Desktop worktree. | Build from a clean controlled checkout; retain failed-run evidence. Root cause of duplicate cache files remains unknown. |
| Low | Protected untracked CLI cache was generated during validation; final worktree is not clean. | Owner handles the protected artifact separately; do not stage it with release changes. |

The original NULL metadata defect is fixed and regression-tested; it is not an unresolved defect in the revised candidate. Production browser refresh tests now wait for confirmed commits; no claim is made about surviving an aborted in-flight request.

# Evidence locations

Local evidence root: `/tmp/casework-v3-validation-94249c5/`. These artifacts are temporary and must be archived with the release record before relying on them later.

- `supabase_bootstrap.sql`, `fresh_schema_and_seed.sql`, `upgrade_seed.sql`, `upgrade_after.sql`.
- `rls_matrix.sql`, `rls_extra.sql`, `rls-fixed.log`, `rls-fixed-b.log`, `rls-extra.log`.
- `read-persisted.mjs`, `persisted-fixed.log`, `schema-catalog.log`.
- `metadata-before.log`, `metadata-after.log`; durable regression: `supabase/tests/v3_required_metadata.sql`.
- `lint-fixed.log`, `typecheck-fixed.log`, `unit-fixed.log`, `build-clean.log`, `secrecy-clean.log`.
- `playwright-clean-ci.log`, `playwright-fixed-ci.log`, `playwright-production.log`, `playwright-production-fixed.log`, `production-test-results/` (later runs may replace browser artifacts).
- `fixed-project/`, `upgrade-project/`, `failure-project/`, `playwright-production.config.ts`, `clean-candidate/`, cluster `postgres.log`.

# Previous validation verdict (superseded by continuation)

**BLOCKED — ENVIRONMENT/VALIDATION INCOMPLETE**

The corrected migrations and database ownership checks passed, and application regression evidence is strong within its stated guest/mocked-auth limits. It is not yet proven safe to migrate and deploy production. Complete real Supabase application persistence and the rollback rehearsal before requesting owner production approval. Production migration and deployment remain separate, explicitly approved actions.

Final worktree: no uncommitted tracked source changes; this report is untracked, and protected `supabase/.temp/cli-latest` remains untracked. The worktree is **not clean**. No protected artifact was included in the fix commit.

All 316 tracked files match the tested clean export byte-for-byte. The report passed its whitespace check. The isolated PostgreSQL cluster was stopped cleanly at handoff; databases and evidence files were retained.

# Continuation — remaining blockers, 2026-09-18

## Candidate integrity and scope

Reconfirmed branch `feature/casework-v3`, exact HEAD `3b0e6be478c9905ae442570fa08283c4c1c07635`, and no tracked changes at continuation start. Corrected migration 004 still hashes to `dfd1e8d456b8f3aa06f98ffd581f8e8b6454565a2d4ab019a98014a7d409e844`. No product source or migration was changed in this continuation. Prior 480-unit/60-e2e/59-production-journey results remain prior evidence for this same candidate; they were not rerun or counted as new results.

Production data and deployments remained untouched. A connected Vercel read-only `list_teams` request returned zero teams; no target project/settings could be identified through that connection. There was no local Vercel linkage or supplied target credential configuration. No attempt was made to acquire broader permissions or retrieve secret values.

## Blocker 1 — real Supabase Auth / JWT / PostgREST

### Environment and commands

Created an additional disposable database `casework_http` in the existing loopback-only PostgreSQL 17.11 cluster. Downloaded official PostgREST **16.3** macOS ARM64 and compiled official Supabase Auth **v2.197.0** with its Go toolchain. Auth's own upstream migrations created its real users, identities, sessions, refresh-token and other internal tables. This is native self-hosted Auth/PostgREST, **not** a managed Supabase project or the CLI Docker distribution. [Auth architecture](https://supabase.com/docs/guides/auth/architecture), [official Auth source](https://github.com/supabase/auth/tree/v2.197.0), [PostgREST release](https://github.com/PostgREST/postgrest/releases/tag/v16.3).

Local request path:

`Chromium → production Next.js app → loopback HTTP gateway → Supabase Auth / PostgREST → authenticated JWT role → RLS → PostgreSQL`.

- App V3: `127.0.0.1:3000`; prior V2: `127.0.0.1:3001`.
- HTTP gateway: `127.0.0.1:54321`; Auth: 55433; PostgREST: 55434; SMTP sink: 55435; PostgreSQL: 55432.
- The gateway routes requests and supplies CORS headers; it does not mock Auth, REST results, JWT verification, or database operations. PostgREST verifies Auth-issued JWTs. Its connecting role is NOINHERIT, non-superuser and has no BYPASSRLS.
- Magic links were requested using the actual application's Email form, delivered to an in-memory local SMTP sink and opened in Chromium. No fake sessions were injected for these sign-ins. The native Auth default existing-user `/verify` link path was normalized by the test to the gateway's `/auth/v1/verify`; production mail URL paths still require target verification.
- Auth JWT signing material and test sessions stayed in process memory or mode-0600 local credential artifacts, not this report or Git. No production keys were used.
- The local bootstrap initially needed Auth role search_path/ownership and a no-login `postgres` role before upstream migrations could finish. These were test-environment changes only. Application migrations then succeeded unchanged, 001 through corrected 004, through CLI 2.117.0.
- The platform public-table/default-function grants were explicitly supplied in the isolated bootstrap. Successful HTTP access therefore does not prove the live project's default ACLs.

Reproduction artifacts are under `/tmp/casework-v3-http-validation/`:

```sh
node /tmp/casework-v3-http-validation/stack.mjs
node /tmp/casework-v3-http-validation/app.mjs v3 build
node /tmp/casework-v3-http-validation/app.mjs v3 start
# Run from the retained clean-candidate directory:
node node_modules/@playwright/test/cli.js test \
  --config=/tmp/casework-v3-http-validation/playwright.config.ts \
  --grep 'real Auth'
node /tmp/casework-v3-http-validation/http-checks.mjs
```

The stack script generates a new isolated key on restart: rebuild both app artifacts and create fresh test sessions after restarting it. Do not reuse old credential/session artifacts. The temporary bootstrap is a one-time setup for a fresh database, not an idempotent production provisioning script.

### Real identity/request matrix

Final failing browser run used A `e88de1b2-5220-47b0-bdb6-a566fbffc2f5` and B `5f81af0c-599e-4483-b7e5-f111a5f946f4`. Additional synthetic accounts from test-harness iterations remain isolated. `requests.json` records each browser request's method, path, JWT subject and response status, without tokens or query strings.

| Request / flow | Identity | Expected | Actual |
| --- | --- | --- | --- |
| POST `/auth/v1/otp`, GET `/auth/v1/verify`, GET `/auth/v1/user` | A, then B | Real sign-in/session | 200 / 303 / 200; application displayed correct account |
| POST Next `/api/activities/*/commit`, refresh | A | Confirmed draft resumes | Clarifying decision/feedback retained after refresh |
| POST `/rest/v1/rpc/save_activity_attempt_v3` | A | Owned immutable save | 200; standalone and course activity attempts/events persisted |
| GET activity_attempts/activity_events; `/practice/attempts/{id}` | A | Exact saved attempt reopens | Saved title/feedback loaded; refresh succeeded |
| POST course_enrollments, POST course_step_events, PATCH course_enrollments | A | Enrollment, lesson evidence, monotonic context | 201 / 201 / 204; two lessons plus activity derived 3/9 steps after refresh |
| POST `/rest/v1/rpc/save_case_attempt_v3` | A | Version/mode/course retained | 200; AlpineFit content 2, Practice mode, Profitability `case` context persisted |
| GET case_attempts/case_events; historical case URL | A | Exact case can reopen | Stored case reopened/refreshed; fuller replay regions confirmed during recovery test |
| POST `/auth/v1/token` after expired local session metadata | A | SDK restores session using refresh token | 200; same user ID retained; subsequent signed-in page worked |
| POST `/auth/v1/logout` | A | End Auth session | 204; sign-in form returned |
| GET seven persistence surfaces, including explicit A filter | B | No A data | 200 with empty arrays for attempts/events/drills/enrollment/lesson context |
| Direct A activity URL | B | Fail closed | `Attempt unavailable` |
| Direct A historical case URL | B | Fail closed | `No completed case to review`; no replay data |
| Open A's unfinished Hypothesis activity after logout/login | B, same browser tab | Fresh B run; no A decision/events | **FAIL: A's selected Revenue economics claim and revealed evidence restored** |

Saved A example IDs: activity `e404ffc9-f80c-45ef-a7fb-415ab36910a4`; case `d93dc9c6-ad9c-4456-8270-2b42fb223692`.

Additional executable HTTP check: **66 recorded requests passed**, plus private-schema exclusion:

- For all eight public resources, both A→B and B→A SELECT, PATCH and DELETE returned zero rows. Profiles use `id`; the other tables use `user_id`.
- Both V3 save RPCs accepted two identical A retries with unchanged event counts.
- B using A's `p_user_id`, or B's identity with A's existing attempt ID, failed on both RPCs. Anonymous retries failed too.
- Cross-user direct activity/case INSERT returned 403.
- B's `get_case_events` RPC for A returned no rows.
- Tampered JWT returned 401. `Accept-Profile: auth` returned 406; only `public` is exposed.

This complements, rather than replaces, the earlier exhaustive transaction-scoped SQL matrix. It is not a claim that every cross-user INSERT variant was retested over HTTP. There is no server `learning_runs` table; unfinished local runs are the failed isolation surface.

### Release-blocking defect and fix boundary

Reproduction: A signs in → starts `alpinefit-hypothesis-v3` → commits Revenue economics → leaves → signs out → B signs in in the **same tab** → opens the same activity. B sees A's selected hypothesis and restored evidence round. The browser assertion expected zero revealed-evidence elements and received one. The failure screenshot and page snapshot confirm the selected radio value, not merely static page copy.

Root cause: `src/components/activity/ActivityShell.tsx:70` keys session drafts by activity/version/course but not identity; `readRun` restores them without an owner. `AuthPanel` signs out without clearing/scoping application drafts. `usePracticeProgress` invalidates its own React results, but still enumerates unowned local run entries. Related case drafts, generated responses, scratchpads and pending saves also use session-storage keys; changing one activity key would not establish the requested application-wide isolation.

**No source fix was applied.** A blanket storage clear is not an acceptable silent patch: the plan explicitly requires pending attempts to remain until successful save. Correcting this shared lifecycle requires choosing preservation semantics for unfinished drafts and pending saves, handling already-existing unowned keys, and resetting mounted views. The owner was asked whether to preserve user-scoped drafts/pending saves or discard unfinished drafts while preserving pending saves. Until that choice is resolved and covered by regression tests, this candidate is not approvable. No new server-side run feature is proposed.

The failure is client-side cross-identity disclosure; it is **not** a demonstrated RLS/JWT ownership bypass. Database rows remained isolated in every HTTP scenario tested. Cross-device unfinished-run persistence is not supported by V3.0 and was not claimed.

## Blocker 2 — recovery rehearsal

Built exact documented V2 `c9dde86b0529901a7bcee801fcb8e070f72b8b86` from `git archive` into a separate temporary directory. Both old and new production builds used the same real isolated Auth/PostgREST/database configuration.

Executed:

```sh
node /tmp/casework-v3-http-validation/app.mjs v2 build
node /tmp/casework-v3-http-validation/app.mjs v2 start
node node_modules/@playwright/test/cli.js test \
  --config=/tmp/casework-v3-http-validation/playwright.config.ts \
  --grep 'rollback rehearsal'
```

**Final result: 1 passed, 0 failed, 5.4 seconds.**

1. With 004 and real V3 rows already present, signed A into the old production-built app by real magic link.
2. V2 Progress rendered its normal evidence view, excluding V3 records.
3. Completed AlpineFit through V2 with refresh/recovery checkpoints. Required the case count to increase by one and selected that **new** V2 ID for replay.
4. Reopened/replayed the new V2 attempt through V2's actual `/cases/alpinefit-profitability/review?attemptId=...` URL. V3's newer `/attempts/...` route does not exist in V2.
5. V3-only activity route returned HTTP 404 in V2.
6. Every preexisting row in six relevant tables matched its before snapshot in every field. Final run preserved 2 activity attempts, 10 activity events, 3 case attempts, 42 case events, 1 enrollment and 2 course-step events. It added a new V2 case (`b1f64545-823e-4635-99b1-29f6e6c818a2`) and its events without rewriting those originals.
7. In a fresh browser client, signed A into V3 again, reopened its original activity and full case replay, and verified course progress derived as 4/9 (two lessons, activity and capstone). V3 records remained usable.

This demonstrates **application-artifact/database compatibility and data retention**, not an executed Vercel alias rollback. Both artifacts were available on separate local ports; hosting control-plane behavior, existing open tabs, caches and a production traffic cutover were not rehearsed. The original V2 artifact has not been certified as a remedy for the newly found browser-draft issue.

### Safest recovery strategy and exact proposed process

Prefer restoring the verified previous app while **leaving schema 004 and all V3 data intact**. V3-only UI/history is temporarily unavailable under V2; records remain recoverable when a corrected V3 artifact returns. Do not add a down migration or delete attempts.

- **004 succeeds, V3 deploy fails:** keep V2 serving. Verify V2 sign-in, one save/replay and history, plus unchanged V3 counts if any writes already occurred. No database rollback is necessary for this demonstrated shape.
- **V3 application regression after promotion:** stop promotion/automatic advancement; identify the previously recorded production deployment whose source is the verified V2 SHA and whose public environment targets the same database. Under separate owner authorization, use Vercel's project deployment rollback control, or `vercel rollback <verified-previous-deployment-id-or-url>` from the verified linked project. Check `vercel rollback status <project>`, production routing, runtime errors, sign-in, V2 save/replay and retained data. Check plan eligibility/retention before relying on an older deployment. These commands were **not executed**. [Official rollback command](https://vercel.com/docs/cli/rollback).
- **Restore V3 later:** validate the corrected artifact first, then separately approve its promotion. Reopen existing V3 attempts/course state and confirm V2 writes made during recovery remain accessible. Promotion is not authorization to reapply 004.
- **Cross-user leak:** halt release immediately. An app rollback is insufficient if the fault is in database policies/grants or already-open clients; constrain access through an owner-approved incident procedure and investigate. The present local-draft defect must be fixed before release, not accepted because app rollback is possible.
- **Database intervention required:** partial/catalog-ledger mismatch, bad constraints/grants/RLS, actual data corruption/loss, unacceptable database locking/load, or changed production schema. Preserve current writes/evidence; restore the checkpoint into a separate database for analysis. Prefer a reviewed forward repair where safe. Production restore/cutover requires explicit owner approval and reconciliation of post-checkpoint writes.
- **Preserve post-migration data:** never reset the database, drop V3 tables, revert the ledger, or restore an old backup over live writes merely to disable the UI. Capture a current checkpoint before any approved database intervention.

No true database down-migration, destructive restore or live hosting rollback was tested or recommended. The earlier CLI transaction-failure proof remains unchanged.

## Blocker 3 — configuration / grants readiness audit

| Area | Repository/isolated evidence | Production requirement / limitation |
| --- | --- | --- |
| Required app variables | Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` read by browser client | Set both at build time to the same intended project; no PostgreSQL-port URL or lab key |
| Browser/server boundary | Browser uses public key and user's Auth JWT; Next activity APIs evaluate content; no application service-role credential found | Never place service-role, JWT signing secret, database password or CLI token in browser/public variables; operational credentials stay outside build assets |
| Auth | Real email OTP, link verification, user lookup, logout, SDK refresh succeeded | Confirm email provider/delivery, allowed origin redirects, Site URL, gateway mail paths, JWT settings and rate limits; local SMTP is not production delivery proof |
| Table privileges | Actual HTTP SELECT/INSERT/PATCH/RPC worked with modeled platform defaults | Verify authenticated table CRUD, sequence privileges and migration-owner default ACLs; migrations do not independently provision all of them |
| RLS | All eight public tables enabled; owner FOR ALL policies; genuine JWT subject drives `auth.uid()` | Compare actual target definitions and forbid anonymous/unowned leakage; owners still have own-row UPDATE/DELETE |
| RPC grants | Five persistence RPCs invoker, empty search_path, authenticated EXECUTE | PUBLIC revoke does not remove explicit anon EXECUTE; local anon retained it but ownership guards denied writes. Audit actual target ACLs, not just migration text |
| PostgREST | Public-only schema; auth profile request rejected 406; invalid JWT rejected 401 | Ensure Data API enabled, public exposed, auth excluded, JWT configuration matches Auth, schema cache refreshed after migration |
| Migration order | Unchanged 001→002→003→corrected004; real Auth tables/profile trigger work | Expected current target 001–003. Abort if original004 already applied; require separate reviewed forward migration |
| Backup | No production backup inspected/restored | Record restore-tested checkpoint, retention, restore owner, pre-migration schema/ledger/counts and post-checkpoint write reconciliation |
| Deployment | Exact V2 artifact works against004 and retained V3 rows in local rehearsal | Migrate/verify before V3 promotion; retain eligible prior deployment; public vars are part of built artifact |
| Monitoring | Local service/build/browser logs collected; repo specifies no custom alert owner/window | Assign owner, observation window and thresholds for hosting runtime plus Supabase Auth/API/Postgres errors |

Actual production URL/key pairing, JWT settings, grants, schema exposure, backup and current deployed SHA remain **unverified**, not failed. No secrets were requested or printed. The connected read-only Vercel discovery returned no teams; no Supabase administrative connector was available. [Grants versus RLS](https://supabase.com/docs/guides/api/securing-your-api), [function execution privileges](https://supabase.com/docs/guides/database/functions).

## Fresh continuation results and limitations

- Unchanged V3 production build against real isolated public configuration: passed.
- Exact prior V2 production build against that configuration: passed.
- Real Auth/activity/course/case/session browser journey: **1 failed**, specifically same-tab A→B unfinished-draft isolation. The preceding persisted flows passed; this is not recorded as an overall pass.
- HTTP security/idempotency script: **66 recorded requests passed**, plus private-schema denial.
- Focused V2 application recovery rehearsal: **1 passed** with new-save, replay and before/after preservation assertions.
- Previous broad regression results remain 480 unit / 60 e2e / 59 production-mode journeys; not freshly rerun because code is unchanged and release is blocked on the new real-auth defect.
- Early temporary harness iterations used incorrect review/progress headings, V3 URLs against V2, and the native mail prefix. Corrected only the temporary harness; the final draft assertion is an actual product failure. No existing repository tests were weakened.
- No complete real-auth nine-step course, second fresh-versus-upgraded HTTP matrix, production-scale migration load, same-origin deployment cutover, or host rollback command was newly demonstrated. Representative course context/progress and real case replay were demonstrated. Do not expand those claims.

## Updated production rollout proposal — DO NOT EXECUTE

1. Resolve browser draft/pending-state ownership semantics, implement the minimum complete isolation fix, add durable regression coverage and record the new candidate SHA. Rerun affected unit/browser/build/secrecy gates and real same-tab/mounted-view identity-switch checks. Revalidate any modified migration, if applicable.
2. Finish remaining real-auth persistence coverage on the corrected candidate, including course completion, fresh/upgraded shapes and the chosen draft/pending policy. Recheck V2 compatibility if persistence contracts changed. Archive sanitized evidence.
3. Owner identifies the actual production project, deployed SHA/deployment ID, 001–003 ledger/catalog and correct public configuration. Verify grants/RLS/RPC execution, PostgREST exposure, Auth redirects/email, migration-owner defaults and monitoring ownership. Abort on drift or previously applied original004.
4. Verify a restore-tested backup/checkpoint; record table counts, representative record checksums, schema/policies/ACLs, restoration owner and post-checkpoint write-reconciliation plan. Measure/approve a migration lock window and verify previous deployment availability/rollback eligibility.
5. Obtain separate explicit owner approvals for production migration and application deployment, pinned to the corrected validated code SHA and migration hashes.
6. In a verified clean linked checkout, `supabase migration list --linked`; then `supabase db push --linked --dry-run` must propose **only corrected004**. Abort otherwise. Apply `supabase db push --linked` only under approved migration authority.
7. Before app promotion, verify ledger004, schema/constraint/grant/policy/RPC expectations, unchanged historical records and old-app signed-in save/replay. Abort on inconsistency or cross-user access; preserve004 if the app alone has trouble.
8. Deploy/promote the exact approved build with target public config; preserve the previously verified deployment. No source-push shortcut should unexpectedly auto-deploy before migration.
9. Dedicated A/B post-deploy smoke: real sign-in, refresh-token restoration, activity/case save+retry+exact replay, course context/progress, direct foreign URLs, unfinished drafts/pending saves, same-tab and mounted-view sign-out/login, plus guest and answer-secrecy checks.
10. Monitor hosting and Supabase Auth/API/Postgres errors for the agreed window. Declare healthy only on all passes. Cross-user data, save/history loss, version mismatch, migration/catalog drift or persistent auth/5xx errors trigger abort/recovery; retain all post-migration attempts. Database intervention or deployment recovery still requires explicit owner authority.

## Remaining risks

| Severity | Status / impact | Required action |
| --- | --- | --- |
| **Blocking release defect** | User B sees/resumes User A's unfinished same-tab activity draft | Resolve retention semantics; isolate all local draft/pending surfaces and mounted state; add regression coverage; validate revised candidate |
| Blocking approval prerequisite | Actual production configuration/grants/backups/deployment identity not compared | Owner provides/verifies scoped target read-only evidence before approval |
| High validation gap | Complete corrected-candidate real-auth matrix cannot pass while identity leak remains | Fix first, then finish targeted HTTP/browser checks; do not rely solely on old mocked-auth passes |
| Operational limitation | Local dual-port artifact rehearsal is not a live routing rollback or stale-open-tab proof | Confirm exact hosting deployment eligibility and same-origin cutover procedure before production |
| Existing limitations | Synthetic data/lock scale, default-grant assumptions, owner-editable history | Retain prior caveats; verify target shape/ACLs and operational window |

## Continuation evidence and worktree hygiene

Evidence root: `/tmp/casework-v3-http-validation/`.

- Reproduction: `tests/real.spec.ts`, `playwright.config.ts`, `http-checks.mjs`, `bootstrap.sql`, `stack.mjs`, `app.mjs`.
- Results: `browser-real.log` (real draft failure), `requests.json` (redacted browser matrix), `http-checks.log`, `http-matrix.json`, `rollback-browser.log`, `rollback-result.json`, `grants.log`, `build-v3.log`, `build-v2.log`, `results/` screenshots/snapshots.
- Private local-only artifacts: `local-credentials.json`, `flow-state.json` contain disposable test tokens. **Do not commit, publish or include these in a release-evidence bundle.** Auth mail tokens were held in memory by the SMTP sink, not printed. Stop local services before archiving; archive only sanitized evidence.
- Repository convention permits tracked release/evidence Markdown (RELEASE_NOTES, implementation plans and task-state records are already tracked; this report is not ignored). Commit **only `V3_RELEASE_VALIDATION.md`**. The resulting documentation-only HEAD is not a new product candidate: validated source remains `3b0e6be478c9905ae442570fa08283c4c1c07635`.
- Protected CLI cache was not edited, deleted, staged or used to infer migration state. CLI commands continued to use the existing temporary project outside the worktree.
- At handoff, both local application servers, Auth/PostgREST/gateway/SMTP processes and the isolated PostgreSQL cluster were stopped. Evidence and disposable database files were retained. After the report-only commit, tracked files are clean; the existing protected CLI cache remains untracked, so the overall worktree remains dirty. No production process was stopped or changed.

# Previous continuation verdict (superseded)

**BLOCKED — RELEASE FIX REQUIRED**

Real Auth/PostgREST and application recovery are no longer blocked by lack of a runnable local stack. They exposed a concrete browser-draft identity leak which the earlier mocked tests did not establish. Do not approve this candidate for production. No candidate code change was made; a draft/pending-retention decision is required before a safe complete surgical fix. Production migration/deployment remain separate owner-approved operations and were not executed.

# Identity-isolation fix and final continuation — 2026-09-18

## Exact candidate and scope

- Branch: `feature/casework-v3`.
- Candidate: **`628ada71d99e3ce115c3ba8f26e00518e5164336`**, `fix: discard learner drafts on identity changes`.
- Previous code candidate: `3b0e6be478c9905ae442570fa08283c4c1c07635`; the intermediate `bad5a51a63b41aa4f823a59d4843ec1ef93024e7` changed only this report. **The product candidate changed.**
- Environment: same isolated native PostgreSQL 17.11, real Supabase Auth v2.197.0 and PostgREST 16.3 stack described above; browser → real Auth/session/JWT → real PostgREST/RPC → RLS → `casework_http`. Production was not accessed or changed.
- No migration, content, scoring, product-scope, deployment configuration, or production data changes. Migration004 SHA-256 remains `dfd1e8d456b8f3aa06f98ffd581f8e8b6454565a2d4ab019a98014a7d409e844`.
- Prior fresh migration, representative V2 upgrade, ten unchanged historical fixture rows, transaction-scoped RLS, and SQL failure/recovery proofs remain valid: none of their migrations changed. They were not unnecessarily rerun from scratch.

## Owner-selected draft semantics and implementation

The owner explicitly selected **discard unfinished local drafts on identity transition**, not per-user preservation of unfinished drafts.

1. A root identity boundary waits for the Auth identity before exposing learner state, clears prior draft keys, and synchronously remounts learner views when identity changes. Guest↔authenticated and A↔B transitions are included. Same-user token refresh is not an ownership transition and does not discard that user's draft.
2. Activity, case, generated-response, scratchpad, hypothesis, exhibit and V2-drill storage access captures its original identity/generation. Late callbacks cannot recreate discarded drafts, remove the next user's drafts, or become valid again after A→B→A.
3. Saves capture the originating user and attempt, not whichever session exists after evaluation. Completed save payloads are journaled separately under owner/attempt keys before Auth resolution; failed or interrupted saves remain available only to that owner. Returning-owner retry uses the original attempt ID and existing idempotent persistence methods. No server records are deleted or reassigned.
4. Owned pending activity/case/drill payloads survive identity changes. Legacy pending payloads without provable ownership are retained but quarantined, not assigned to the next user. Guest committed history remains guest-owned and is not imported into an authenticated account.
5. Uncommitted draft preservation per user remains a future enhancement, not part of this fix. Session-storage pending journals are not a new cross-device or closed-tab durable queue. Closing/clearing browser storage is outside the identity-transition preservation guarantee.

The initial real-browser failure and pending-owner regression failed before their fixes. Durable tests now cover mounted-state clearing, both identity directions, guest transitions, token/user replacement, refresh, late-callback fencing, pending-save/logout ownership, returning-owner retries, and direct foreign attempt IDs. No prior regression assertion was removed or weakened.

## Real Auth/PostgREST identity and request matrix

Final browser command (local servers already running):

```sh
node /tmp/casework-v3-validation-94249c5/clean-candidate/node_modules/@playwright/test/cli.js \
  test --config /tmp/casework-v3-http-validation/playwright.config.ts
node /tmp/casework-v3-http-validation/http-checks.mjs
```

Result: **3 browser journeys passed / 0 failed (16.4s)**; **66 HTTP ownership/idempotency requests passed**, plus private-schema denial. Browser sessions and Supabase responses were real, not mocked. The pending-save test deliberately held and failed one outgoing RPC to exercise recovery; its eventual retry used the real service.

| Request / path or state | Identity | Expected | Actual |
| --- | --- | --- | --- |
| `POST /auth/v1/otp`, verification link, `GET /auth/v1/user` | Separate real A and B accounts | Authenticated SDK sessions/JWTs | Pass; email captured only by local SMTP sink |
| Activity `/api/activities/*/commit`, `/session`, `/complete`; `POST /rest/v1/rpc/save_activity_attempt_v3` | A | Start, commit, refresh/resume, complete and persist | Pass; exact saved attempt reopened and refreshed |
| `GET /rest/v1/activity_attempts`, `/activity_events`; `/practice/attempts/:id` | A own / B→A | A can read/review; B gets no A rows and unavailable page | Pass |
| Course enrollment/lesson writes and course-context activity/case RPC writes | A | Preserve context; progress derived from persisted evidence | Pass; 3/9 after lessons/activity, 4/9 after capstone; refresh and return restored 4/9 |
| Course/history reads | B | No A enrollment/context/history | Pass; B sees 0/9 and enroll action |
| `POST /rest/v1/rpc/save_case_attempt_v3`; case attempt/events reads; exact attempt URL | A own / B→A | Save mode/version, reopen/replay only owned attempt | Pass; Practice mode, content version2; B receives no completed case |
| `POST /auth/v1/token` with expired local session metadata | A | Real refresh and session restoration remain A-owned | Pass |
| `POST /auth/v1/logout`, then real B login in same tab | A→guest→B | Discard A unfinished Hypothesis run; no A selected answer/evidence | Pass, including refresh |
| B unfinished activity and case scratchpad, logout, A login | B→guest→A | Discard B and old A drafts; restore only A persisted course/history | Pass, including refresh and exact saved activity URL |
| Auth identity replacement while learner view remains mounted | A→guest→B→A | Synchronous local reset, no stale view/callback writes | Pass in component regression; real Auth broadcast exercised in pending-save browser journey |
| Held `save_activity_attempt_v3`, real SDK logout broadcast into saving tab, then B login | Original A save / current B session | Preserve original pending owner/ID; no B save | Pass; original journal unchanged, B rows zero |
| Same pending attempt on A's return | A | Retry under A and save once | Pass; one row with original ID/owner; journal removed only after success; owned direct URL survives refresh |
| Direct SELECT/PATCH/DELETE over all eight public tables | A→B and B→A | No foreign rows or mutations | Pass; 200 with empty representation where applicable |
| Foreign activity/case INSERT and forged-owner/foreign-attempt RPC calls | A/B | Fail closed | Pass; rejected, no reassignment |
| Identical retries of both V3 RPCs | Each original owner | No duplicate attempts/events | Pass |
| Anonymous persistence RPC / forged JWT / `Accept-Profile: auth` | Anonymous/invalid | No writes/private schema | Pass; invalid JWT401, private schema406 |

There is no server-backed `learning_runs` table in this release. Same-identity local activity start/refresh/resume passed; these unfinished runs are deliberately discarded on identity change. Server attempts, events and course evidence are retained. The HTTP matrix supplements the previously retained transaction-scoped PostgreSQL tests; it does not replace them.

Temporary harness corrections: the pending test initially named the RPC without its `_v3` suffix, then released its interception before abort completion. Both harness errors were corrected; the final complete run passed. An initial production-suite invocation used a different Playwright installation from the exported tests; rerunning with the export's matching installation passed. These were not product defects or waived assertions.

## Recovery rehearsal on the revised candidate

**Pass:** exact V2 `c9dde86b0529901a7bcee801fcb8e070f72b8b86` and the revised V3 artifact ran against the same isolated schema after004.

- Before V2 activity: 2 V3 activity attempts, 10 activity events, 1 V3 case attempt, 14 case events, 1 enrollment and 2 lesson events were snapshotted for A.
- V2 signed in, read Progress, completed/saved/replayed a new V2 case. Every snapshotted row remained deeply equal afterward. New V2 history was additive.
- V3-only activity URL returned404 under V2. Restoring the V3 artifact reopened the saved V3 activity/case and restored 4/9 course progress.
- This proves artifact/schema compatibility and retained data, not a hosted same-origin alias cutover. Existing old tabs/caches and hosting rollback eligibility still need owner operational handling. The old V2 artifact is not certified as a security fix for browser draft leakage.

Recovery procedure (proposal, not executed on production):

1. **004 succeeds, V3 deployment fails:** keep the verified V2 deployment serving; do not reverse004. Verify old-app Auth, one V2 save/replay, history and unchanged preexisting rows.
2. **App-only regression after promotion:** halt promotion; under separate owner authority select the recorded prior deployment targeting the same database and restore it using the hosting rollback control (or the previously documented `vercel rollback <verified-previous-deployment-id-or-url>` process). Verify deployment identity, routing/cache behavior, Auth, V2 persistence, history and retained V3 counts before reopening traffic.
3. **Return to fixed V3:** build/promote the approved candidate with correct production public configuration, then verify the stored V3 attempts, exact replay, course progress and A/B draft/pending isolation. Preserve all V2 and V3 writes made during the compatibility window.
4. **Database fault or cross-user access:** app rollback alone is insufficient. Freeze rollout, preserve evidence/current writes, restore the checkpoint into a separate investigation database, and obtain explicit authority for a reviewed forward repair or reconciled restore/cutover. Triggers include RLS/grant errors, ledger/catalog mismatch, corruption, loss, unacceptable locks/load or target schema drift.

No down migration or destructive restore was invented, run, or certified. Dropping V3 schema would destroy retained V3 history and is not this recovery strategy. A backup restore without reconciling later writes can lose user data and is not an acceptable automatic rollback.

## Fresh regression results for the revised source

| Check | Fresh result | Evidence under `/tmp/casework-v3-http-validation/` |
| --- | --- | --- |
| Unit/component suite | **93 files / 489 tests passed** | `identity-unit-final.log` |
| Legacy V1/V2 fixtures | Included and passing in full unit/browser suites | Same log; existing compatibility fixtures unchanged |
| Lint | Pass, no warnings | `identity-lint.log` |
| Typecheck | Pass | `identity-typecheck.log` |
| Full development Playwright | **60 passed, no failures/retries, 1.2m** | `identity-e2e.log` |
| Production-mode Playwright | **59 passed, no failures, 38.4s**; dev-only private activity excluded by established config | `identity-production-regression.log` |
| Real Auth/PostgREST/recovery browser suite | **3 passed, no failures, 16.4s** | `identity-browser-final.log` |
| Real JWT/RLS/RPC matrix | **66 requests passed**, plus schema exposure rejection | `identity-http-checks-final.log`, `http-matrix.json` |
| Production builds | Revised V3 and exact prior V2 pass | `identity-build.log`, `identity-v2-build.log` |
| Accessibility, keyboard, 320/768/1440 reflow | Pass in full browser suites | Browser logs above |
| Precommit network secrecy | Pass in browser suites | Browser logs above |
| Answer-secrecy production bundle scan | Pass; 23 browser chunks, three server-only markers absent | Repeated `npm run check:answer-secrecy` on isolated built export |
| `git diff --check` / staged fix diff | Pass | Run before fix commit |

The isolated export's runtime source matched the committed candidate. Two final test-only adjustments (direct foreign-attempt regressions and a lint cleanup in the boundary test) were run in the worktree's final 489-test/lint/typecheck checks; they did not change the tested production runtime. No claim relies solely on the earlier 480-test result.

## Production configuration/grants audit and remaining limitations

Repository requirements and the earlier configuration table remain authoritative. Rechecked actual isolated catalog evidence in `identity-grants.log`:

- All eight public tables have RLS enabled and authenticated CRUD privileges. Policies use `auth.uid() = user_id` (profiles use `id`) for both visibility and writes.
- All five persistence/read RPCs are invoker functions with empty `search_path` and authenticated EXECUTE. The modeled legacy default ACL also grants anon EXECUTE; ownership guards reject anonymous persistence. Target ACLs must be compared rather than assumed from PUBLIC revocation.
- PostgREST exposes only `public`; private `auth` exposure and invalid JWTs fail closed. Authenticated subjects drive actual PostgreSQL ownership checks.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required by application code, selected at build time. Public URL/key must identify the same target project. No service-role/signing/database secret belongs in browser variables or bundles.
- Auth requires working email delivery, correct Site URL/allowed redirects, matching JWT settings and suitable rate limits. Local mail capture does not prove production delivery.
- Production comparison remains unavailable: a fresh connected read-only Vercel team listing returned `teams: []`; no Supabase administrative connector is exposed. No credentials were requested, copied from protected caches, or printed. Actual deployment SHA, project/key pairing, Auth settings, grants, schema/ledger, backup/checkpoint and rollback artifact eligibility are **unverified**, not asserted to be wrong.

| Severity | Remaining risk / impact | Recommendation |
| --- | --- | --- |
| Blocking validation prerequisite | No authorized target configuration/catalog/checkpoint/deployment evidence | Owner supplies sanitized read-only evidence or appropriate scoped read access; compare before production approval |
| Operational | Local dual-port recovery does not demonstrate hosted cutover, stale tabs or rollback eligibility | Record exact previous deployment and host procedure; verify traffic/cache handling under separately approved rollout |
| Operational | Synthetic upgrade fixtures do not establish production-scale lock duration | Approve a measured maintenance/lock window and recovery owner |
| Documented limitation | Browser-session pending saves cannot survive deliberate tab/storage destruction; legacy unattributed pending payloads are quarantined | Preserve open pending-save tabs; do not claim cross-device/closed-tab queue durability |
| Deferred, not a release feature | Uncommitted per-user local draft preservation | Consider later with explicit ownership design; V3.0 intentionally discards on transition |

The previously blocking A→B draft leak is resolved for this candidate. No known release fix remains from the demonstrated tests. A complete nine-step course over real Auth, production-scale load, and a hosting control-plane rollback were not newly claimed; representative real course persistence and the full repository course journeys passed.

## Exact proposed production sequence — DO NOT EXECUTE

1. Verify actual target project/deployment and current001–003 catalog/ledger, public configuration, Auth redirects/email/JWT, table/sequence/default grants, RLS, RPC EXECUTE and exposed schemas. Abort on drift, unknown target, missing privilege proof or an already-applied original004.
2. Confirm a restore-tested backup/checkpoint; record location/checksum, historical counts/checksums, recovery owner, post-checkpoint write reconciliation, approved lock window, previous deployment ID and rollback eligibility.
3. Obtain **separate explicit owner approval** for migration and application deployment, pinned to candidate `628ada71d99e3ce115c3ba8f26e00518e5164336` and the004 hash above. Keep any source-push auto-deployment from promoting ahead of migration.
4. From a verified clean operational checkout linked to the confirmed target, run `supabase migration list --linked` and `supabase db push --linked --dry-run`. Expected change: only corrected `004_v3_learning.sql`. Any other proposed migration is an abort condition.
5. Under migration authority only, run `supabase db push --linked`. Verify004 ledger/catalog/constraints/indexes/RPCs/grants/RLS and refresh the Data API schema cache if necessary. Compare historical counts/records; verify old V2 Auth/save/replay. On failure, halt and use the documented recovery process; do not delete new schema/history.
6. Under deployment authority only, build/promote the exact approved candidate with the verified target URL/public key. Retain the verified prior deployment and additive schema.
7. Run dedicated A/B production smoke: real sign-in/refresh, activity and case save/retry/exact-version replay, course context/progress, owned and foreign direct URLs, A→logout→B→logout→A, pending-save logout/retry and guest transition. Verify secrecy, safe errors and no history loss.
8. Observe hosting runtime and Supabase Auth/API/PostgreSQL logs for an owner-assigned window/threshold. Declare healthy only after all checks. Cross-user data, history loss, duplicate/reassigned saves, content-version mismatch, persistent Auth/5xx errors or catalog drift require abort and owner-directed recovery. App-only rollback retains004 and all post-migration user data.

## Evidence and worktree hygiene

Sanitized evidence: final logs named above, `requests.json` (method/path/subject/status only), `http-matrix.json`, `identity-grants.log`, `pending-result.json`, `rollback-result.json`, and the temporary test/config scripts. Private `local-credentials.json` and `flow-state.json` contain disposable test credentials and must never be committed or published. The stack generates new local keys on restart, so rebuild both artifacts and obtain fresh sessions when reproducing.

The fix commit contains only the 22 source/test files needed for the identity regression. This tracked report is committed separately under the existing repository documentation convention. The protected CLI cache was not modified, deleted, staged or interpreted during this continuation. After the report commit, tracked files are clean; the existing `supabase/.temp/` remains untracked, so the overall worktree is not clean. Both local application servers, Auth/PostgREST/gateway/SMTP and the isolated PostgreSQL cluster were stopped; evidence/database files were retained. Any documentation-only HEAD after the fix does not change the product candidate SHA above.

# Final validation verdict

**BLOCKED — ENVIRONMENT/VALIDATION INCOMPLETE**

The release-blocking identity defect is fixed at `628ada71d99e3ce115c3ba8f26e00518e5164336`, with fresh real Auth/PostgREST ownership/pending recovery, prior-V2 compatibility, and regression evidence. The later backup/recovery-only continuation below supersedes this section's remaining-blocker assessment. No production migration or deployment was performed.

# Backup/recovery-only continuation — 2026-09-19 UTC

## Scope and evidence provenance

Owner-specified target: Supabase project `vvyozwyodgyszkzuuznr`. The owner reports production ledger 001–003 only, unapplied 004, no V3 sentinel objects, matching corrected 004 checksum, inspected production grants/RLS/RPCs, compatible deployed V2, Supabase Free without managed backups/PITR, and no existing restore rehearsal. These are accepted as supplied context; no production connection was available to recapture them. This continuation does not reopen application validation or change its scope.

Local preflight at `2026-09-19T00:27:51Z`: branch `feature/casework-v3`; code candidate `628ada71d99e3ce115c3ba8f26e00518e5164336`; starting HEAD `d8964dc3eb9bad0cc0cfc9344a84c0a5adf75090` differs from the candidate only in this report. Corrected 004 SHA-256 independently rechecked as `dfd1e8d456b8f3aa06f98ffd581f8e8b6454565a2d4ab019a98014a7d409e844`. Native `pg_dump` and `pg_restore` 17.11 are installed. Production server version remains to be read before choosing a compatible client/restore server.

Connection discovery examined environment-variable names and presence of conventional local libpq service/password and app environment files, without printing credentials. No PostgreSQL/Supabase connection environment was present; checked service/password files and app `.env.local` files were absent. No Supabase connector is exposed. Protected `supabase/.temp/` was not inspected, edited, staged, or deleted. No production request, backup extraction, password reset, linking, role creation, migration, deployment, or data modification occurred.

## Backup and restore outcome

| Required evidence | Current result |
| --- | --- |
| Fresh production capture timestamp/ledger/counts/catalog | Not captured; local preflight time above is not a production snapshot timestamp |
| Source project | `vvyozwyodgyszkzuuznr`, owner identified; live connection not yet verified |
| Backup creation time, filename/artifact ID, size, format | No backup created; unavailable |
| Backup SHA-256 | Unavailable; no artifact exists |
| Isolated restore target and start/end times | Not created or started for this continuation |
| Restore errors/warnings | No restore attempted; no claim of a failed backup/restore |
| Ledger/schema/catalog/ACL/RLS comparison | Not executed |
| profiles/drill_attempts/case_attempts/case_events count comparison | Not executed; no production row counts supplied or invented |
| V2 sign-in/save/history/replay against restored production backup | Not executed; earlier synthetic application recovery evidence remains valid but does not prove backup restoration |

## Proposed extraction and isolated restore procedure — not executed

1. Use an existing authorized PostgreSQL connection for the confirmed project, supplied through a private libpq service file and mode-0600 password file. Require TLS and identify the source from its direct host or session-pooler host/user pairing. Do not use a browser API key as a database password, reset a password, create a role, link the CLI, or let the CLI provision a temporary login. Use the session pooler or direct connection, not the transaction pooler.
2. Read server version and extension/schema dependencies first. Supabase's supported logical-backup procedure exports roles, schema and data, with migration history and custom auth/storage changes handled explicitly. Its CLI implementation requires Docker, unavailable here. The proposed native alternative is a compatible `pg_dump` custom archive plus password-free role/ACL metadata. Final scope must be resolved from live catalog inspection before extraction; a public-only dump is insufficient because profiles reference `auth.users`, the signup trigger belongs to `auth`, and the migration ledger belongs to `supabase_migrations`. Do not silently exclude inaccessible managed objects or extension dependencies and call the result complete.
3. Create private backup storage outside Git, outside temporary cleanup locations, with directory mode0700 and files mode0600 on encrypted local storage. Verify storage protection and retention before writing production data. Keep raw dumps and private error logs out of chat and release documentation. Retain the immutable original archive and a sanitized metadata manifest; no backup upload is authorized by this task.
4. Open a bounded `REPEATABLE READ READ ONLY` transaction on production. Record UTC snapshot time, migration ledger, aggregate counts for the four application tables, canonical catalog metadata and an exported snapshot. Hold the transaction only while needed. Run `pg_dump --format=custom --snapshot=<exported-snapshot> --lock-wait-timeout=5s` through the same source service, with read-only session defaults and output directed straight to the private archive. Never enable row-security filtering to make an incomplete dump succeed. This makes the count/catalog baseline and application-data export refer to the same snapshot despite concurrent writes. Sequence counters are not MVCC snapshots and require separately documented safe next-value checks.
5. Include required schema/data/dependencies, constraints, indexes, functions, triggers, RLS policies, grants/default grants and migration history; capture necessary role attributes/membership without password hashes. Explicitly inventory non-database dependencies such as Auth configuration, Storage objects and encryption prerequisites. Any unsupported dependency blocks a complete recovery claim. Close the source transaction promptly; record dump exit status, UTC completion, tool versions, bytes and SHA-256 without displaying dump contents.
6. Create a new isolated local database/cluster with compatible PostgreSQL/extensions, private filesystem permissions and no externally reachable listener. Do not restore into any existing validation database containing other evidence. Inspect restored definitions before enabling services; keep scheduled jobs, external webhooks, replication, mail and other outbound effects disabled. Restore required roles and archive using `pg_restore --exit-on-error --single-transaction` against an explicitly verified local target, without `--clean` or a production service. Preserve ownership/ACL semantics or record every necessary platform adaptation; never suppress errors and call the restore successful.
7. Before any test writes, compare the snapshot ledger, schemas, tables, columns/defaults/identity settings, constraints, indexes, RPC/function definitions and security settings, trigger definitions/enabled state, RLS policies, ACLs/default ACLs, and exact aggregate counts. Compare canonical metadata, not database-local OIDs. Document all platform differences and ensure sequences cannot collide with restored rows. Report only aggregate comparisons, metadata and digests; never production user records.
8. If practical, connect the retained exact V2 build to isolated Auth/PostgREST using new local keys and local mail capture. Use a newly created synthetic test account for sign-in/save/history/replay after baseline comparison; never send mail to restored production users or reuse production session/signing credentials. Record new test rows separately from restored baseline counts. Stop services after validation and retain the private backup plus sanitized evidence.

References: [Supabase logical backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) documents separate migration history and custom auth/storage handling. [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) documents synchronized snapshots, archive format and client/server compatibility. Neither reference constitutes evidence that this backup was executed.

## Recovery procedure and limitations

**A. Application rollback:** for an application-only regression, restore the recorded known-good V2 deployment under separate owner authority. Keep schema004 and all V2/V3 attempts/events/course evidence. Verify routing, Auth, save/history/replay and retained V3 rows. V3 history can be temporarily unavailable in the V2 UI. Do not restore an old database merely to disable V3.

**B. Database recovery:** use only for corruption, loss, security or catalog failure. Under explicit incident authority, contain affected traffic and preserve the current database/evidence and all recoverable post-checkpoint writes. Verify the retained archive checksum; restore into a separate replacement environment using the successful rehearsal's exact dependency/role/restore procedure once demonstrated. Compare checkpoint ledger/schema/RLS/grants/counts. Review and reconcile later writes before cutover, including deletions and ownership—not only new inserts. If later writes depend on004, restore its reviewed schema on the recovery target before reconciling those V3 records. Revalidate constraints, ownership, version separation, replay, and application service, then seek explicit cutover authority. Do not overwrite production with an old snapshot automatically.

A point-in-time logical backup excludes later commits. Without WAL/PITR or another complete change record, lost post-snapshot writes may be unrecoverable; do not promise lossless reconciliation. The checkpoint will need refreshing close to the separately approved migration. This environment has no demonstrated production-backup restoration yet, so the database recovery process is proposed, not certified.

## Remaining blocker and proposed rollout

Blocking prerequisite: securely configured existing source database connection. The owner was asked to provide only a libpq service name and private configuration file paths, never credential contents. Once available, execute the snapshot backup/isolated restore procedure above and record actual metadata/results here. No additional application regression run is needed for this report-only update.

After successful restore validation only: (1) refresh/check the production checkpoint and unchanged001–003 baseline; (2) retain exact known-good deployment and assign recovery/monitoring owners; (3) obtain separate migration and deployment approval for candidate `628ada71d99e3ce115c3ba8f26e00518e5164336`; (4) confirm the migration dry-run proposes only corrected004; (5) under migration authority apply004 and verify ledger/catalog/RLS/grants/history and V2 compatibility; (6) under deployment authority promote the pinned candidate; (7) run owned/cross-user, persistence/retry/replay/course/identity-transition smoke checks; (8) monitor and invoke the appropriate recovery path on failure. None of those production actions was executed here.

## Current final verdict

**BLOCKED — ENVIRONMENT/VALIDATION INCOMPLETE**

The remaining blocker is access needed to create and restore-test a logical backup. This is not a demonstrated backup/restore failure. Product candidate and migrations are unchanged; prior application and migration test evidence is retained. Production remains untouched.

# Executed logical backup and isolated restore — 2026-09-20 UTC

This section supersedes the preceding connection-blocked backup verdict. **The database logical recovery rehearsal passed within the platform limits below.** It does not authorize migration, deployment, production restore, or a traffic cutover, and it does not certify a complete managed-Supabase recovery.

## Scope and source safety

The owner authorized use of the existing `casework_prod_read` service for read-only backup, isolated restore, verification, and this report update. Neither `~/.pg_service.conf` nor `~/.pgpass` was opened, printed, copied, or modified by the agent during this continuation; libpq used them for its authorized authentication. No credentials or production records are included here or added to Git.

Client-side connection metadata confirmed TLS and the expected Session Pooler/project username for `vvyozwyodgyszkzuuznr`. Source PostgreSQL is **17.6**; native `psql`, `pg_dump`, `pg_restore`, and the local server are **17.11 (Homebrew)**. FileVault was confirmed enabled before extraction. Backup storage is outside the repository and temporary cleanup locations, with directory mode0700 and regular evidence/archive files mode0600. Retention is until owner-authorized disposal; nothing was uploaded.

Source metadata/count capture used an explicit `REPEATABLE READ READ ONLY` transaction with bounded query/lock/idle timeouts. The dump imported its exported snapshot, used custom format and a five-second lock wait limit, and had a 120-second client process bound. No schema/data filters, RLS filtering, or missing-object exclusions were used. The source transaction was closed immediately after extraction. `pg_dump` explicitly establishes a read-only transaction itself; this does not depend on pooler handling of startup `PGOPTIONS`. [PostgreSQL 17 pg_dump implementation](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/bin/pg_dump/pg_dump.c), [pg_dump documentation](https://www.postgresql.org/docs/17/app-pgdump.html).

No production DDL, DML, role change, password reset, configuration change, migration, deployment, CLI linking, or restore was performed.

## Retained checkpoint

Private bundle directory:

`/Users/noahmartz/CaseworkBackups/production-20260920T020212Z/`

| Evidence | Observed result |
| --- | --- |
| Source snapshot capture UTC | `2026-09-20T02:02:13.255852Z` |
| Dump started UTC | `2026-09-20T02:02:17.209655Z` |
| Dump completed UTC | `2026-09-20T02:02:35.274245Z` |
| Archive | `production.dump`, custom format, 330,508 bytes |
| SHA-256 | `dc489dcda6544aa116e86f021dfedede34a68a886164c241fc4e60fe1f9bf6f2` |
| Dump exit / warnings | 0 / none |
| Migration ledger | Exactly `001`, `002`, `003`; full ledger rows matched after restore |
| V3 sentinel tables | Absent after restore; 004 was not applied |
| Final restore UTC | `2026-09-20T02:04:20.838317Z` to `2026-09-20T02:04:21.116891Z` |
| Final restore exit / warnings | 0 / none; metadata supplement succeeded |
| Retained verification script | Passed at `2026-09-20T02:09:54.923810Z` |
| Local cluster stopped UTC | `2026-09-20T02:10:27.101452Z`; stop exit0, not-running status confirmed |

The original archive checksum was reverified after restoration and at shutdown. A preliminary successful dump and its diagnostic rehearsal artifacts remain in the separate private `production-20260920T015253Z` directory; the checkpoint above is the final verified bundle. An earlier capture/parser failure produced no certified archive. Those attempts are not counted as additional successful final rehearsals.

## Restore method and required supplements

The final target was a new `restore-cluster` beneath the private bundle, database `casework_restore`, Unix socket beneath the same private directory, port55439. TCP listening was disabled, socket permissions were0700, WAL senders and logical replication workers were disabled, and there were no subscriptions. No Auth, PostgREST, application, mail, scheduler, or external webhook service was started. Existing unrelated databases/services were not used. Both preliminary clusters created by this continuation were stopped too.

The archive was restored with `pg_restore --exit-on-error --single-transaction`. The source schemas `auth`, `extensions`, `graphql`, `graphql_public`, `pgbouncer`, `public`, `realtime`, `storage`, `supabase_migrations`, and `vault` were retained. No application migrations were applied locally as a substitute for restoring the archive.

The recovery bundle must include its metadata and procedure, **not only `production.dump`**:

- Password-free role attributes, role settings, and memberships were restored from captured metadata. A preliminary attempt with a differently named bootstrap superuser failed to preserve the source grantor semantics before loading data; the final fresh cluster used `supabase_admin` as its bootstrap role and preserved the captured membership grantors/options.
- Source extension versions and owners were preserved. The `extensions` and `vault` schemas and their four extensions were precreated under the captured owners; the restore list skips only their already-satisfied creation commands. Their contents, data, comments, ACLs, and all other archive entries remain included. Local `postgres` was temporarily elevated only while installing its extensions and returned to its captured non-superuser attributes before the archive restore. `plpgsql` already existed under the matching bootstrap owner.
- Vault0.3.1 was built from official [Supabase Vault source](https://github.com/supabase/vault/tree/e68456a5c0a020294b2f4b00400abacd3f857cbb) using existing local PostgreSQL/libsodium and installed as five previously absent local extension files. No existing file was overwritten or unrelated server restarted. Source, build provenance, and installed-file paths are retained in the private bundle. Vault was not preloaded and no production encryption root key was acquired.
- The archive-only trial did not recreate explicit grants for the two GraphQL schemas. `local-metadata-supplement.sql` restores their captured grants, including grant options, and the source database-level grants on the differently named local database. These are explicit local recovery steps, not ignored mismatches.
- Database ownership, UTF8 encoding, ICU provider, `en-US` ICU locale, and `en_US.UTF-8` collate/ctype settings were reproduced. The remaining ICU-version difference is documented below.

Durable evidence includes `manifest.json`, password-free source/restored role and membership metadata, private catalog/ledger metadata, aggregate count and sequence manifests, `restore-status.json`, `verification-summary.json`, `shutdown-status.json`, `artifact-checksums.json`, `local-extension-prerequisites.sql`, `restore-list.txt`, `local-metadata-supplement.sql`, and `RECOVERY-NOTES.md`. The exact capture/restore scripts and runnable `verify-used.py` plus `catalog-query.sql` are retained there. Raw database data and private logs remain outside Git. These scripts target the recorded local paths and intentionally do not overwrite existing rehearsal directories; another rehearsal needs explicitly selected fresh local paths.

## Verification results

All **44** captured table counts matched before any application test writes. Application counts were:

| Table | Source snapshot | Restored |
| --- | ---: | ---: |
| `public.profiles` | 1 | 1 |
| `public.drill_attempts` | 13 | 13 |
| `public.case_attempts` | 1 | 1 |
| `public.case_events` | 8 | 8 |

The full `supabase_migrations.schema_migrations` contents matched. The restored `auth.users` and `auth.identities` each contained one row; no account identifiers or records were displayed. The Auth, Realtime, and Storage migration-history counts also matched.

Canonical comparison passed for all captured groups: **10 schemas, 5 extensions including owners/versions, 50 relations including owners/ACLs/RLS flags, 471 columns, 151 constraints, 149 indexes, 103 functions including definitions/owners/security/settings/ACLs, 4 RLS policies, 6 ordinary triggers, 6 event triggers, 24 default-ACL entries, 47 enum labels, 3 view definitions, and 1 publication with no publication-table mappings**. Role attributes/settings and role memberships matched; database owner and grants matched too.

Normalization removes ACL-array ordering, physical attribute-number gaps left by dropped columns, timezone formatting of the same expiration instant, and equivalent timeout units (`60000` milliseconds versus `1min`). Logical column order is checked separately and matched. Function definitions, privilege grantors/options, constraint/index definitions, ownership, and RLS expressions were not normalized away. The retained verification script asserts these results and fails on a mismatch. These are catalog, ledger, and aggregate-count comparisons; no claim of a separate row-by-row application-data digest comparison is made.

All three sequence definitions and captured states matched. Independent checks showed safe next values for `auth.refresh_tokens_id_seq`, `public.case_events_id_seq`, and `realtime.subscription_id_seq`. Sequence states are not MVCC snapshots; this comparison and safe-next-value check supplement the shared table snapshot.

## Platform limits and release consequence

- **Collation runtime differs:** source ICU collation version `153.121`, local `153.136`, despite matching provider/locale. Source server17.6 and local17.11 also differ. Successful local index/constraint creation and catalog comparison do not certify identical text ordering for all possible values on a replacement platform. Match production's runtime or explicitly validate/reindex for the replacement runtime before a real recovery/cutover.
- **Application service recovery was not certified against this backup.** The captured `authenticator` role requires `supautils, safeupdate` session-preload libraries, which this local runtime does not provide. Its role configuration was preserved, not weakened to run an HTTP smoke test. No V2 sign-in/save/history/replay test against these restored production rows was run. Earlier synthetic real Auth/PostgREST and V2 recovery results above remain prior evidence, not new evidence from this backup.
- **External configuration remains separate:** Supabase Auth/provider/SMTP settings, signing/encryption root keys, PostgreSQL role passwords, Vercel configuration, and any external service configuration are not in this logical bundle. Their recovery was not attempted. Vault secrets, Storage buckets/objects, and PostgreSQL large objects were all empty at capture; there were no external Storage objects to extract for this checkpoint. The bundle does not prove that an arbitrary replacement managed project will work without its service/configuration prerequisites. [Supabase backup/restore considerations](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
- **Retention/recovery-point limit:** this is an on-device, FileVault-protected logical checkpoint, not an off-device disaster-recovery copy or WAL/PITR. Later commits are excluded. Refresh the checkpoint and verify unchanged baseline before any separately authorized migration; do not overwrite production with this older snapshot or promise recovery of later writes.

**Updated verdict: PASS — scoped database logical backup/restore verification; complete platform/application recovery remains unverified.** The missing-connection/no-tested-logical-backup blocker is resolved. The platform limits above prevent promoting this into an unconditional complete-recovery or release-approval claim. Application candidate and migration004 are unchanged; its SHA-256 remains `dfd1e8d456b8f3aa06f98ffd581f8e8b6454565a2d4ab019a98014a7d409e844`. Production migration and deployment remain prohibited without separate owner approval.

# Independent service-based backup continuation — 2026-09-20 UTC

## Provenance and immediate stop condition

This continuation began at report-only HEAD `c00efff94280f2bf7e3cf42ac2d7c44de6d17428` on `feature/casework-v3`. Candidate remains `628ada71d99e3ce115c3ba8f26e00518e5164336`; corrected004 hash remains `dfd1e8d456b8f3aa06f98ffd581f8e8b6454565a2d4ab019a98014a7d409e844`. The preceding “Executed logical backup and isolated restore” section appeared as a concurrent, uncommitted report addition during this run. It is preserved verbatim and is not attributed to this run. Its `CaseworkBackups` bundle is distinct from the `casework-release-backups` bundle below; timestamps, checksums, targets and methods must not be mixed.

**Observed production drift:** snapshot `2026-09-20T02:12:12.091097Z` contained ledger `[001,002,003]`. A supplemental metadata-only `BEGIN READ ONLY` query at `2026-09-20T02:24:58.771291Z` returned `[001,002,003,004]`. All production commands in this continuation were read-only. No source migration, deployment, role/configuration change, password reset, row mutation or restore was executed by this agent. The actor, deployment state and actual applied004 definition were not investigated after the drift was detected. Further production requests stopped. The previously proposed “apply only004” rollout must not be executed against this now-changed ledger.

## Backup artifact and production baseline

Used only the owner-configured `casework_prod_read` service. The agent did not open, display, copy or modify either credential file; only file modes were inspected, and libpq consumed them for authentication. Initial metadata retrieval confirmed PostgreSQL17.6 and ledger001–003. Full certificate/hostname verification initially failed with system CAs; the public Supabase Root2021 CA was retrieved over HTTPS and supplied explicitly. Subsequent source connections used `sslmode=verify-full`, confirmed TLS and project identity `vvyozwyodgyszkzuuznr`. No production SSL setting changed.

Private artifact directory, outside Git and temporary cleanup locations:

`/Users/noahmartz/casework-release-backups/v3-restore-20260920-RBy8f8/`

FileVault is enabled; directory permissions0700, archive/role files0600. No backup was uploaded or committed. The original artifacts were not edited during restoration.

| Artifact/evidence | Actual value |
| --- | --- |
| Snapshot UTC | `2026-09-20T02:12:12.091097Z` |
| Dump start / bundle completion UTC | `2026-09-20T02:12:12.652Z` / `2026-09-20T02:12:33.652Z` |
| Source | Supabase `vvyozwyodgyszkzuuznr`, PostgreSQL17.6, Session Pooler |
| Tools | `pg_dump`, `pg_dumpall`, `pg_restore`, `psql`17.11 Homebrew |
| Format | Full PostgreSQL custom archive; separate password-free role SQL |
| Archive | `production.dump`, **330,508 bytes** |
| Archive SHA-256 | `4cf357fd63235f25f9604c578a1779bb3a1729102bbf9a01a40c5c67149118fe` |
| Role artifact | `roles.sql`, **6,173 bytes** |
| Roles SHA-256 | `1d9d73893833db279d49aab8407deddfe21e43749215f035f2d66d9f42b50616` |
| Dump/roles/snapshot stderr | Empty; successful exit |
| Baseline ledger | `001`, `002`, `003` |

The baseline catalog and counts were captured in an explicit repeatable-read/read-only transaction. `pg_dump --format=custom --snapshot=<exported snapshot> --lock-wait-timeout=5s` used that same live snapshot. Read-only session defaults and bounded SQL/lock/idle timeouts were requested; no table/schema filtering or `--enable-row-security` was used. The transaction was rolled back immediately after extraction. Roles were exported with `pg_dumpall --roles-only --no-role-passwords`; no role password hashes are present. The manifest's completion timestamp includes this role export, which is a separate catalog read rather than part of the table snapshot.

| Application table | Snapshot count | Pristine restore count | Original count after smoke, excluding new test user |
| --- | ---: | ---: | ---: |
| profiles | 1 | 1 | 1 |
| drill_attempts | 13 | 13 | 13 |
| case_attempts | 1 | 1 | 1 |
| case_events | 8 | 8 | 8 |

Auth users and identities each had one row and matched on restoration. Storage objects and Vault secrets each had zero rows. No production user-level records or identifiers were printed. The archive necessarily contains private Auth/application data and must remain private.

## Isolated restore and catalog verification

Target: a new PostgreSQL17.11 cluster in the private directory above, database `casework_restored`, private Unix socket, port55442, `listen_addresses=''`, socket permissions0700, host authentication rejected. A separate database `casework_restore_smoke` was cloned from the verified restore for the browser test. No production connection settings were passed to either local service. The pristine restore was retained unchanged through the smoke test.

Restore start/end: `2026-09-20T02:15:27.072Z` / `2026-09-20T02:15:27.504Z`. Used `psql --single-transaction --set ON_ERROR_STOP=1` for role definitions and `pg_restore --exit-on-error --single-transaction` for the unfiltered archive. No application migrations were run as a substitute for restoration.

Observed and resolved local differences:

- The first role restore failed atomically on an explicit managed-platform membership grantor. A derived `roles.local.sql` substitutes only `GRANTED BY supabase_admin` with the local bootstrap superuser `casework_restore_admin`. All70 captured CREATE/ALTER/GRANT statements subsequently matched after this declared substitution; membership recipients/options, role attributes and settings were preserved. The original role artifact remains intact.
- Installed local Vault0.3.1 from official source tagv0.3.1, commit `6e0cd916242d922a646e4d611cc215e09dd429f4`, using existing libsodium. Build prerequisite issues (gettext include and Homebrew's unavailable SDK path) were resolved locally. No production encryption key was obtained, and no Vault data required decryption.
- Native extension installation changed extension-member owners/ACLs, and archive-only restoration omitted explicit grants on the empty GraphQL schemas. `restore-platform-metadata.sql`, generated from the captured baseline, restored60 affected schema/relation/function metadata objects on the local target. This supplement is required for the reported comparison, not an ignored mismatch or production change.
- Restore processes warned that `/dev/null` used as a deliberately empty local password file was not a plain file. Connections used the isolated socket; final checks used a new empty local0600 file. No database restore errors occurred after the role adaptation.

Canonical comparison passed for the captured groups: **9 schemas, 5 extension names/versions, 50 relations including ownership/ACL/RLS flags, 471 columns, 151 constraints, 149 indexes, 102 functions including definitions/ownership/security/settings/ACLs, 6 ordinary triggers, 4 policies, 24 default ACL entries, three ledger versions, and the aggregate counts above**. All application-schema objects matched even before platform metadata supplementation. The signup trigger on `auth.users` matched too.

Normalization sorts ACL arrays and converts physical attribute positions to logical ordinal positions because dropped columns leave numbering holes. Definitions, grantors/options, column types/defaults/nullability, ownership, RLS expressions and function security were not removed from comparison. `canonical-comparison.json` records all groups passing. Case-event sequence next-value safety also passed.

Scope limitations discovered before finalization:

- The initial metadata query used `NOT LIKE 'pg_%'`, which also excluded the platform `pgbouncer` schema. The archive was unfiltered and did include it, but the9-schema/102-function comparison does **not** claim complete metadata comparison of `pgbouncer`. The supplemental production query captured that schema, its one function, six event triggers,47 enum labels and three views privately; these were not folded into the snapshot comparison after the production ledger drift was detected. The separate preceding report describes its own broader comparison.
- This local target used UTF8 with C locale, whereas supplemental source metadata reports ICU/en-US, collate/ctype `en_US.UTF-8`, collation version153.121. Application save/replay passed, but this rehearsal does not establish equivalent collation behavior, database-level grants or extension-container ownership on a final replacement platform. Use a matching Supabase/runtime target and verify these before an actual database cutover. Do not call this a complete managed-platform recovery proof.

## V2 application compatibility against restored data

**1 real browser journey passed, 0 failed, 5.4s** (test duration4.7s). All219 tracked files in the retained V2 export matched `c9dde86b0529901a7bcee801fcb8e070f72b8b86` before rebuilding. Its production build succeeded with newly generated local public configuration.

Browser → local Supabase Authv2.197.0 → fresh JWT → PostgREST16.3 → restored smoke clone was real. Auth was started with `serve`, without applying Auth migrations. SMTP was a local sink; no mail was sent to production users. A new local `casework_restore_authenticator` role was used with the same anon/authenticated/service-role memberships and NOINHERIT; the source authenticator's unsupported `supautils,safeupdate` preload configuration remained preserved. This adapter is a documented local service limitation, not evidence those production platform libraries were restored.

The synthetic account signed in via the V2 form and real magic link, initially saw no original user's attempts, completed AlpineFitV2 with refresh, saved through `save_case_attempt_v2`, opened Progress/history, replayed the saved attempt and refreshed replay. No production user session or identity was used. Afterward, SQL aggregate SHA-256 comparisons showed every original application row unchanged across all four tables, excluding only the synthetic user's newly added data. This compares restored rows before/after the local smoke; it is not an independent source-to-archive row-digest claim.

Final local verification at `2026-09-20T02:22:02.179Z` passed preservation, sequence safety, disabled TCP, and pristine ledger001–003. All application/Auth/PostgREST/mail/gateway processes created by this run and its PostgreSQL cluster were stopped. Listener checks returned no remaining listeners on their ports. Database files and evidence remain retained.

## Recovery bundle and procedure

Retain the entire private recovery bundle, not only the archive. Relevant files include `manifest.json`, `baseline.json`, `roles.sql`, `roles.local.sql`, `restore-platform-metadata.sql`, `catalog-query.sql`, `restore-result.json`, `canonical-comparison.json`, `role-comparison.json`, `final-verification.json`, `smoke-result.json`, build/browser logs, and retained extraction/restore/test scripts. `recovery-artifacts.json` lists sizes and hashes of the13 core procedure/backup files. Local test keys/session material and raw logs must never be published.

Supplement hashes: `roles.local.sql` SHA-256 `c552842689d3a6e097969d352310f275b1d09f7ea56f4b015f1bc0f6d81b9e31`; `restore-platform-metadata.sql` SHA-256 `cde3dc8136ed3fc5b31ae45adaec2ab19fcefd0ab42e6727943810d9805771de`; `recovery-artifacts.json` SHA-256 `f70c5d5d146ee7525ba7dd674d70aac676f35b7f3689674eec635b2fd9031520`. Private baseline/supplemental metadata is part of the recovery record; no backup content is embedded here.

**Normal application rollback:** retain004 and all post-migration history; restore the exact recorded known-good V2 deployment under separate owner authority, then verify Auth/save/history/replay. The earlier mixed-V3-data rehearsal remains the compatibility evidence; this run independently establishes V2 usability of this pre-004 restored backup.

**Database incident recovery:** under separate incident authority, contain the failure and preserve current data/evidence. Verify the archive checksum. Restore into a new compatible target, restore required role/extension/schema/ACL metadata using the recorded process, and verify ledger/catalog/RLS/aggregate counts before serving traffic. Reconcile every recoverable post-checkpoint change, including deletes and ownership changes. If later records require004, first apply the separately reviewed schema on the recovery target, then reconcile those records and test versions/replay. Restore external Auth/SMTP/signing/API/deployment configuration through their own secure operational records. Validate the final target's collation and platform dependencies before authorizing cutover. Never automatically replace the live database with this earlier snapshot.

This backup predates the observed004 ledger entry. It excludes later commits; those may be unrecoverable without another complete change record. Local FileVault storage is not an off-device disaster-recovery copy. No off-device transfer, production recovery, traffic cutover or destructive operation is authorized or demonstrated.

## Revised proposed rollout — halted pending drift reconciliation

1. Owner identifies the actor/time and exact004 contents applied during this validation, plus actual current deployment. Preserve both timestamped ledger observations. Do not rerun004 or repair the ledger.
2. Independently compare current004 constraints/functions/grants/RLS with the reviewed migration and candidate. If the original defective004 or another variant was applied, require a separately reviewed forward correction; never assume the local file checksum proves the live migration contents.
3. Refresh and restore-test a current checkpoint, retaining this pre-004 backup and reconciling post-snapshot writes. Confirm platform recovery prerequisites and the known-good rollback deployment.
4. Obtain separate owner approval for any required forward database action and for application deployment. An already-correct004 does not need reapplication.
5. Under the relevant authority only, complete any required database verification/action, then promote candidate `628ada71d99e3ce115c3ba8f26e00518e5164336` with the verified public configuration.
6. Run owned/cross-user Auth, save/retry, exact replay, course and identity-transition smoke checks; monitor the agreed error thresholds/window. Invoke application rollback or database incident recovery according to the failure type, preserving later writes.

## Final verdict for this continuation

**BLOCKED — ENVIRONMENT/VALIDATION INCOMPLETE**

The previously missing connection and untested logical-backup evidence are resolved for the documented scope. The observed production baseline change and platform-recovery limits prevent a release-ready claim. No product source or migration changed. All production operations performed by this agent were read-only. This report's concurrent addition is preserved; report changes are left uncommitted to avoid staging another writer's work. Protected `supabase/.temp/` remains untracked and untouched.

# Owner-authorized production rollout — 2026-09-20 UTC

This section supersedes the preceding rollout stop condition. The owner authorized the documented recovery limitations, migration004, and deployment of the validated candidate.

## Production migration

Applied only `supabase/migrations/004_v3_learning.sql` to Supabase project `vvyozwyodgyszkzuuznr` in one transaction and recorded ledger version004 with statement count25. The live migration matched the reviewed file. Post-migration verification passed for the ledger, expected V3 tables and `case_attempts` columns, owner RLS policies, grants/RPCs, unchanged historical row counts, and public schema shape. The corrected V2 authenticated write/replay check passed inside a rolled-back transaction. No prior migration was modified or rerun, and no synthetic database write was committed.

## Application deployment

- Immutable Vercel URL: `https://cases-f471yipv7-22amiibos-projects.vercel.app`
- Deployment ID: `dpl_Dg7VsK8oS9J8W2yUiBetZYaJ4Bex`
- Commit: `628ada71d99e3ce115c3ba8f26e00518e5164336`
- Production alias: `https://cases-pi-five.vercel.app`
- Vercel state: Ready; production aliases resolved to this deployment

The production build completed successfully. Its non-blocking warning was that npm's allow-scripts policy did not approve the `unrs-resolver@1.12.2` postinstall script. Vercel CLI bootstrap also reported one dependency engine warning and a deprecated `tar` dependency warning.

## Focused production smoke

The owner's normal Chrome session remained authenticated in the production application. The isolated Playwright Chromium profile could request a magic link but did not establish a session; the owner reported the application works and retains login in normal Chrome. This was classified as an isolated automation-profile limitation, not a demonstrated production authentication failure. Automated retries were stopped at the owner's direction.

| Check | Result |
| --- | --- |
| Sign-in/session retention | Passed by owner observation in normal Chrome |
| Practice | Unverified post-deploy |
| One flagship lab | Unverified post-deploy |
| Activity save/history | Unverified post-deploy |
| Progress | Unverified post-deploy |
| AlpineFit Practice Mode | Unverified post-deploy |
| AlpineFit Interview Mode | Unverified post-deploy |
| Case replay/debrief | Unverified post-deploy |
| Profitability course resume/progress | Unverified post-deploy |
| Logout/login identity isolation | Unverified post-deploy |

The test harness performed no production smoke-test writes before authentication stopped it. No application rollback or destructive database rollback was performed.

## Final production status

**RELEASED — production migration and application deployment succeeded. Post-deploy authenticated browser coverage is limited.** No concrete production application failure was observed. The known-good V2 deployment remains the application rollback path while retaining the additive V3 schema and history. The next owner action is to exercise the unverified V3 flows during normal use and report any material failure; a material regression should trigger the retained V2 application rollback path.
