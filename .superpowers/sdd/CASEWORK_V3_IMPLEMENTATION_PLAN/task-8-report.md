# Task 8 report — explicit AlpineFit case modes

## Outcome

Task 8 adds explicit `practice` and `interview` runs for AlpineFit V2. The case
catalog launches the supported mode through `?mode=`, while unsupported modes
are rejected on the page and every case API route.

`CaseRunContext` carries the mode and exact content version through the engine,
learner projections, session route, cycle routes, hypothesis routes, and exhibit
route. Practice retains the existing generated-response loop. Interview removes
hints, blocks checkpoint retries and revisiting investigated nodes, hides
immediate quantitative feedback and authored exhibit insights, and shows a
count-up interview timer.

All answer-reveal endpoints validate mode. Their Interview commit responses use
a deferred comparison with no authored diagnostic rules, so correctness stays
private until case completion. Interview events persist
`authoredComparisonViewed: false`; Practice events retain `true`. The
backward-compatible event schema accepts both values, and the engine rejects
`false` in Practice. Interview exhibit interpretations may deliberately contain
no authored insight IDs; Practice still requires one.

Guest workspace and pending-save keys are mode-specific for Interview while
preserving legacy Practice keys. Completing AlpineFit V2 also writes its V3
attempt with explicit `caseMode`. Historical review derives the replay context
from deferred timing evidence until Task 9 consumes the persisted V3 mode
directly.

## TDD evidence

Initial red tests covered the missing policy module, distinct learner mode,
Interview retry rejection, and session mode validation. The full Interview
Playwright journey then exposed two V2 contract gaps: literal
`authoredComparisonViewed: true` and mandatory exhibit insight IDs. Regressions
now prove the schema accepts the deferred timing value, Practice rejects it,
Interview accepts it, and Practice continues to require an exhibit insight.
The route regression asserts an Interview calculation completes without
immediate feedback and persists `authoredComparisonViewed: false`.

Focused route tests cover Interview secrecy and retry rejection for cycle,
hypothesis, and exhibit commits. The browser journey captures every reveal
response and confirms it omits the authored comparison and the known overtime
answer before completion.

## Validation

- Focused Vitest: 16 files, 84 tests passed.
- Playwright: `e2e/alpinefit-v2-flow.spec.ts` passed all 3 journeys, covering
  the existing accessible Practice flow, full Practice refresh/retry flow, and
  full Interview secrecy/debrief flow.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`
  passed. Typecheck initially encountered stale duplicate `.next/types` files;
  the production build regenerated them and the rerun passed.

## Scope and constraints

No dependencies were added. V1 and existing V2 Practice default behavior stay
compatible. `src/content/drills/quantitative 2.json` and `supabase/.temp/` were
not edited or staged.
