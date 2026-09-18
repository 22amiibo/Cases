import { getCaseDefinition } from "@/content/cases";
import { ActivityDefinitionSchema } from "@/core/activity";

const alpinefit = getCaseDefinition("alpinefit-profitability", 2);
if (!alpinefit?.hypothesisPractice) throw new Error("AlpineFit V2 hypothesis content is unavailable");
const facts = new Map(alpinefit.facts.map((fact) => [fact.id, fact.text]));

export const alpinefitHypothesisV3 = ActivityDefinitionSchema.parse({
  id: "alpinefit-hypothesis-v3",
  contentVersion: 1,
  eventSchemaVersion: 3,
  scoringVersion: "v3",
  status: "active",
  title: "Update an AlpineFit hypothesis as evidence arrives",
  labId: "hypothesis",
  primarySkillId: "hypothesis",
  secondarySkillIds: [],
  difficulty: "beginner",
  estimatedMinutes: 8,
  caseTypeIds: ["profitability"],
  industryIds: ["fitness"],
  interaction: {
    type: "hypothesis_sequence",
    interactionId: "alpinefit-hypothesis",
    prompt: alpinefit.hypothesisPractice.initial.prompt,
    hypotheses: alpinefit.hypothesisPractice.options,
    evidenceSteps: [
      {
        id: "cost-growth",
        evidenceId: "cost-growth",
        text: facts.get("cost-growth"),
        contradictedHypothesisIds: ["revenue-economics"],
      },
      {
        id: "overtime-spike",
        evidenceId: "overtime-spike",
        text: facts.get("overtime-spike"),
        contradictedHypothesisIds: ["revenue-economics"],
      },
    ],
    outcomeIds: ["strong", "reasonable", "evidence-missing", "weak"],
  },
  feedback: { paths: [
    {
      id: "strong",
      classification: "strong",
      diagnosticCodes: ["strong_hypothesis_update"],
      explanation: "You changed the working claim when contrary evidence appeared and cited the evidence.",
      principle: "A hypothesis focuses the next test and changes with evidence.",
      nextAction: "Use the revised labor hypothesis to choose the next analysis.",
    },
    {
      id: "reasonable",
      classification: "reasonable",
      diagnosticCodes: [],
      explanation: "Your starting labor hypothesis remained consistent with both evidence rounds.",
      principle: "Retaining a hypothesis is valid when new evidence supports it.",
      nextAction: "State what future evidence would disconfirm the labor hypothesis.",
    },
    {
      id: "evidence-missing",
      classification: "unsupported",
      diagnosticCodes: ["evidence_link_missing"],
      explanation: "The update did not cite the evidence used to change or support the claim.",
      principle: "Name the evidence before stating the update.",
      nextAction: "Cite the revealed fact and explain how it changes the claim.",
    },
    {
      id: "weak",
      classification: "unsupported",
      diagnosticCodes: ["contradicted_hypothesis_retained"],
      explanation: "The retained claim conflicts with the evidence you cited.",
      principle: "Revise or reject a claim when contrary evidence changes the balance.",
      nextAction: "Shift the working claim toward the cost and labor evidence.",
    },
  ] },
  takeaway: "Keep, revise, or reject the claim based on specific evidence.",
});
