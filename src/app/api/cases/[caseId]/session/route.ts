import { NextResponse } from "next/server";
import { getCaseDefinition } from "@/content/cases";
import { getCaseMetadata } from "@/content/cases/metadata";
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
import { CaseModeSchema } from "@/core/v3-taxonomy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  let body: { events?: unknown[]; contentVersion?: unknown; mode?: unknown };
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
    return NextResponse.json(
      {
        error:
          body.contentVersion === undefined
            ? "Case not found"
            : "Case version not found",
      },
      { status: 404 },
    );
  }
  const parsedMode = CaseModeSchema.safeParse(body.mode ?? "practice");
  const metadata = getCaseMetadata(caseId, caseDefinition.version);
  if (!parsedMode.success || (
    parsedMode.data === "interview" && !metadata?.supportedModes.includes("interview")
  )) {
    return NextResponse.json({ error: "Case mode not supported" }, { status: 400 });
  }
  const runContext = { mode: parsedMode.data, contentVersion: caseDefinition.version } as const;
  const projectPrompt = (cycle: Parameters<typeof projectLearningCyclePrompt>[0]) => {
    const prompt = projectLearningCyclePrompt(cycle);
    return runContext.mode === "practice" ? prompt : { ...prompt, guidance: [] };
  };

  const parsedEvents = body.events.map((event) => CaseEventSchema.safeParse(event));
  if (parsedEvents.some((event) => !event.success)) {
    return NextResponse.json({ error: "Invalid event history" }, { status: 400 });
  }

  const session = replayCaseEvents(
    caseDefinition,
    parsedEvents.flatMap((parsed) => parsed.success ? [parsed.data] : []),
    runContext,
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
    caseMode: parsedMode.data,
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
    facts: getRevealedFacts(session).map((fact) =>
      parsedMode.data === "interview" && caseDefinition.calculations.some(
        (calculation) => calculation.evidenceFactId === fact.id,
      )
        ? {
            ...fact,
            text: "Use your completed calculation as evidence in the final recommendation.",
          }
        : fact,
    ),
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
              ? { interpretationPrompt: projectPrompt(interpretation) }
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
            responsePrompt: projectPrompt(responseCycle),
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
      ? projectHypothesisPractice(caseDefinition, session.events, runContext)
      : null,
    synthesis: session.currentStage === "investigate" && caseDefinition.synthesis && isSynthesisReady(session)
      ? { prompt: projectPrompt(caseDefinition.synthesis.responseCycle) }
      : null,
    recommendationPrompt: session.currentStage === "recommend" && caseDefinition.recommendation.responseCycle
      ? projectPrompt(caseDefinition.recommendation.responseCycle)
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
        ? toLearnerCaseReview(caseDefinition, session.events, runContext)
        : null,
  };

  return NextResponse.json(view);
}
