# Casework

Casework is a deterministic case-interview practice app. It combines focused
skill drills, six hand-authored full cases, transparent scoring, case replay,
and progress-based practice recommendations.

## Architecture decision: No AI in V1

V1 does not install or call an AI, LLM, embedding, or machine-learning API.
Case paths, reveal rules, calculations, scoring, feedback, and recommendations
come from versioned authored content and deterministic TypeScript logic. Inputs
are structured; free text is available only for ungraded scratch work.

## Local setup

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Guest drill and case
history uses browser `sessionStorage`, so the complete AlpineFit demo works
without an account or environment variables.

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

The migration at `supabase/migrations/001_initial.sql` creates profiles, drill
attempts, case attempts, case events, row-level security policies, validation
constraints, and the atomic case-save function. Never expose the Supabase
service-role key to the browser or add it to `NEXT_PUBLIC_*` variables.

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
experience remains available. Run the full verification commands before each
release.
