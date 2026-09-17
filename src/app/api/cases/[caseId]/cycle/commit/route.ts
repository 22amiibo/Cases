import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import { getCaseLearningCycle, type CaseCycleKind } from "@/core/case-learning";
import {
  getAvailableActions,
  isGeneratedCaseCycleAvailable,
  replayCaseEvents,
} from "@/core/case-engine";
import { revealLearningCycleAfterCommit } from "@/core/learning-cycle";
import { CaseEventSchema, CommittedResponseSchema } from "@/core/schema";

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
    const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
    const response = CommittedResponseSchema.safeParse(body.response);
    if (!response.success || parsedEvents.some(({ success }) => !success)) throw new Error("Invalid event history");
    const session = replayCaseEvents(definition, parsedEvents.flatMap((event) => event.success ? [event.data] : []));
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
      reveal: revealLearningCycleAfterCommit(cycle, response.data),
      checkpoint,
    });
  } catch {
    return NextResponse.json({ error: "Invalid case cycle commitment" }, { status: 400 });
  }
}
