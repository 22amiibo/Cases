import { NextResponse } from "next/server";
import alpineFitContent from "@/content/cases/alpinefit-profitability.json";
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
import { CaseDefinitionSchema, CaseEventSchema } from "@/core/schema";

const alpineFit = CaseDefinitionSchema.parse(alpineFitContent);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  if (caseId !== alpineFit.id) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const body = (await request.json()) as { events?: unknown[] };
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
    createCaseSession(alpineFit),
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
    exhibits: alpineFit.exhibits
      .filter((exhibit) => session.revealedExhibitIds.includes(exhibit.id))
      .map(
        ({ id, title, type, unit, columns, rows, series, categories }) =>
          ({ id, title, type, unit, columns, rows, series, categories }) satisfies LearnerExhibitDefinition,
      ),
    calculations: alpineFit.calculations
      .filter((calculation) =>
        calculation.prerequisiteNodeIds.every((nodeId) =>
          investigatedNodeIds.has(nodeId),
        ),
      )
      .map(({ id, prompt, unit }) => ({ id, prompt, unit })),
    completedCalculationIds: session.completedCalculationIds,
    interviewerResponse:
      lastInvestigation?.type === "node_investigated"
        ? alpineFit.investigationNodes.find(
            (node) => node.id === lastInvestigation.nodeId,
          )?.interviewerResponse ?? null
        : null,
    recommendation: recommendationVisible
      ? {
          decisions: alpineFit.recommendation.decisions.map(({ id, label }) => ({
            id,
            label,
          })),
          risks: alpineFit.recommendation.risks,
          nextSteps: alpineFit.recommendation.nextSteps,
        }
      : null,
    review:
      session.currentStage === "complete"
        ? toLearnerCaseReview(alpineFit, session.events)
        : null,
  };

  return NextResponse.json(view);
}
