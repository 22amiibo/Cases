"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import concepts from "@/content/concepts.json";
import { FrameworkBuilder } from "@/components/framework/FrameworkBuilder";
import { CalculationTask } from "@/components/math/CalculationTask";
import { QuantitativeFeedbackPanel } from "@/components/practice/QuantitativeFeedbackPanel";
import { RecommendationBuilder } from "@/components/recommendation/RecommendationBuilder";
import type { RevealedFact } from "@/core/case-engine";
import { flattenFrameworkConceptIds } from "@/core/framework-events";
import type { LearningCycleReveal } from "@/core/learning-cycle";
import type { CommittedResponse } from "@/core/schema";
import type { QuantitativeFeedback } from "@/core/quantitative-feedback";
import { createCaseAttempt } from "@/data/attempts";
import { getBrowserPracticeSession } from "@/data/browser-practice";
import type { CaseAttempt } from "@/data/repository";
import {
  clearPendingAttempt,
  loadPendingAttempt,
  savePendingAttempt,
} from "@/data/pending-attempts";
import type {
  LearnerCaseDefinition,
  LearnerSessionView,
  StoredCaseWorkspace,
} from "@/core/learner-case";
import {
  CaseEventSchema,
  type CaseEvent,
  type FrameworkSubmission,
} from "@/core/schema";
import { EvidencePanel } from "./EvidencePanel";
import {
  clearHypothesisPracticeStorage,
  HypothesisStep,
  type HypothesisCompletion,
} from "./HypothesisStep";
import { Scratchpad } from "./Scratchpad";
import { CaseGeneratedStep, clearCaseCycleStorage } from "./CaseGeneratedStep";
import { CaseWalkthrough } from "./CaseWalkthrough";
import { InvestigationGroups } from "./InvestigationGroups";
import styles from "./InvestigationPanel.module.css";

type InvestigationPanelProps = {
  caseDefinition: LearnerCaseDefinition;
};

function caseStorageKey(caseId: string) {
  return `casework:guest-session:${caseId}`;
}

function pendingCaseKey(caseId: string) {
  return `case:${caseId}`;
}

function restorePendingCaseAttempt(caseId: string): CaseAttempt | null {
  const pending = loadPendingAttempt<CaseAttempt>(
    window.sessionStorage,
    pendingCaseKey(caseId),
  );
  if (
    !pending ||
    pending.caseId !== caseId ||
    !Array.isArray(pending.events) ||
    pending.events.some((event) => !CaseEventSchema.safeParse(event).success)
  ) {
    return null;
  }
  return pending;
}

function createEmptyWorkspace(contentVersion: number): StoredCaseWorkspace {
  return {
    contentVersion,
    events: [],
    clarificationComplete: false,
    clarificationDraftIds: [] as string[],
  };
}

type RestoredWorkspace =
  | { status: "ready"; workspace: StoredCaseWorkspace }
  | { status: "expired" };

