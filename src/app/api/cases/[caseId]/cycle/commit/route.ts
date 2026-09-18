import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import { getCaseMetadata } from "@/content/cases/metadata";
import { getCaseModePolicy } from "@/core/case-mode";
import { getCaseLearningCycle, type CaseCycleKind } from "@/core/case-learning";
import {
  getAvailableActions,
  isGeneratedCaseCycleAvailable,
  replayCaseEvents,
} from "@/core/case-engine";
import { deferLearningCycleReveal, revealLearningCycleAfterCommit } from "@/core/learning-cycle";
import { CaseEventSchema, CommittedResponseSchema } from "@/core/schema";
import { CaseModeSchema } from "@/core/v3-taxonomy";

const kinds = new Set<CaseCycleKind>(["opening", "calculation", "synthesis", "recommendation"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!Number.isInteger(body.contentVersion) || !Array.isArray(body.events) || !kinds.has(body.kind as CaseCycleKind)) {
      throw new Error("Invalid case cycle commitment");
    }
    const definition = getCaseDefinition(caseId, body.contentVersion as number);
    if (!definition) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    const mode = CaseModeSchema.safeParse(body.mode ?? "practice");
    if (!mode.success || !getCaseMetadata(caseId, definition.version)?.supportedModes.includes(mode.data)) {
      return NextResponse.json({ error: "Case mode not supported" }, { status: 400 });
    }
    const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
    const response = CommittedResponseSchema.safeParse(body.response);
    if (!response.success || parsedEvents.some(({ success }) => !success)) throw new Error("Invalid event history");
    if (!getCaseModePolicy(mode.data).allowCheckpointRetry && response.data.revision > 1) {
      throw new Error("Checkpoint retry is not allowed");
    }
    const session = replayCaseEvents(definition, parsedEvents.flatMap((event) => event.success ? [event.data] : []), {
      mode: mode.data,
      contentVersion: definition.version,
    });
    if (!session) throw new Error("Invalid event history");
    const kind = body.kind as CaseCycleKind;
    const itemId = typeof body.itemId === "string" ? body.itemId : undefined;
    if (!isGeneratedCaseCycleAvailable(session, kind, itemId)) {
      throw new Error("Cycle is not available");
    }
    const cycle = getCaseLearningCycle(definition, kind, itemId);
    if (!cycle) throw new Error("Cycle is not available");

    const checkpoint = kind === "opening"
      ? { questionOptions: definition.clarificationOptions.map(({ id, label }) => ({ id, label })) }
      : kind === "recommendation"
        ? {
            decisions: definition.recommendation.decisions.map(({ id, label }) => ({ id, label })),
            risks: definition.recommendation.risks,
            nextSteps: definition.recommendation.nextSteps,
          }
        : kind === "synthesis"
          ? { actions: getAvailableActions(session).map(({ id, label }) => ({ id, label })) }
          : null;
    return NextResponse.json({
      reveal: getCaseModePolicy(mode.data).showImmediateFeedback
        ? revealLearningCycleAfterCommit(cycle, response.data)
        : deferLearningCycleReveal(cycle, response.data),
      checkpoint,
    });
  } catch {
    return NextResponse.json({ error: "Invalid case cycle commitment" }, { status: 400 });
  }
}
