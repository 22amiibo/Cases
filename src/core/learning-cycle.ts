import { z } from "zod";
import { diagnosticCodes, type DiagnosticCode } from "./diagnostics";
import {
  CommittedResponseChainSchema,
  CommittedResponseSchema,
  DiagnosticOutcomeSchema,
  RubricOutcomeSchema,
  ScaffoldingLevelSchema,
  type CommittedResponse,
  type DiagnosticOutcome,
  type RubricOutcome,
} from "./schema";

const StableIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:[a-z0-9_-]*[a-z0-9])?$/);

export type LearningCycleCriterion = {
  id: string;
  label: string;
};

export type LearningCycleDiagnosticRule = {
  criterionId: string;
  when: "met" | "not_met";
  code: DiagnosticCode;
  severity: DiagnosticOutcome["severity"];
};

export type LearningCycleReveal = {
  criteria: LearningCycleCriterion[];
  comparison: { title: string; text: string };
  diagnosticRules: LearningCycleDiagnosticRule[];
};

export type AuthoredLearningCycle = {
  interactionId: string;
  responseKind: string;
  prompt: string;
  scaffoldingLevel: z.infer<typeof ScaffoldingLevelSchema>;
  guidance: string[];
} & LearningCycleReveal;

export type LearnerLearningCyclePrompt = Pick<
  AuthoredLearningCycle,
  | "interactionId"
  | "responseKind"
  | "prompt"
  | "scaffoldingLevel"
  | "guidance"
>;

export type LearningCyclePhase =
  | "drafting"
  | "self_check"
  | "comparison_ready"
  | "comparison"
  | "revising"
  | "complete"
  | "skipped";

export type LearningCycleAssessment = {
  responseId: string;
  outcomes: RubricOutcome[];
};

export type LearningCycleState = {
  interactionId: string;
  phase: LearningCyclePhase;
  responses: CommittedResponse[];
  reveal: LearningCycleReveal | null;
  assessments: LearningCycleAssessment[];
  diagnostics: DiagnosticOutcome[];
};

export type LearningCycleAction =
  | {
      type: "response_committed";
      response: CommittedResponse;
      reveal: LearningCycleReveal;
    }
  | { type: "self_check_submitted"; outcomes: RubricOutcome[] }
  | { type: "comparison_viewed" }
  | { type: "retry_started" }
  | { type: "cycle_completed" }
  | { type: "cycle_skipped" };

const CriterionSchema = z.object({
  id: StableIdSchema,
  label: z.string().min(1),
});

const DiagnosticRuleSchema = z.object({
  criterionId: StableIdSchema,
  when: z.enum(["met", "not_met"]),
  code: z.enum(diagnosticCodes),
  severity: z.enum(["strength", "coaching", "blocking"]),
});

const LearningCycleRevealSchema = z
  .object({
    criteria: z.array(CriterionSchema).min(1),
    comparison: z.object({
      title: z.string().min(1),
      text: z.string().min(1).max(10_000),
    }),
    diagnosticRules: z.array(DiagnosticRuleSchema),
  })
  .superRefine((reveal, context) => {
    const criterionIds = new Set(reveal.criteria.map(({ id }) => id));
    if (criterionIds.size !== reveal.criteria.length) {
      context.addIssue({
        code: "custom",
        message: "Criterion IDs must be unique",
        path: ["criteria"],
      });
    }
    reveal.diagnosticRules.forEach((rule, index) => {
      if (!criterionIds.has(rule.criterionId)) {
        context.addIssue({
          code: "custom",
          message: "Diagnostic rules must reference a known criterion",
          path: ["diagnosticRules", index, "criterionId"],
        });
      }
    });
  });

