"use client";

import type { CourseContext } from "@/core/activity";
import { courseRunSuffix, courseHref, validateCourseContext } from "@/core/course-progress";
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
import { bindLearnerStorage } from "@/data/learner-identity";
import { saveOwnedAttempt } from "@/data/owned-saves";
import type { CaseAttempt } from "@/data/repository";
import type { V3CaseAttempt } from "@/data/v3-repository";
import { v2DiagnosticSkillMap } from "@/core/v3-taxonomy";
import {
  clearPendingAttempt,
  getOrCreatePendingAttempt,
  loadPendingAttempt,
} from "@/data/pending-attempts";
import type {
  LearnerCaseDefinition,
  LearnerSessionView,
  StoredCaseWorkspace,
} from "@/core/learner-case";
import {
  CaseEventSchema,
  NO_FURTHER_INVESTIGATION,
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
  courseContext?: CourseContext | null;
};

function caseStorageKey(caseId: string, mode: LearnerCaseDefinition["caseMode"]) {
  return mode === "practice"
    ? `casework:guest-session:${caseId}`
    : `casework:guest-session:${caseId}:${mode}`;
}

function pendingCaseKey(caseId: string, mode: LearnerCaseDefinition["caseMode"]) {
  return mode === "practice" ? `case:${caseId}` : `case:${caseId}:${mode}`;
}

