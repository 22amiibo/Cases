import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import { replayCaseEvents } from "@/core/case-engine";
import { projectHypothesisPractice } from "@/core/learner-case";
import { revealLearningCycleAfterCommit } from "@/core/learning-cycle";
import { CaseEventSchema, CommittedResponseSchema } from "@/core/schema";

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
      response?: unknown;
    };
    if (!Number.isInteger(body.contentVersion) || !Array.isArray(body.events)) {
      throw new Error("Invalid hypothesis commitment");
    }
    const definition = getCaseDefinition(caseId, body.contentVersion as number);
    if (!definition?.hypothesisPractice) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
    const response = CommittedResponseSchema.safeParse(body.response);
    if (!response.success || parsedEvents.some((event) => !event.success)) {
      throw new Error("Invalid hypothesis commitment");
    }
    const session = replayCaseEvents(
      definition,
      parsedEvents.flatMap((event) => event.success ? [event.data] : []),
    );
    if (!session) throw new Error("Invalid event history");
    if (session.currentStage !== "investigate") {
      throw new Error("Hypothesis practice is not available");
    }
    const projection = projectHypothesisPractice(definition, session.events);
    if (!projection || projection.phase !== body.phase) {
      throw new Error("Hypothesis phase is not available");
    }
    const cycle = projection.phase === "initial"
      ? definition.hypothesisPractice.initial
      : definition.hypothesisPractice.update;
    return NextResponse.json({
      reveal: revealLearningCycleAfterCommit(cycle, response.data),
      options: definition.hypothesisPractice.options.map((option) => ({ ...option })),
    });
  } catch {
    return NextResponse.json({ error: "Invalid hypothesis commitment" }, { status: 400 });
  }
}