const LearningCycleStateSchema = z
  .object({
    interactionId: StableIdSchema,
    phase: z.enum([
      "drafting",
      "self_check",
      "comparison_ready",
      "comparison",
      "revising",
      "complete",
      "skipped",
    ]),
    responses: z.array(CommittedResponseSchema),
    reveal: LearningCycleRevealSchema.nullable(),
    assessments: z.array(
      z.object({
        responseId: StableIdSchema,
        outcomes: z.array(RubricOutcomeSchema),
      }),
    ),
    diagnostics: z.array(DiagnosticOutcomeSchema),
  })
  .superRefine((state, context) => {
    const isPreCommit = state.phase === "drafting" || state.phase === "skipped";
    if (
      (isPreCommit && (state.responses.length > 0 || state.reveal !== null)) ||
      (!isPreCommit && (state.responses.length === 0 || state.reveal === null))
    ) {
      context.addIssue({
        code: "custom",
        message: "Cycle phase does not match its committed response state",
      });
    }
    const responseIds = new Set(
      state.responses.map((response) => response.responseId),
    );
    state.responses.forEach((response, index) => {
      if (response.interactionId !== state.interactionId) {
        context.addIssue({
          code: "custom",
          message: "Stored response belongs to a different interaction",
          path: ["responses", index, "interactionId"],
        });
      }
    });
    state.assessments.forEach((assessment, index) => {
      if (!responseIds.has(assessment.responseId)) {
        context.addIssue({
          code: "custom",
          message: "Assessment references an unknown response",
          path: ["assessments", index, "responseId"],
        });
      }
    });
  });

function transitionError(action: string, phase: LearningCyclePhase): never {
  throw new Error(`${action} is not allowed during ${phase}`);
}

function validateReveal(reveal: LearningCycleReveal) {
  return LearningCycleRevealSchema.parse(reveal);
}

function currentResponse(state: LearningCycleState) {
  const response = state.responses.at(-1);
  if (!response) throw new Error("A committed response is required");
  return response;
}

export function projectLearningCyclePrompt(
  definition: AuthoredLearningCycle,
): LearnerLearningCyclePrompt {
  return {
    interactionId: definition.interactionId,
    responseKind: definition.responseKind,
    prompt: definition.prompt,
    scaffoldingLevel: definition.scaffoldingLevel,
    guidance: [...definition.guidance],
  };
}

export function revealLearningCycleAfterCommit(
  definition: AuthoredLearningCycle,
  response: CommittedResponse,
): LearningCycleReveal {
  CommittedResponseSchema.parse(response);
  if (
    response.interactionId !== definition.interactionId ||
    response.responseKind !== definition.responseKind
  ) {
    throw new Error("Committed response does not match this interaction");
  }
  return validateReveal({
    criteria: definition.criteria.map((criterion) => ({ ...criterion })),
    comparison: { ...definition.comparison },
    diagnosticRules: definition.diagnosticRules.map((rule) => ({ ...rule })),
  });
}

export function createLearningCycleState(
  interactionId: string,
): LearningCycleState {
  StableIdSchema.parse(interactionId);
  return {
    interactionId,
    phase: "drafting",
    responses: [],
    reveal: null,
    assessments: [],
    diagnostics: [],
  };
}

