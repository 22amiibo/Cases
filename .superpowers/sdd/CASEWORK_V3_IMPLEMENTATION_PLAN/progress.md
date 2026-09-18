# SDD ledger — plan: CASEWORK_V3_IMPLEMENTATION_PLAN.md

## Pre-flight review

| Tasks | Shared surface | Finding / ruling |
| --- | --- | --- |
| 8 | Own requirements | Coherent. Persist mode separately from scaffolding and enforce policy at shared engine/projection seams. |
| 9 | Own requirements | Coherent. Reuse exact-version repository reads and existing review projection. |
| 10 | Own requirements | Coherent. Keep V1/V2/V3 evidence semantically separate and aggregate through pure functions. |
| 11 | Own requirements | Coherent. Derive course completion from immutable evidence; preserve existing V2 lesson references byte-for-byte. |
| 12 | Own requirements | Coherent. Production migration and deployment remain outside implementation authorization. |
| 8 → 9 | Case mode metadata and case events feed replay/debrief. | Task 9 consumes the persisted mode and ordered events introduced by Task 8; exact content version remains authoritative. |
| 8 → 10 | Mode-specific case attempts feed Progress and achievements. | Task 10 reads explicit `caseMode`; it must never infer mode from scaffolding. |
| 8 → 11 | Practice-mode AlpineFit is the course capstone. | Task 11 must use the exact Task 8 case mode/version reference. |
| 9 → 10 | Historical replay routes are linked from unified history. | Task 10 should link to Task 9 routes and not duplicate replay loading. |
| 9 → 11 | Course capstone debrief reuses case debrief. | Task 11 references the shared Task 9 review outcome. |
| 10 → 11 | Course evidence changes recommendation priority and Continue. | Task 11 extends the pure Task 10 inputs with course enrollment/step evidence. |
| 8–11 → 12 | Shared routes and metadata feed final navigation/hardening. | Task 12 integrates existing public surfaces only; no speculative filters or navigation entries. |

No task conflicts with the V3.0 acceptance criteria. Owner replaytest recorded `proceed` on 2026-09-18. Production migration and deployment remain separately gated.

## Task status

- Tasks 0–7: complete; Task 7 owner replaytest recorded `proceed` on 2026-09-18.
- Task 8: complete; explicit AlpineFit Practice and Interview modes are persisted
  and server-enforced, with deferred Interview feedback and timing evidence.
- Task 9: pending.
- Task 10: pending.
- Task 11: pending.
- Task 12: pending.
