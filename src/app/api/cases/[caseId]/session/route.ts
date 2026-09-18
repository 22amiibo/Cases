import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import {
  getAvailableActions,
  getRevealedFacts,
  isSynthesisReady,
  replayCaseEvents,
} from "@/core/case-engine";
import {
  toLearnerCaseReview,
  projectHypothesisPractice,
  projectInvestigationDisplay,
} from "@/core/learner-case";
import type {
  LearnerExhibitDefinition,
  LearnerSessionView,
} from "@/core/learner-case";
import { CaseEventSchema } from "@/core/schema";
import { projectLearningCyclePrompt } from "@/core/learning-cycle";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  if (!getCaseDefinition(caseId)) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  let body: { events?: unknown[]; contentVersion?: unknown };
  try {
    body = (await request.json()) as { events?: unknown[]; contentVersion?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }
  if (!Array.isArray(body.events)) {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }
  if (
    body.contentVersion !== undefined &&
    (!Number.isInteger(body.contentVersion) || Number(body.contentVersion) < 1)
  ) {
    return NextResponse.json({ error: "Invalid content version" }, { status: 400 });
  }
  const caseDefinition = getCaseDefinition(
    caseId,
    body.contentVersion as number | undefined,
  );
  if (!caseDefinition) {
    return NextResponse.json({ error: "Case version not found" }, { status: 404 });
  }

  const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
  if (parsedEvents.some((event) => !event.success)) {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }

  const session = replayCaseEvents(
    caseDefinition,
    parsedEvents.flatMap((parsed) => parsed.success ? [parsed.data] : []),
  );
  if (!session) {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }
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
      ({ id, conceptId, label }) => {
        const node = caseDefinition.investigationNodes.find(
          (candidate) => candidate.id === id,
        )!;
        return {
          id,
          conceptId,
          label,
          ...projectInvestigationDisplay(caseDefinition, node),
        };
      },
    ),
    facts: getRevealedFacts(session),
    exhibits: caseDefinition.exhibits
      .filter((exhibit) => session.revealedExhibitIds.includes(exhibit.id))
      .map(
        ({ id, title, type, unit, columns, rows, series, categories, interpretation }) =>
          ({
            id,
            title,
            type,
            unit,
            columns,
            rows,
            series,
            categories,
            ...(interpretation
              ? { interpretationPrompt: projectLearningCyclePrompt(interpretation) }
              : {}),
          }) satisfies LearnerExhibitDefinition,
      ),
    interpretedExhibitIds: session.events.flatMap((event) =>
      event.type === "exhibit_interpretation_submitted"
        ? [event.exhibitId]
        : [],
    ),
    calculations: caseDefinition.calculations
      .filter((calculation) =>
        !session.completedCalculationIds.includes(calculation.id) &&
        calculation.prerequisiteNodeIds.every((nodeId) =>
          investigatedNodeIds.has(nodeId),
        ),
      )
      .map(({ id, prompt, unit, unitOptions, responseCycle }) => responseCycle
        ? {
            id,
            prompt,
            responsePrompt: projectLearningCyclePrompt(responseCycle),
            unitOptions: unitOptions ?? [unit],
          }
        : { id, prompt, unit }),
    completedCalculationIds: session.completedCalculationIds,
    interviewerResponse:
      lastInvestigation?.type === "node_investigated"
        ? caseDefinition.investigationNodes.find(
            (node) => node.id === lastInvestigation.nodeId,
          )?.interviewerResponse ?? null
        : null,
    hypothesis: session.currentStage === "investigate"
      ? projectHypothesisPractice(caseDefinition, session.events)
      : null,
    synthesis: session.currentStage === "investigate" && caseDefinition.synthesis && isSynthesisReady(session)
      ? { prompt: projectLearningCyclePrompt(caseDefinition.synthesis.responseCycle) }
      : null,
    recommendationPrompt: session.currentStage === "recommend" && caseDefinition.recommendation.responseCycle
      ? projectLearningCyclePrompt(caseDefinition.recommendation.responseCycle)
      : null,
    recommendation: recommendationVisible && !caseDefinition.recommendation.responseCycle
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