export function applyLearningCycleAction(
  state: LearningCycleState,
  action: LearningCycleAction,
): LearningCycleState {
  switch (action.type) {
    case "response_committed": {
      if (state.phase !== "drafting" && state.phase !== "revising") {
        return transitionError("Response commitment", state.phase);
      }
      if (action.response.interactionId !== state.interactionId) {
        throw new Error("Response interaction does not match the cycle");
      }
      const responses = [...state.responses, action.response];
      const chain = CommittedResponseChainSchema.safeParse(responses);
      if (!chain.success) {
        throw new Error("Committed response revision chain is invalid");
      }
      return {
        ...state,
        phase: "self_check",
        responses: chain.data,
        reveal: validateReveal(action.reveal),
      };
    }
    case "self_check_submitted": {
      if (state.phase !== "self_check" || !state.reveal) {
        return transitionError("Self-check", state.phase);
      }
      const expectedIds = new Set(
        state.reveal.criteria.map((criterion) => criterion.id),
      );
      const submittedIds = new Set(
        action.outcomes.map((outcome) => outcome.criterionId),
      );
      if (
        action.outcomes.length !== expectedIds.size ||
        submittedIds.size !== expectedIds.size ||
        [...submittedIds].some((id) => !expectedIds.has(id))
      ) {
        throw new Error("Self-check must assess every revealed criterion once");
      }
      const outcomes = action.outcomes.map((outcome) =>
        RubricOutcomeSchema.parse(outcome),
      );
      const response = currentResponse(state);
      const outcomeById = new Map(
        outcomes.map((outcome) => [outcome.criterionId, outcome.met]),
      );
      const diagnostics = state.reveal.diagnosticRules.flatMap((rule) => {
        const met = outcomeById.get(rule.criterionId);
        const applies = rule.when === "met" ? met === true : met === false;
        return applies
          ? [
              DiagnosticOutcomeSchema.parse({
                code: rule.code,
                source: "self_assessment",
                severity: rule.severity,
                responseId: response.responseId,
              }),
            ]
          : [];
      });
      return {
        ...state,
        phase: "comparison_ready",
        assessments: [
          ...state.assessments,
          { responseId: response.responseId, outcomes },
        ],
        diagnostics: [...state.diagnostics, ...diagnostics],
      };
    }
    case "comparison_viewed":
      if (state.phase !== "comparison_ready") {
        return transitionError("Comparison", state.phase);
      }
      return { ...state, phase: "comparison" };
    case "retry_started":
      if (state.phase !== "comparison") {
        return transitionError("Retry", state.phase);
      }
      return { ...state, phase: "revising" };
    case "cycle_completed":
      if (state.phase !== "comparison") {
        return transitionError("Completion", state.phase);
      }
      return { ...state, phase: "complete" };
    case "cycle_skipped":
      if (state.phase !== "drafting") {
        return transitionError("Skip", state.phase);
      }
      return { ...state, phase: "skipped" };
  }
}

export function serializeLearningCycleState(state: LearningCycleState) {
  return JSON.stringify(LearningCycleStateSchema.parse(state));
}

export function restoreLearningCycleState(
  serialized: string | null,
  interactionId: string,
): LearningCycleState | null {
  if (!serialized) return null;
  try {
    const result = LearningCycleStateSchema.safeParse(JSON.parse(serialized));
    if (!result.success || result.data.interactionId !== interactionId) {
      return null;
    }
    if (
      result.data.responses.length > 0 &&
      !CommittedResponseChainSchema.safeParse(result.data.responses).success
    ) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export function validateCompletedLearningCycleState(
  value: unknown,
  definition: AuthoredLearningCycle,
): LearningCycleState | null {
  const parsed = LearningCycleStateSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.phase !== "complete" ||
    parsed.data.interactionId !== definition.interactionId ||
    parsed.data.responses.length !== parsed.data.assessments.length ||
    !CommittedResponseChainSchema.safeParse(parsed.data.responses).success
  ) return null;

  try {
    let canonical = createLearningCycleState(definition.interactionId);
    for (const [index, response] of parsed.data.responses.entries()) {
      const matchingAssessments = parsed.data.assessments.filter(
        (assessment) => assessment.responseId === response.responseId,
      );
      if (matchingAssessments.length !== 1) return null;
      canonical = applyLearningCycleAction(canonical, {
        type: "response_committed",
        response,
        reveal: revealLearningCycleAfterCommit(definition, response),
      });
      canonical = applyLearningCycleAction(canonical, {
        type: "self_check_submitted",
        outcomes: matchingAssessments[0].outcomes,
      });
      canonical = applyLearningCycleAction(canonical, {
        type: "comparison_viewed",
      });
      canonical = applyLearningCycleAction(
        canonical,
        index === parsed.data.responses.length - 1
          ? { type: "cycle_completed" }
          : { type: "retry_started" },
      );
    }

    return serializeLearningCycleState(canonical) === serializeLearningCycleState(parsed.data)
      ? canonical
      : null;
  } catch {
    return null;
  }
}
