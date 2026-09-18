# Casework

Casework is a deterministic case-interview practice app. It combines focused
skill drills, six hand-authored full cases, transparent scoring, version-safe
case replay, and diagnostic practice recommendations. The Wave 1 V2 pilot adds
generated-response practice to three cases and three reps in each of six skills.

## Architecture decision: deterministic, no AI

Casework does not install or call an AI, LLM, embedding, or machine-learning API.
Case paths, reveal rules, calculations, scoring, feedback, and recommendations
come from immutable versioned authored content and deterministic TypeScript
logic. V2 generated prose is committed and reviewed, but never semantically
scored. Authored comparisons remain hidden until commitment.

## Local setup

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Guest drill and case
history uses browser `sessionStorage`, so the complete pilot works without an
account or environment variables. Signed-in history and historical replay use
Supabase when configured.

## Supabase authentication and persistence

Signed-in persistence is enabled only when both public variables are present:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Put local values in `.env.local`; environment files are ignored by Git. To
apply the checked-in schema with the Supabase CLI after linking the project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

The additive migrations in `supabase/migrations/` create the original practice
tables, add V2 version/evidence metadata, and retain ordered case events. Row-
level security and user-scoped reads prevent one learner from opening another
learner's attempt. Never expose the Supabase service-role key to the browser or
add it to `NEXT_PUBLIC_*` variables.

## Version-safe replay

Progress links each saved V2 case attempt to its attempt ID. Replay first loads
that owned attempt's `content_version` and ordered stored events, then resolves
the matching immutable case definition. If the definition is unavailable,
Casework shows only a safe stored-attempt summary and never substitutes active
content.

## Content authoring rules

- Validate cases with `CaseDefinitionSchema` and `assertValidCase`; never render
  unvalidated content.
- Keep stable lowercase slug IDs for cases, facts, nodes, exhibits, and drills.
- Source every exhibit from authored facts and keep hidden critical/root-cause
  metadata out of the learner projection before completion.
- Give each case at least two exhibits, a low-value decoy, a relevant
  noncritical branch, and at least two efficient paths.
- Do not grade one exact investigation path. Credit authored alternate paths
  and evidence discovered before a submission.
- Keep calculations deterministic, unit-labeled, and tolerance-checked.
- Map every Learn lesson to a valid drill skill and `/drills/{skillId}` route.
- Preserve the V1 library contract: five drill skills with ten exercises each
  and exactly six full cases in the approved category mix.

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Unit and component tests run with Vitest. Critical guest, keyboard,
accessibility, responsive, case, drill, and progress journeys run with
Playwright in Chromium.

## Deployment

The app is compatible with Vercel. Configure the two public Supabase variables
in the Vercel project when account persistence is required; otherwise the guest
experience remains available. Production migration and deployment require owner
approval.

Before an approved release:

1. Confirm a recoverable database backup and compare local/remote migration
   state with `supabase migration list`.
2. Dry-run the linked migration apply (and use `supabase db reset` when a local
   Supabase runtime is available), then run the full verification commands
   above.
3. Inspect browser network responses before commitment for authored answers,
   rubric correctness, scoring metadata, and hidden case conclusions.
4. Apply `supabase db push` and deploy only after the owner approves both live
   actions. Record live sign-in, RLS, save, replay, and answer-secrecy smoke
   results in the release evidence record in `RELEASE_NOTES.md`.

Rollback does not delete V2 attempts. Point the three pilot entries in
`activeCaseVersions` back to version `1`, redeploy the application, and leave
the additive V2 columns and rows intact for recovery or later analysis.
