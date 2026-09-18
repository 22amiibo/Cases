import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import { getCaseMetadata } from "@/content/cases/metadata";
import { getCaseModePolicy } from "@/core/case-mode";
import { buildCaseQuantitativeFeedback, buildGeneratedCaseEvent, getCaseLearningCycle, type CaseCycleKind } from "@/core/case-learning";
import { isCaseEventAllowed, replayCaseEvents } from "@/core/case-engine";
import { validateCompletedLearningCycleState } from "@/core/learning-cycle";
import { CaseEventSchema } from "@/core/schema";
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
      throw new Error("Invalid case cycle completion");
    }
    const definition = getCaseDefinition(caseId, body.contentVersion as number);
    if (!definition) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    const mode = CaseModeSchema.safeParse(body.mode ?? "practice");
    if (!mode.success || !getCaseMetadata(caseId, definition.version)?.supportedModes.includes(mode.data)) {
      return NextResponse.json({ error: "Case mode not supported" }, { status: 400 });
    }
    const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
    if (parsedEvents.some(({ success }) => !success)) throw new Error("Invalid event history");
    const session = replayCaseEvents(definition, parsedEvents.flatMap((event) => event.success ? [event.data] : []), {
      mode: mode.data,
      contentVersion: definition.version,
    });
    if (!session) throw new Error("Invalid event history");
    const kind = body.kind as CaseCycleKind;
    const itemId = typeof body.itemId === "string" ? body.itemId : undefined;
    const authored = getCaseLearningCycle(definition, kind, itemId);
    if (!authored) throw new Error("Cycle not found");
    const cycle = validateCompletedLearningCycleState(
      body.cycle,
      authored,
      !getCaseModePolicy(mode.data).showImmediateFeedback,
    );
    if (!cycle) throw new Error("Incomplete cycle");
    if (!getCaseModePolicy(mode.data).allowCheckpointRetry && cycle.responses.length > 1) {
      throw new Error("Checkpoint retry is not allowed");
    }
    const checkpoint = body.checkpoint && typeof body.checkpoint === "object"
      ? body.checkpoint as Record<string, unknown>
      : {};
    const event = buildGeneratedCaseEvent({
      session,
      kind,
      itemId,
      cycle,
      checkpoint,
      atMs: Number(body.atMs),
    });
    const parsedEvent = CaseEventSchema.parse(event);
    if (!isCaseEventAllowed(session, parsedEvent)) throw new Error("Event is not allowed");
    return NextResponse.json({
      event: parsedEvent,
      ...(kind === "calculation" && getCaseModePolicy(mode.data).showImmediateFeedback
        ? { feedback: buildCaseQuantitativeFeedback(definition, itemId, checkpoint) }
        : {}),
    });
  } catch {
    return NextResponse.json({ error: "Invalid case cycle completion" }, { status: 400 });
  }
}