function restoreWorkspace(stored: string | null, contentVersion: number): RestoredWorkspace {
  const emptyWorkspace = createEmptyWorkspace(contentVersion);

  if (!stored) return { status: "ready", workspace: emptyWorkspace };

  try {
    const serialized = JSON.parse(stored) as {
      events?: unknown[];
      clarificationComplete?: unknown;
      clarificationDraftIds?: unknown[];
      contentVersion?: unknown;
    };
    if (!Array.isArray(serialized.events)) return { status: "expired" };
    const storedVersion = serialized.contentVersion === undefined ? 1 : serialized.contentVersion;
    if (storedVersion !== contentVersion) return { status: "expired" };
    const parsedEvents = serialized.events.map((rawEvent) =>
      CaseEventSchema.safeParse(rawEvent),
    );
    if (parsedEvents.some((event) => !event.success)) {
      return { status: "expired" };
    }
    if (
      serialized.clarificationDraftIds !== undefined &&
      (!Array.isArray(serialized.clarificationDraftIds) ||
        serialized.clarificationDraftIds.some((id) => typeof id !== "string"))
    ) {
      return { status: "expired" };
    }

    return {
      status: "ready",
      workspace: {
        contentVersion,
        events: parsedEvents.flatMap((event) =>
          event.success ? [event.data] : [],
        ),
        clarificationComplete: serialized.clarificationComplete === true,
        clarificationDraftIds: Array.isArray(serialized.clarificationDraftIds)
          ? serialized.clarificationDraftIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [],
      },
    };
  } catch {
    return { status: "expired" };
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
  const [restoredWorkspace] = useState(() =>
    restoreWorkspace(window.sessionStorage.getItem(storageKey), caseDefinition.version),
  );
  const [sessionExpired, setSessionExpired] = useState(
    restoredWorkspace.status === "expired",
  );
  const [workspace, setWorkspace] = useState(() =>
    restoredWorkspace.status === "ready"
      ? restoredWorkspace.workspace
      : createEmptyWorkspace(caseDefinition.version),
  );
  const elapsedOffset = useRef(
    Math.max(0, ...workspace.events.map((event) => event.atMs)),
  );
  const startedAt = useRef<number | null>(null);
  const initialEvents = useRef(workspace.events);
  const latestRequest = useRef(0);
  const [pendingCaseAttempt] = useState(() =>
    restorePendingCaseAttempt(caseDefinition.id),
  );
  const caseAttemptId = useRef<string | null>(
    pendingCaseAttempt?.attemptId ?? null,
  );
  const [recoveryStatus, setRecoveryStatus] = useState<
    "idle" | "saving" | "error"
  >("idle");
  const [view, setView] = useState<LearnerSessionView | null>(null);
  const [viewStatus, setViewStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [synthesisEvidenceIds, setSynthesisEvidenceIds] = useState<string[]>([]);
  const [nextStepNodeId, setNextStepNodeId] = useState("");
  const calculationFeedbackKey = `${storageKey}:quantitative-feedback`;
  const [calculationFeedback, setCalculationFeedback] = useState<QuantitativeFeedback | null>(() => {
    try {
      return JSON.parse(window.sessionStorage.getItem(calculationFeedbackKey) ?? "null") as QuantitativeFeedback | null;
    } catch {
      return null;
    }
  });

  const { clarificationComplete, clarificationDraftIds, events } = workspace;

  async function loadView(nextEvents: CaseEvent[], commitView = true) {
    const requestId = ++latestRequest.current;
    try {
      const response = await fetch(`/api/cases/${caseDefinition.id}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: nextEvents,
          contentVersion: caseDefinition.version,
        }),
      });
      if (!response.ok) throw new Error("Unable to load case session");
      const nextView = (await response.json()) as LearnerSessionView;
      if (commitView && requestId === latestRequest.current) {
        setView(nextView);
        setViewStatus("ready");
      }
      return nextView;
    } catch (error) {
      if (commitView && requestId === latestRequest.current) {
        setViewStatus("error");
      }
      throw error;
    }
  }

  useEffect(() => {
    if (sessionExpired) return;
    let active = true;
    const requestId = ++latestRequest.current;
    void fetch(`/api/cases/${caseDefinition.id}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: initialEvents.current,
        contentVersion: caseDefinition.version,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load case session");
        return response.json() as Promise<LearnerSessionView>;
      })
      .then((nextView) => {
        if (active && requestId === latestRequest.current) {
          setView(nextView);
          setViewStatus("ready");
        }
      })
      .catch(() => {
        if (active && requestId === latestRequest.current) {
          setViewStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [caseDefinition.id, caseDefinition.version, sessionExpired]);

  useEffect(() => {
    if (sessionExpired) return;
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        contentVersion: caseDefinition.version,
        events,
        clarificationComplete,
        clarificationDraftIds,
      }),
    );
  }, [caseDefinition.version, clarificationComplete, clarificationDraftIds, events, sessionExpired, storageKey]);

  const facts = view?.facts ?? [];
  const availableActions = view?.availableActions ?? [];
  const selectedClarificationIds = useMemo(
    () => new Set(clarificationDraftIds),
    [clarificationDraftIds],
  );
  const hasFramework = events.some(
    (event) => event.type === "framework_submitted",
  );
  const hasOpening = events.some(
    (event) => event.type === "case_opening_submitted",
  );
  const interviewerResponse = view?.interviewerResponse ?? null;

  async function record(event: CaseEvent) {
    const nextEvents = [...events, event];
    setWorkspace((current) => ({ ...current, events: nextEvents }));
    return loadView(nextEvents);
  }

  async function saveCompletedRecommendation(recommendationEvent: CaseEvent) {
    const nextEvents = [...events, recommendationEvent];
    const completedView = await loadView(nextEvents, false);
    if (!completedView.review) throw new Error("Completed case review was not returned");
    const practiceSession = await getBrowserPracticeSession();
    caseAttemptId.current ??= crypto.randomUUID();
    const attempt = createCaseAttempt({
      attemptId: caseAttemptId.current,
      userId: practiceSession.userId,
      caseId: caseDefinition.id,
      review: completedView.review,
      events: nextEvents,
      completedAt: new Date().toISOString(),
      contentVersion: caseDefinition.version,
      scaffoldingLevel: caseDefinition.scaffoldingLevel,
    });
    savePendingAttempt(window.sessionStorage, pendingCaseKey(caseDefinition.id), attempt);
    await practiceSession.repository.saveCaseAttempt(attempt);
    clearPendingAttempt(window.sessionStorage, pendingCaseKey(caseDefinition.id));
    setWorkspace((current) => ({ ...current, events: nextEvents }));
    setView(completedView);
    router.push(`/cases/${caseDefinition.id}/review`);
  }

  async function recordGeneratedEvent(event: CaseEvent) {
    if (event.type === "recommendation_submitted") {
      await saveCompletedRecommendation(event);
      return;
    }
    await record(event);
  }

  function timestamp() {
    const now = Date.now();
    if (startedAt.current === null) startedAt.current = now;
    return elapsedOffset.current + now - startedAt.current;
  }

  function submitFramework(submission: FrameworkSubmission) {
    const frameworkEvent: CaseEvent = caseDefinition.version >= 2
      ? {
          type: "framework_submitted",
          eventSchemaVersion: 2,
          branches: submission.branches,
          priorityConceptId: submission.priorityConceptId,
          rationale: submission.rationale ?? "Starting priority recorded.",
          atMs: timestamp(),
        }
      : {
          type: "framework_submitted",
          conceptIds: flattenFrameworkConceptIds(submission.branches),
          priorityConceptId: submission.priorityConceptId,
          atMs: timestamp(),
        };
    void record(frameworkEvent).catch(() => undefined);
  }

  function submitSynthesis() {
    if (!nextStepNodeId || synthesisEvidenceIds.length === 0) return;
    void record({
      type: "synthesis_submitted",
      evidenceIds: synthesisEvidenceIds,
      nextStepNodeId,
      atMs: timestamp(),
    }).catch(() => undefined);
  }

  async function commitExhibitResponse(
    exhibitId: string,
    response: CommittedResponse,
  ): Promise<{
    reveal: LearningCycleReveal;
    insightOptions: Array<{ id: string; label: string }>;
  }> {
    const result = await fetch(
      `/api/cases/${caseDefinition.id}/exhibits/${exhibitId}/commit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentVersion: caseDefinition.version,
          events,
          response,
        }),
      },
    );
    if (!result.ok) throw new Error("Unable to commit exhibit response");
    return result.json() as Promise<{
      reveal: LearningCycleReveal;
      insightOptions: Array<{ id: string; label: string }>;
    }>;
  }

  async function commitHypothesisResponse(
    phase: "initial" | "update",
    response: CommittedResponse,
  ): Promise<LearningCycleReveal> {
    const result = await fetch(`/api/cases/${caseDefinition.id}/hypotheses/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentVersion: caseDefinition.version,
        events,
        phase,
        response,
      }),
    });
    if (!result.ok) throw new Error("Unable to commit hypothesis response");
    return ((await result.json()) as { reveal: LearningCycleReveal }).reveal;
  }

  async function completeHypothesis(completion: HypothesisCompletion) {
    const result = await fetch(`/api/cases/${caseDefinition.id}/hypotheses/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentVersion: caseDefinition.version,
        events,
        ...completion,
        atMs: timestamp(),
      }),
    });
    if (!result.ok) throw new Error("Unable to complete hypothesis");
    const payload = (await result.json()) as { event: CaseEvent };
    await record(payload.event);
    clearHypothesisPracticeStorage(window.sessionStorage, caseDefinition.id);
  }

  const availableCalculations = view?.calculations ?? [];

  async function retryPendingCase() {
    if (!pendingCaseAttempt || recoveryStatus === "saving") return;
    setRecoveryStatus("saving");
    try {
      const practiceSession = await getBrowserPracticeSession();
      const restoredAttempt = {
        ...pendingCaseAttempt,
        userId: practiceSession.userId,
      };
      await practiceSession.repository.saveCaseAttempt(restoredAttempt);
      const completedView = await loadView(restoredAttempt.events, false);
      clearPendingAttempt(
        window.sessionStorage,
        pendingCaseKey(caseDefinition.id),
      );
      setWorkspace((current) => ({
        ...current,
        events: restoredAttempt.events,
      }));
      setView(completedView);
      router.push(`/cases/${caseDefinition.id}/review`);
    } catch {
      setRecoveryStatus("error");
    }
  }

  function startFreshCase() {
    window.sessionStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(`${storageKey}:scratchpad`);
    window.sessionStorage.removeItem(calculationFeedbackKey);
    clearHypothesisPracticeStorage(window.sessionStorage, caseDefinition.id);
    clearCaseCycleStorage(window.sessionStorage, caseDefinition.id);
    const emptyWorkspace = createEmptyWorkspace(caseDefinition.version);
    initialEvents.current = emptyWorkspace.events;
    setWorkspace(emptyWorkspace);
    setView(null);
    setViewStatus("loading");
    setSessionExpired(false);
  }

  if (sessionExpired) {
    return (
      <WorkspaceFailure
        title="This case session expired"
        message="The saved case state is incomplete or invalid, so Casework stopped before loading a partial session. Start fresh to continue safely."
        actionLabel="Start a fresh case"
        onAction={startFreshCase}
      />
    );
  }

  if (viewStatus === "error") {
    return (
      <WorkspaceFailure
        title="Case workspace could not be loaded"
        message="The case session service is unavailable. Your saved browser session has not been discarded."
        actionLabel="Try loading again"
        onAction={() => {
          setViewStatus("loading");
          void loadView(events).catch(() => undefined);
        }}
      />
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/cases">← All cases</Link>
        <div className={styles.headerActions}>
          <CaseWalkthrough />
          <span>Guest session · {events.length} events saved</span>
        </div>
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
          {viewStatus === "loading" && (
            <StepCard eyebrow="Loading" title="Loading case workspace">
              <p role="status">Checking your saved session and available actions…</p>
            </StepCard>
          )}
          {viewStatus === "ready" && pendingCaseAttempt && (
            <StepCard eyebrow="Save pending" title="Finish saving your case">
              <p>
                Your completed case is still in this browser and can be saved
                without submitting a second attempt.
              </p>
              {recoveryStatus === "error" && (
                <p role="alert">The completed case still could not be saved.</p>
              )}
              <button
                type="button"
                disabled={recoveryStatus === "saving"}
                onClick={() => void retryPendingCase()}
              >
                {recoveryStatus === "saving"
                  ? "Saving completed case"
                  : "Retry saving completed case"}
              </button>
            </StepCard>
          )}
          {viewStatus === "ready" && !hasFramework && !hasOpening && caseDefinition.openingPrompt && (
            <CaseGeneratedStep
              caseId={caseDefinition.id}
              contentVersion={caseDefinition.version}
              kind="opening"
              prompt={caseDefinition.openingPrompt}
              events={events}
              atMs={timestamp}
              onEvent={recordGeneratedEvent}
            />
          )}
          {viewStatus === "ready" && !hasFramework && !hasOpening && !caseDefinition.openingPrompt && !clarificationComplete && (
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

          {viewStatus === "ready" && !hasFramework && (clarificationComplete || hasOpening) && (
            <StepCard eyebrow="Structure" title="Build your issue tree">
              <p>
                Choose distinct branches and mark where you would begin. Your
                structure guides the interview; the next questions remain
                authored and structured.
              </p>
              <FrameworkBuilder
                concepts={concepts}
                onSubmit={submitFramework}
                requireRationale={caseDefinition.version >= 2}
              />
            </StepCard>
          )}

          {view?.currentStage === "investigate" && (
            <>
              {view.hypothesis && (
                <HypothesisStep
                  key={view.hypothesis.phase}
                  caseId={caseDefinition.id}
                  practice={view.hypothesis}
                  facts={facts}
                  onCommit={commitHypothesisResponse}
                  onComplete={completeHypothesis}
                />
              )}
              <StepCard eyebrow="Investigate" title="Choose the next question">
                <p>
                  Select one of the available branches to reveal the next piece
                  of authored evidence.
                </p>
                <InvestigationGroups
                  items={availableActions}
                  listClassName={styles.actionList}
                  renderItem={(action) => (
                    <button
                      type="button"
                      onClick={() => {
                        void record({
                          type: "node_investigated",
                          nodeId: action.id,
                          atMs: timestamp(),
                        }).catch(() => undefined);
                      }}
                    >
                      <span>{action.label}</span>
                      {(action.prerequisiteLabels?.length ?? 0) > 0 && (
                        <small>
                          After {action.prerequisiteLabels?.join(" → ")}
                        </small>
                      )}
                    </button>
                  )}
                />
              </StepCard>

              {interviewerResponse && (
                <aside className={styles.interviewer} aria-live="polite">
                  <span>Interviewer</span>
                  <p>{interviewerResponse}</p>
                </aside>
              )}

              {availableCalculations.map((calculation) => calculation.responsePrompt ? (
                <CaseGeneratedStep
                  key={calculation.id}
                  caseId={caseDefinition.id}
                  contentVersion={caseDefinition.version}
                  kind="calculation"
                  itemId={calculation.id}
                  prompt={calculation.responsePrompt}
                  unitOptions={calculation.unitOptions}
                  events={events}
                  atMs={timestamp}
                  onEvent={recordGeneratedEvent}
                  onQuantitativeFeedback={(feedback) => {
                    setCalculationFeedback(feedback);
                    window.sessionStorage.setItem(calculationFeedbackKey, JSON.stringify(feedback));
                  }}
                />
              ) : (
                <CalculationTask
                  definition={calculation}
                  key={calculation.id}
                  onSubmit={async ({ taskId, answer }) => {
                    const nextView = await record({ type: "calculation_submitted", taskId, answer, atMs: timestamp() });
                    return nextView.completedCalculationIds.includes(taskId);
                  }}
                />
              ))}

              {calculationFeedback && (
                <QuantitativeFeedbackPanel feedback={calculationFeedback} />
              )}

              {!view.hypothesis ? view.synthesis ? (
                <CaseGeneratedStep
                  caseId={caseDefinition.id}
                  contentVersion={caseDefinition.version}
                  kind="synthesis"
                  prompt={view.synthesis.prompt}
                  events={events}
                  facts={facts}
                  actions={availableActions}
                  atMs={timestamp}
                  onEvent={recordGeneratedEvent}
                />
              ) : caseDefinition.version < 2 ? <SynthesisStep
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
              /> : null : null}
            </>
          )}

          {!pendingCaseAttempt &&
            view?.currentStage === "recommend" &&
            view.recommendationPrompt && (
            <CaseGeneratedStep
              caseId={caseDefinition.id}
              contentVersion={caseDefinition.version}
              kind="recommendation"
              prompt={view.recommendationPrompt}
              events={events}
              facts={facts}
              atMs={timestamp}
              onEvent={recordGeneratedEvent}
            />
          )}

          {!pendingCaseAttempt &&
            view?.currentStage === "recommend" &&
            view.recommendation && (
            <RecommendationBuilder
              recommendation={view.recommendation}
              facts={facts}
              onSubmit={async (recommendation) => {
                const recommendationEvent: CaseEvent = {
                  type: "recommendation_submitted",
                  ...recommendation,
                  atMs: timestamp(),
                };
                await saveCompletedRecommendation(recommendationEvent);
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
            interpretedExhibitIds={view?.interpretedExhibitIds ?? []}
            onCommitResponse={commitExhibitResponse}
            onSubmitInterpretation={async (submission) => {
              await record({
                type: "exhibit_interpretation_submitted",
                eventSchemaVersion: 2,
                ...submission,
                atMs: timestamp(),
              });
            }}
          />
          <Scratchpad storageKey={`${storageKey}:scratchpad`} />
        </div>
      </div>
    </main>
  );
}

function WorkspaceFailure({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <main className={styles.failurePage}>
      <section className={styles.failureCard} role="alert">
        <span>Casework stopped safely</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <div>
          <button type="button" onClick={onAction}>
            {actionLabel}
          </button>
          <Link href="/cases">Browse available cases</Link>
        </div>
      </section>
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