function restorePendingCaseAttempt(
  caseId: string,
  mode: LearnerCaseDefinition["caseMode"],
  suffix = "",
): CaseAttempt | null {
  const pending = loadPendingAttempt<CaseAttempt>(
    window.sessionStorage,
    pendingCaseKey(caseId, mode) + suffix,
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
    runStartedAtMs: Date.now(),
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
      runStartedAtMs?: unknown;
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
        runStartedAtMs: Number.isFinite(serialized.runStartedAtMs)
          ? Number(serialized.runStartedAtMs)
          : Date.now(),
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

function createV3CaseAttempt(
  attempt: CaseAttempt,
  caseMode: LearnerCaseDefinition["caseMode"],
  courseContext: CourseContext | null,
): V3CaseAttempt {
  const diagnostics = attempt.diagnostics ?? [];
  return {
    attemptId: attempt.attemptId,
    userId: attempt.userId,
    caseId: attempt.caseId,
    contentVersion: attempt.contentVersion!,
    eventSchemaVersion: 2,
    scoringVersion: "v3",
    scaffoldingLevel: attempt.scaffoldingLevel ?? null,
    caseMode,
    completedAt: attempt.completedAt,
    skillScores: attempt.skillScores,
    feedbackCodes: attempt.feedbackCodes,
    skillEvidence: [],
    diagnostics: diagnostics.map(({ code, source, severity }) => ({
      code,
      skillId: v2DiagnosticSkillMap[code],
      source,
      severity,
    })),
    courseContext,
    events: attempt.events,
  };
}

export function InvestigationPanel({ caseDefinition, courseContext = null }: InvestigationPanelProps) {
  const clientReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!clientReady) return null;

  return <HydratedInvestigationPanel caseDefinition={caseDefinition} courseContext={courseContext} />;
}

function HydratedInvestigationPanel({ caseDefinition, courseContext = null }: InvestigationPanelProps) {
  const [draftStorage] = useState(bindLearnerStorage);
  const router = useRouter();
  const storageScope = courseRunSuffix(courseContext);
  const storageKey = caseStorageKey(caseDefinition.id, caseDefinition.caseMode) + storageScope;
  const [restoredWorkspace] = useState(() =>
    restoreWorkspace(draftStorage.getItem(storageKey), caseDefinition.version),
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
  const [pendingCaseAttempt, setPendingCaseAttempt] = useState(() =>
    restorePendingCaseAttempt(caseDefinition.id, caseDefinition.caseMode, storageScope),
  );
  const caseAttemptId = useRef<string | null>(
    pendingCaseAttempt?.attemptId ?? null,
  );
  const [reviewAttemptId, setReviewAttemptId] = useState(
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
      return JSON.parse(draftStorage.getItem(calculationFeedbackKey) ?? "null") as QuantitativeFeedback | null;
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
          mode: caseDefinition.caseMode,
          courseContext,
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
        runStartedAtMs: workspace.runStartedAtMs,
        mode: caseDefinition.caseMode,
        courseContext,
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
  }, [caseDefinition.caseMode, caseDefinition.id, caseDefinition.version, courseContext, sessionExpired, workspace.runStartedAtMs]);

  useEffect(() => {
    if (sessionExpired) return;
    draftStorage.setItem(
      storageKey,
      JSON.stringify({
        contentVersion: caseDefinition.version,
        runStartedAtMs: workspace.runStartedAtMs,
        courseContext,
        events,
        clarificationComplete,
        clarificationDraftIds,
      }),
    );
  }, [courseContext, caseDefinition.version, clarificationComplete, clarificationDraftIds, events, sessionExpired, storageKey, workspace.runStartedAtMs, draftStorage]);

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
    const review = completedView.review;
    if (!review) throw new Error("Completed case review was not returned");
    const attempt = getOrCreatePendingAttempt(
      window.sessionStorage,
      pendingCaseKey(caseDefinition.id, caseDefinition.caseMode) + storageScope,
      () => {
        const attemptId = caseAttemptId.current ??= crypto.randomUUID();
        return createCaseAttempt({
          attemptId,
          userId: draftStorage.userId,
          caseId: caseDefinition.id,
          review,
          events: nextEvents,
          completedAt: new Date().toISOString(),
          contentVersion: caseDefinition.version,
          scaffoldingLevel: caseDefinition.scaffoldingLevel,
        });
      },
    );
    setPendingCaseAttempt(attempt);
    await saveAttempt(attempt);
    clearPendingAttempt(window.sessionStorage, pendingCaseKey(caseDefinition.id, caseDefinition.caseMode) + storageScope, attempt.userId);
    if (!draftStorage.isCurrent()) return;
    setPendingCaseAttempt(null);
    setWorkspace((current) => ({ ...current, events: nextEvents }));
    setReviewAttemptId(attempt.attemptId);
    setView(completedView);
    router.push(
      `/cases/${caseDefinition.id}/attempts/${encodeURIComponent(attempt.attemptId)}`,
    );
  }

  async function saveAttempt(
    attempt: CaseAttempt,
  ) {
    if (caseDefinition.id === "alpinefit-profitability" && caseDefinition.version === 2) {
      await saveOwnedAttempt({ method: "saveV3CaseAttempt", attempt: createV3CaseAttempt(attempt, caseDefinition.caseMode, validateCourseContext(courseContext, { type: "case", id: attempt.caseId, contentVersion: attempt.contentVersion!, mode: caseDefinition.caseMode })) });
      return;
    }
    await saveOwnedAttempt({ method: "saveCaseAttempt", attempt });
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
    const nextInvestigation = nextStepNodeId || (
      availableActions.length === 0 ? NO_FURTHER_INVESTIGATION : ""
    );
    if (!nextInvestigation || synthesisEvidenceIds.length === 0) return;
    void record({
      type: "synthesis_submitted",
      evidenceIds: synthesisEvidenceIds,
      nextStepNodeId: nextInvestigation,
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
          mode: caseDefinition.caseMode,
          courseContext,
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
  ): Promise<{
    reveal: LearningCycleReveal;
    options: Array<{ id: string; label: string }>;
  }> {
    const result = await fetch(`/api/cases/${caseDefinition.id}/hypotheses/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentVersion: caseDefinition.version,
        events,
        mode: caseDefinition.caseMode,
        courseContext,
        phase,
        response,
      }),
    });
    if (!result.ok) throw new Error("Unable to commit hypothesis response");
    return result.json() as Promise<{
      reveal: LearningCycleReveal;
      options: Array<{ id: string; label: string }>;
    }>;
  }

  async function completeHypothesis(completion: HypothesisCompletion) {
    const result = await fetch(`/api/cases/${caseDefinition.id}/hypotheses/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentVersion: caseDefinition.version,
        events,
        mode: caseDefinition.caseMode,
        courseContext,
        ...completion,
        atMs: timestamp(),
      }),
    });
    if (!result.ok) throw new Error("Unable to complete hypothesis");
    const payload = (await result.json()) as { event: CaseEvent };
    await record(payload.event);
    clearHypothesisPracticeStorage(draftStorage, caseDefinition.id, caseDefinition.caseMode, storageScope);
  }

  const availableCalculations = view?.calculations ?? [];

  async function retryPendingCase() {
    if (!pendingCaseAttempt || recoveryStatus === "saving") return;
    setRecoveryStatus("saving");
    try {
      await saveAttempt(pendingCaseAttempt);
      const completedView = await loadView(pendingCaseAttempt.events, false);
      clearPendingAttempt(
        window.sessionStorage,
        pendingCaseKey(caseDefinition.id, caseDefinition.caseMode) + storageScope,
        pendingCaseAttempt.userId,
      );
      if (!draftStorage.isCurrent()) return;
      setWorkspace((current) => ({
        ...current,
        events: pendingCaseAttempt.events,
      }));
      setPendingCaseAttempt(null);
      setReviewAttemptId(pendingCaseAttempt.attemptId);
      setView(completedView);
      router.push(
        `/cases/${caseDefinition.id}/attempts/${encodeURIComponent(pendingCaseAttempt.attemptId)}`,
      );
    } catch {
      setRecoveryStatus("error");
    }
  }

  function startFreshCase() {
    draftStorage.removeItem(storageKey);
    draftStorage.removeItem(`${storageKey}:scratchpad`);
    draftStorage.removeItem(calculationFeedbackKey);
    clearHypothesisPracticeStorage(draftStorage, caseDefinition.id, caseDefinition.caseMode, storageScope);
    clearCaseCycleStorage(
      draftStorage,
      caseDefinition.id,
      caseDefinition.caseMode,
      caseDefinition.exhibitIds,
      storageScope,
    );
    const emptyWorkspace = createEmptyWorkspace(caseDefinition.version);
    elapsedOffset.current = 0;
    startedAt.current = null;
    caseAttemptId.current = null;
    setReviewAttemptId(null);
    initialEvents.current = emptyWorkspace.events;
    setWorkspace(emptyWorkspace);
    setSynthesisEvidenceIds([]);
    setNextStepNodeId("");
    setCalculationFeedback(null);
    setView(null);
    setViewStatus("loading");
    setSessionExpired(false);
    void loadView(emptyWorkspace.events).catch(() => undefined);
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
          {caseDefinition.caseMode === "interview" && <InterviewTimer startedAtMs={workspace.runStartedAtMs} />}
          <span>Guest session · {events.length} events saved</span>
        </div>
      </header>

      <section className={styles.prompt} aria-labelledby="case-title">
        <p>
          Case prompt · {caseDefinition.category}
          {caseDefinition.scaffoldingLevel === "interview" && " · lower-scaffolding transfer"}
        </p>
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
              caseMode={caseDefinition.caseMode}
              storageScope={storageScope}
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
                  caseMode={caseDefinition.caseMode}
                  storageScope={storageScope}
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
                  caseMode={caseDefinition.caseMode}
                  storageScope={storageScope}
                  kind="calculation"
                  itemId={calculation.id}
                  prompt={calculation.responsePrompt}
                  unitOptions={calculation.unitOptions}
                  events={events}
                  atMs={timestamp}
                  onEvent={recordGeneratedEvent}
                  onQuantitativeFeedback={(feedback) => {
                    setCalculationFeedback(feedback);
                    draftStorage.setItem(calculationFeedbackKey, JSON.stringify(feedback));
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

              {caseDefinition.caseMode === "practice" && calculationFeedback && (
                <QuantitativeFeedbackPanel feedback={calculationFeedback} />
              )}

              {!view.hypothesis ? view.synthesis ? (
                <CaseGeneratedStep
                  caseId={caseDefinition.id}
                  contentVersion={caseDefinition.version}
                  caseMode={caseDefinition.caseMode}
                  storageScope={storageScope}
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
              caseMode={caseDefinition.caseMode}
              storageScope={storageScope}
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
              <div className={styles.completionActions}>
                <Link
                  href={reviewAttemptId
                    ? `/cases/${caseDefinition.id}/attempts/${encodeURIComponent(reviewAttemptId)}`
                    : `/cases/${caseDefinition.id}/review`}
                >
                  Review case replay
                </Link>
                <button type="button" onClick={startFreshCase}>
                  Practice case again
                </button>
              </div>
            </StepCard>
          )}
        </section>

        <div className={styles.sideRail}>
          <EvidencePanel
            caseId={caseDefinition.id}
            caseMode={caseDefinition.caseMode}
            storageScope={storageScope}
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
          {courseContext && <Link href={courseHref({ id: courseContext.courseId, contentVersion: courseContext.courseVersion })}>Return to course</Link>}
          <Scratchpad storageKey={`${storageKey}:scratchpad`} />
        </div>
      </div>
    </main>
  );
}

function InterviewTimer({ startedAtMs }: { startedAtMs: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);
  const seconds = Math.max(0, Math.floor((now - startedAtMs) / 1_000));
  return <span aria-label="Interview timer">Interview timer · {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>;
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
      {actions.length > 0 ? (
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
      ) : (
        <p role="status">
          All authored investigations are complete. Continue when your evidence
          is ready.
        </p>
      )}
      <button
        type="button"
        className={styles.primaryButton}
        disabled={
          evidenceIds.length === 0 ||
          (actions.length > 0 && !nextStepNodeId)
        }
        onClick={onSubmit}
      >
        Move to recommendation
      </button>
    </StepCard>
  );
}
