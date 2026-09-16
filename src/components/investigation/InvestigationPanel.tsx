"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import concepts from "@/content/concepts.json";
import { FrameworkBuilder } from "@/components/framework/FrameworkBuilder";
import { CalculationTask } from "@/components/math/CalculationTask";
import { RecommendationBuilder } from "@/components/recommendation/RecommendationBuilder";
import type { RevealedFact } from "@/core/case-engine";
import type {
  LearnerCaseDefinition,
  LearnerSessionView,
  StoredCaseWorkspace,
} from "@/core/learner-case";
import {
  CaseEventSchema,
  type CaseEvent,
  type FrameworkBranch,
  type FrameworkSubmission,
} from "@/core/schema";
import { EvidencePanel } from "./EvidencePanel";
import { Scratchpad } from "./Scratchpad";
import styles from "./InvestigationPanel.module.css";

type InvestigationPanelProps = {
  caseDefinition: LearnerCaseDefinition;
};

function collectConceptIds(branches: FrameworkBranch[]): string[] {
  return branches.flatMap((branch) => [
    branch.conceptId,
    ...collectConceptIds(branch.children),
  ]);
}

function caseStorageKey(caseId: string) {
  return `casework:guest-session:${caseId}`;
}

function restoreWorkspace(
  stored: string | null,
): StoredCaseWorkspace {
  const emptyWorkspace = {
    events: [],
    clarificationComplete: false,
    clarificationDraftIds: [] as string[],
  };

  if (!stored) return emptyWorkspace;

  try {
    const serialized = JSON.parse(stored) as {
      events?: unknown[];
      clarificationComplete?: unknown;
      clarificationDraftIds?: unknown[];
    };
    if (!Array.isArray(serialized.events)) return emptyWorkspace;

    return {
      events: serialized.events.flatMap((rawEvent) => {
        const event = CaseEventSchema.safeParse(rawEvent);
        return event.success ? [event.data] : [];
      }),
      clarificationComplete: serialized.clarificationComplete === true,
      clarificationDraftIds: Array.isArray(serialized.clarificationDraftIds)
        ? serialized.clarificationDraftIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
    };
  } catch {
    return emptyWorkspace;
  }
}

function evidenceLabel(id: string) {
  return id.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function InvestigationPanel({ caseDefinition }: InvestigationPanelProps) {
  const clientReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!clientReady) return null;

  return <HydratedInvestigationPanel caseDefinition={caseDefinition} />;
}

