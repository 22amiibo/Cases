import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import {
  applyCaseEvent,
  createCaseSession,
  getAvailableActions,
  getRevealedFacts,
} from "@/core/case-engine";
import {
  toLearnerCaseReview,
} from "@/core/learner-case";
import type {
  LearnerExhibitDefinition,
  LearnerSessionView,
} from "@/core/learner-case";
import { CaseEventSchema } from "@/core/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  const caseDefinition = getCaseDefinition(caseId);
  if (!caseDefinition) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  let body: { events?: unknown[] };
  try {
    body = (await request.json()) as { events?: unknown[] };
  } catch {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }
  if (!Array.isArray(body.events)) {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }

  const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
  if (parsedEvents.some((event) => !event.success)) {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }

  const session = parsedEvents.reduce(
    (current, parsed) =>
      parsed.success ? applyCaseEvent(current, parsed.data) : current,
    createCaseSession(caseDefinition),
  );
  const investigatedNodeIds = new Set(
    session.events
      .filter((event) => event.type === "node_investigated")
      .map((event) => event.nodeId),
  );
  const lastInvestigation = [...session.events]
    .reverse()
    .find((event) => event.type === "node_investigated");
  const recommendationVisible =
    session.currentStage === "recommend" || session.currentStage === "complete";

  const view: LearnerSessionView = {
    currentStage: session.currentStage,
    availableActions: getAvailableActions(session).map(
      ({ id, conceptId, label }) => ({ id, conceptId, label }),
    ),
    facts: getRevealedFacts(session),
    exhibits: caseDefinition.exhibits
      .filter((exhibit) => session.revealedExhibitIds.includes(exhibit.id))
      .map(
        ({ id, title, type, unit, columns, rows, series, categories }) =>
          ({ id, title, type, unit, columns, rows, series, categories }) satisfies LearnerExhibitDefinition,
      ),
    calculations: caseDefinition.calculations
      .filter((calculation) =>
        calculation.prerequisiteNodeIds.every((nodeId) =>
          investigatedNodeIds.has(nodeId),
        ),
      )
      .map(({ id, prompt, unit }) => ({ id, prompt, unit })),
    completedCalculationIds: session.completedCalculationIds,
    interviewerResponse:
      lastInvestigation?.type === "node_investigated"
        ? caseDefinition.investigationNodes.find(
            (node) => node.id === lastInvestigation.nodeId,
          )?.interviewerResponse ?? null
        : null,
    recommendation: recommendationVisible
      ? {
          decisions: caseDefinition.recommendation.decisions.map(({ id, label }) => ({
            id,
            label,
          })),
          risks: caseDefinition.recommendation.risks,
          nextSteps: caseDefinition.recommendation.nextSteps,
        }
      : null,
    review:
      session.currentStage === "complete"
        ? toLearnerCaseReview(caseDefinition, session.events)
        : null,
  };

  return NextResponse.json(view);
}
