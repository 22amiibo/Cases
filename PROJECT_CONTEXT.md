# Casework Project Context

Last updated: 2026-09-16

## Purpose

Casework is a no-AI case-interview practice website. It teaches consulting
problem-solving through targeted drills, six deterministic interactive cases,
case replay, transparent scoring, and progress-based practice recommendations.

This file is the durable handoff point for future chats. Read it before making
changes, then update the Progress Log and Next Action before ending a work
session.

## Source of Truth

- Implementation plan: `/Users/noahmartz/Downloads/2026-09-15-case-interview-practice-mvp.md`
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

## Decisions and Notes

- `create-next-app` selected current stable Next.js 16.3.5.
- Next.js 16 dynamic route params are promises; dynamic pages must `await params`
  or use React `use` in a client page.
- Vitest 5 requires `@types/node` 22+; the generated Node 20 type dependency was
  upgraded to resolve the peer conflict.
- Playwright commands need elevated execution in this environment because the
  sandbox cannot bind the local Next.js test port.
- The current visual direction is editorial and calm: warm paper, deep green,
  restrained orange, serif display typography, and high-information layouts.

## Next Action

Implement Task 2 from the plan: write failing schema tests, then add
`src/core/schema.ts` and `src/content/concepts.json`, verify tests/typecheck, and
commit as `feat: define deterministic case and drill schemas`.
