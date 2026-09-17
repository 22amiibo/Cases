import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import { replayCaseEvents } from "@/core/case-engine";
import { revealLearningCycleAfterCommit } from "@/core/learning-cycle";
import { CaseEventSchema, CommittedResponseSchema } from "@/core/schema";

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ caseId: string; exhibitId: string }> },
) {
  const { caseId, exhibitId } = await params;
  let body: { events?: unknown[]; contentVersion?: unknown; response?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid commitment" }, { status: 400 });
  }
  if (!Array.isArray(body.events)) {
    return NextResponse.json({ error: "Invalid commitment" }, { status: 400 });
  }
  const definition = getCaseDefinition(
    caseId,
    typeof body.contentVersion === "number" ? body.contentVersion : undefined,
  );
  if (!definition || definition.version < 2) {
    return NextResponse.json({ error: "Case version not found" }, { status: 404 });
  }
  const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
  const response = CommittedResponseSchema.safeParse(body.response);
  if (parsedEvents.some((event) => !event.success) || !response.success) {
    return NextResponse.json({ error: "Invalid commitment" }, { status: 400 });
  }
  const session = replayCaseEvents(
    definition,
    parsedEvents.flatMap((parsed) => parsed.success ? [parsed.data] : []),
  );
  if (!session) {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }
  const exhibit = definition.exhibits.find((candidate) => candidate.id === exhibitId);
  if (
    !exhibit?.interpretation ||
    !session.revealedExhibitIds.includes(exhibitId)
  ) {
    return NextResponse.json({ error: "Exhibit is not available" }, { status: 409 });
  }
  try {
    return NextResponse.json({
      reveal: revealLearningCycleAfterCommit(
        exhibit.interpretation,
        response.data,
      ),
      insightOptions: exhibit.insights.map(({ id, label }) => ({ id, label })),
    });
  } catch {
    return NextResponse.json({ error: "Invalid commitment" }, { status: 400 });
  }
}