function HydratedInvestigationPanel({ caseDefinition }: InvestigationPanelProps) {
  const router = useRouter();
  const storageKey = caseStorageKey(caseDefinition.id);
  const [workspace, setWorkspace] = useState(() =>
    restoreWorkspace(window.sessionStorage.getItem(storageKey)),
  );
  const elapsedOffset = useRef(
    Math.max(0, ...workspace.events.map((event) => event.atMs)),
  );
  const startedAt = useRef<number | null>(null);
  const initialEvents = useRef(workspace.events);
  const latestRequest = useRef(0);
  const [view, setView] = useState<LearnerSessionView | null>(null);
  const [synthesisEvidenceIds, setSynthesisEvidenceIds] = useState<string[]>([]);
  const [nextStepNodeId, setNextStepNodeId] = useState("");

  const { clarificationComplete, clarificationDraftIds, events } = workspace;

  async function loadView(nextEvents: CaseEvent[]) {
    const requestId = ++latestRequest.current;
    const response = await fetch(`/api/cases/${caseDefinition.id}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: nextEvents }),
    });
    if (!response.ok) throw new Error("Unable to load case session");
    const nextView = (await response.json()) as LearnerSessionView;
    if (requestId === latestRequest.current) setView(nextView);
    return nextView;
  }

  useEffect(() => {
    let active = true;
    const requestId = ++latestRequest.current;
    void fetch(`/api/cases/${caseDefinition.id}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: initialEvents.current }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load case session");
        return response.json() as Promise<LearnerSessionView>;
      })
      .then((nextView) => {
        if (active && requestId === latestRequest.current) setView(nextView);
      });
    return () => {
      active = false;
    };
  }, [caseDefinition.id]);

  useEffect(() => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        events,
        clarificationComplete,
        clarificationDraftIds,
      }),
    );
  }, [clarificationComplete, clarificationDraftIds, events, storageKey]);

  const facts = view?.facts ?? [];
  const availableActions = view?.availableActions ?? [];
  const selectedClarificationIds = useMemo(
    () => new Set(clarificationDraftIds),
    [clarificationDraftIds],
  );
  const hasFramework = events.some(
    (event) => event.type === "framework_submitted",
  );
  const interviewerResponse = view?.interviewerResponse ?? null;

  async function record(event: CaseEvent) {
    const nextEvents = [...events, event];
    setWorkspace((current) => ({ ...current, events: nextEvents }));
    return loadView(nextEvents);
  }

  function timestamp() {
    const now = Date.now();
    if (startedAt.current === null) startedAt.current = now;
    return elapsedOffset.current + now - startedAt.current;
  }

  function submitFramework(submission: FrameworkSubmission) {
    record({
      type: "framework_submitted",
      conceptIds: collectConceptIds(submission.branches),
      priorityConceptId: submission.priorityConceptId,
      atMs: timestamp(),
    });
  }

  function submitSynthesis() {
    if (!nextStepNodeId || synthesisEvidenceIds.length === 0) return;
    record({
      type: "synthesis_submitted",
      evidenceIds: synthesisEvidenceIds,
      nextStepNodeId,
      atMs: timestamp(),
    });
  }

  const availableCalculations = view?.calculations ?? [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/cases">← All cases</Link>
        <span>Guest session · {events.length} events saved</span>
      </header>

      <section className={styles.prompt} aria-labelledby="case-title">
        <p>Case prompt · {caseDefinition.category}</p>
        <h1 id="case-title">{caseDefinition.title}</h1>
        <p>{caseDefinition.prompt}</p>
        <aside>
          <span>Objective</span>
          {caseDefinition.objective}
        </aside>
      </section>

      <div className={styles.workspace}>
        <section className={styles.controls} aria-label="Case controls">
          {!hasFramework && !clarificationComplete && (
            <ClarificationStep
              caseDefinition={caseDefinition}
              selectedIds={selectedClarificationIds}
              onToggle={(clarificationId) =>
                setWorkspace((current) => ({
                  ...current,
                  clarificationDraftIds: current.clarificationDraftIds.includes(
                    clarificationId,
                  )
                    ? current.clarificationDraftIds.filter(
                        (id) => id !== clarificationId,
                      )
                    : [...current.clarificationDraftIds, clarificationId],
                }))
              }
              onContinue={() => {
                const clarificationEvents: CaseEvent[] = clarificationDraftIds.map(
                  (clarificationId) => ({
                    type: "clarification_selected",
                    clarificationId,
                    atMs: timestamp(),
                  }),
                );
                const nextEvents = [...events, ...clarificationEvents];
                setWorkspace((current) => ({
                  ...current,
                  clarificationComplete: true,
                  events: nextEvents,
                }));
                void loadView(nextEvents);
              }}
            />
          )}

          {!hasFramework && clarificationComplete && (
            <StepCard eyebrow="Structure" title="Build your issue tree">
              <p>
                Choose distinct branches and mark where you would begin. Your
                structure guides the interview; the next questions remain
                authored and structured.
              </p>
              <FrameworkBuilder concepts={concepts} onSubmit={submitFramework} />
            </StepCard>
          )}

          {view?.currentStage === "investigate" && (
            <>
              <StepCard eyebrow="Investigate" title="Choose the next question">
                <p>
                  Select one of the available branches to reveal the next piece
                  of authored evidence.
                </p>
                <div className={styles.actionList}>
                  {availableActions.map((action) => (
                    <button
                      type="button"
                      key={action.id}
                      onClick={() =>
                        record({
                          type: "node_investigated",
                          nodeId: action.id,
                          atMs: timestamp(),
                        })
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </StepCard>

              {interviewerResponse && (
                <aside className={styles.interviewer} aria-live="polite">
                  <span>Interviewer</span>
                  <p>{interviewerResponse}</p>
                </aside>
              )}

              {availableCalculations.map((calculation) => (
                <CalculationTask
                  definition={calculation}
                  key={calculation.id}
                  onSubmit={async ({ taskId, answer }) => {
                    const nextView = await record({
                      type: "calculation_submitted",
                      taskId,
                      answer,
                      atMs: timestamp(),
                    });
                    return nextView.completedCalculationIds.includes(taskId);
                  }}
                />
              ))}

              {availableCalculations.length > 0 && (
                <SynthesisStep
                  facts={facts}
                  evidenceIds={synthesisEvidenceIds}
                  nextStepNodeId={nextStepNodeId}
                  actions={availableActions}
                  onToggleEvidence={(factId) =>
                    setSynthesisEvidenceIds((current) =>
                      current.includes(factId)
                        ? current.filter((id) => id !== factId)
                        : current.length < 3
                          ? [...current, factId]
                          : current,
                    )
                  }
                  onNextStepChange={setNextStepNodeId}
                  onSubmit={submitSynthesis}
                />
              )}
            </>
          )}

          {view?.currentStage === "recommend" && view.recommendation && (
            <RecommendationBuilder
              recommendation={view.recommendation}
              facts={facts}
              onSubmit={async (recommendation) => {
                await record({
                  type: "recommendation_submitted",
                  ...recommendation,
                  atMs: timestamp(),
                });
                router.push(`/cases/${caseDefinition.id}/review`);
              }}
            />
          )}

          {view?.currentStage === "complete" && (
            <StepCard eyebrow="Complete" title="Recommendation recorded">
              <p>
                Your complete event history is saved in this browser for replay
                and review.
              </p>
            </StepCard>
          )}
        </section>

        <div className={styles.sideRail}>
          <EvidencePanel
            facts={facts}
            exhibits={view?.exhibits ?? []}
          />
          <Scratchpad storageKey={`${storageKey}:scratchpad`} />
        </div>
      </div>
    </main>
  );
}

function StepCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.stepCard}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function ClarificationStep({
  caseDefinition,
  selectedIds,
  onToggle,
  onContinue,
}: {
  caseDefinition: LearnerCaseDefinition;
  selectedIds: Set<string>;
  onToggle: (clarificationId: string) => void;
  onContinue: () => void;
}) {
  return (
    <StepCard eyebrow="Clarify" title="Ask the useful questions first">
      <p>Choose the clarifications that will shape your initial structure.</p>
      <div className={styles.options}>
        {caseDefinition.clarificationOptions.map((option) => (
          <label key={option.id}>
            <input
              type="checkbox"
              checked={selectedIds.has(option.id)}
              onChange={() => onToggle(option.id)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className={styles.primaryButton}
        disabled={selectedIds.size === 0}
        onClick={onContinue}
      >
        Continue to framework
      </button>
    </StepCard>
  );
}

function SynthesisStep({
  facts,
  evidenceIds,
  nextStepNodeId,
  actions,
  onToggleEvidence,
  onNextStepChange,
  onSubmit,
}: {
  facts: RevealedFact[];
  evidenceIds: string[];
  nextStepNodeId: string;
  actions: LearnerSessionView["availableActions"];
  onToggleEvidence: (factId: string) => void;
  onNextStepChange: (nodeId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <StepCard eyebrow="Synthesize" title="Prepare your recommendation">
      <p>Select up to three pieces of evidence and the next investigation you would prioritize.</p>
      <div className={styles.options}>
        {facts.map((fact) => (
          <label key={fact.id}>
            <input
              type="checkbox"
              checked={evidenceIds.includes(fact.id)}
              onChange={() => onToggleEvidence(fact.id)}
            />
            <span>{evidenceLabel(fact.id)}</span>
            <small>{fact.text}</small>
          </label>
        ))}
      </div>
      <label className={styles.selectLabel}>
        Next investigation
        <select
          value={nextStepNodeId}
          onChange={(event) => onNextStepChange(event.target.value)}
        >
          <option value="">Choose an investigation</option>
          {actions.map((action) => (
            <option value={action.id} key={action.id}>
              {action.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={styles.primaryButton}
        disabled={evidenceIds.length === 0 || !nextStepNodeId}
        onClick={onSubmit}
      >
        Move to recommendation
      </button>
    </StepCard>
  );
}
