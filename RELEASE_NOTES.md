# Casework V2 Wave 1 pilot release candidate

Date: 2026-09-17

Status: local release candidate. Production migration and deployment remain
pending explicit owner approval.

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

## Data safety and rollback

Migrations `002_v2_learning_evidence.sql` and
`003_case_event_evidence.sql` are additive. They preserve V1 rows and keep V2
attempt metadata/events available under row-level security. Live migration must
follow a confirmed backup and migration-state review.

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
| Recoverable backup | Complete, controller-confirmed: checksummed schema and data backups were created. Artifact locations and checksum values remain in the controller's release record. |
| Live migration apply | Pending controller action after code-fix review and required approval. This implementation task did not apply migrations. |
| Transaction-scoped live RLS smoke | Pending controller action after migration apply. Record proof that the owner can read the owned attempt and ordered events, a second user cannot read either, and the smoke transaction rolls back. |
| Live signed-in save and exact-version replay | Pending approved release smoke. Record the saved attempt ID, content version, and replay result without learner content. |
| Production answer-secrecy inspection | Pending approved deployment. Record the inspected precommit responses and result. |
| Rollback rehearsal | Pending approved release window. Record the V1 active-version selection and restoration result without deleting V2 rows. |
