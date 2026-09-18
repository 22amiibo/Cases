import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import { getCaseMetadata } from "@/content/cases/metadata";
import { getCaseModePolicy } from "@/core/case-mode";
import { isCaseEventAllowed, replayCaseEvents } from "@/core/case-engine";
import {
  getCurrentHypothesisId,
  getHypothesisSystemDiagnostic,
  getLastHypothesisResponseId,
} from "@/core/hypothesis";
import { projectHypothesisPractice } from "@/core/learner-case";
import { validateCompletedLearningCycleState } from "@/core/learning-cycle";
import { CaseEventSchema, type CaseEvent } from "@/core/schema";
import { CaseModeSchema } from "@/core/v3-taxonomy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  try {
    const body = (await request.json()) as {
      contentVersion?: unknown;
      events?: unknown;
      phase?: unknown;
      cycle?: unknown;
      hypothesisId?: unknown;
      status?: unknown;
      evidenceIds?: unknown;
      atMs?: unknown;
      mode?: unknown;
    };
    if (!Number.isInteger(body.contentVersion) || !Array.isArray(body.events)) {
      throw new Error("Invalid hypothesis completion");
    }
    const definition = getCaseDefinition(caseId, body.contentVersion as number);
    if (!definition?.hypothesisPractice) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    const mode = CaseModeSchema.safeParse(body.mode ?? "practice");
    if (!mode.success || !getCaseMetadata(caseId, definition.version)?.supportedModes.includes(mode.data)) {
      return NextResponse.json({ error: "Case mode not supported" }, { status: 400 });
    }
    const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
    if (parsedEvents.some((event) => !event.success)) throw new Error("Invalid events");
    const session = replayCaseEvents(
      definition,
      parsedEvents.flatMap((event) => event.success ? [event.data] : []),
      { mode: mode.data, contentVersion: definition.version },
    );
    if (!session) throw new Error("Invalid event history");
    if (session.currentStage !== "investigate") {
      throw new Error("Hypothesis practice is not available");
    }
    const projection = projectHypothesisPractice(definition, session.events, session.runContext);
    if (!projection || projection.phase !== body.phase) throw new Error("Invalid phase");
    const authoredCycle = projection.phase === "initial"
      ? definition.hypothesisPractice.initial
      : definition.hypothesisPractice.update;
    const cycle = validateCompletedLearningCycleState(
      body.cycle,
      authoredCycle,
      !getCaseModePolicy(mode.data).showImmediateFeedback,
    );
    if (!getCaseModePolicy(mode.data).allowCheckpointRetry && (cycle?.responses.length ?? 0) > 1) {
      throw new Error("Checkpoint retry is not allowed");
    }
    const latestResponse = cycle?.responses.at(-1);
    const latestAssessment = cycle?.assessments.find(
      ({ responseId }) => responseId === latestResponse?.responseId,
    );
    if (cycle?.phase !== "complete" || !latestResponse || !latestAssessment) {
      throw new Error("Incomplete generated response");
    }

    let event: CaseEvent;
    if (projection.phase === "initial") {
      event = CaseEventSchema.parse({
        type: "hypothesis_formed",
        eventSchemaVersion: 2,
        hypothesisId: body.hypothesisId,
        evidenceIds: [],
        revisionOfResponseId: null,
        responses: cycle.responses,
        rubricOutcomes: latestAssessment.outcomes,
        diagnostics: cycle.diagnostics,
        rationale: latestResponse.text,
        authoredComparisonViewed: getCaseModePolicy(mode.data).showImmediateFeedback,
        atMs: body.atMs,
      });
    } else {
      if (
        !Array.isArray(body.evidenceIds) ||
        body.evidenceIds.some((id) => typeof id !== "string") ||
        !["retain", "revise", "reject"].includes(String(body.status))
      ) throw new Error("Invalid update");
      const previousHypothesisId = getCurrentHypothesisId(session.events);
      const revisionOfResponseId = getLastHypothesisResponseId(session.events);
      if (!previousHypothesisId || !revisionOfResponseId) throw new Error("Missing prior hypothesis");
      const systemDiagnostic = getHypothesisSystemDiagnostic(
        definition,
        previousHypothesisId,
        body.status as "retain" | "revise" | "reject",
        body.evidenceIds as string[],
        latestResponse.responseId,
      );
      event = CaseEventSchema.parse({
        type: "hypothesis_updated",
        eventSchemaVersion: 2,
        status: body.status,
        previousHypothesisId,
        hypothesisId: body.status === "reject" ? null : body.hypothesisId,
        evidenceIds: body.evidenceIds,
        revisionOfResponseId,
        responses: cycle.responses,
        rubricOutcomes: latestAssessment.outcomes,
        diagnostics: [...cycle.diagnostics, systemDiagnostic],
        rationale: latestResponse.text,
        authoredComparisonViewed: getCaseModePolicy(mode.data).showImmediateFeedback,
        atMs: body.atMs,
      });
    }
    if (!isCaseEventAllowed(session, event)) throw new Error("Hypothesis event is not allowed");
    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: "Invalid hypothesis completion" }, { status: 400 });
  }
}
