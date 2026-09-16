import type { CalculationDefinition, CaseDefinition } from "./schema";

export type ValidationIssue = {
  code:
    | "duplicate_id"
    | "unknown_node_reference"
    | "unknown_node_fact"
    | "unknown_node_exhibit"
    | "unknown_exhibit_fact"
    | "unknown_calculation_fact"
    | "calculation_answer_mismatch"
    | "unreachable_critical_node"
    | "unknown_recommendation_evidence"
    | "unknown_path_node";
  path: string;
  message: string;
};

export function withinTolerance(
  actual: number,
  expected: number,
  tolerance: number,
) {
  return Math.abs(actual - expected) <= tolerance;
}

function calculateFormula(calculation: CalculationDefinition) {
  const [first, ...rest] = calculation.formula.inputs;

  switch (calculation.formula.operation) {
    case "sum":
      return calculation.formula.inputs.reduce((total, value) => total + value, 0);
    case "subtract":
      return rest.reduce((total, value) => total - value, first);
    case "multiply":
      return calculation.formula.inputs.reduce(
        (total, value) => total * value,
        1,
      );
    case "divide":
      return rest.reduce((total, value) => total / value, first);
    case "percentage":
      return (first / rest[0]) * 100;
  }
}

function duplicateIssues(
  kind: string,
  items: ReadonlyArray<{ id: string }>,
): ValidationIssue[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  items.forEach(({ id }) => {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });

  return [...duplicates].map((id) => ({
    code: "duplicate_id",
    path: kind,
    message: `${kind} contains duplicate ID ${id}`,
  }));
}

export function validateCase(definition: CaseDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [
    ...duplicateIssues("facts", definition.facts),
    ...duplicateIssues("investigationNodes", definition.investigationNodes),
    ...duplicateIssues("exhibits", definition.exhibits),
    ...duplicateIssues("calculations", definition.calculations),
  ];
  const factIds = new Set(definition.facts.map(({ id }) => id));
  const nodeIds = new Set(definition.investigationNodes.map(({ id }) => id));
  const exhibitIds = new Set(definition.exhibits.map(({ id }) => id));

  definition.investigationNodes.forEach((node, nodeIndex) => {
    node.prerequisiteNodeIds.forEach((nodeId) => {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          code: "unknown_node_reference",
          path: `investigationNodes.${nodeIndex}.prerequisiteNodeIds`,
          message: `Node ${node.id} references unknown prerequisite node ${nodeId}`,
        });
      }
    });
    node.factIds.forEach((factId) => {
      if (!factIds.has(factId)) {
        issues.push({
          code: "unknown_node_fact",
          path: `investigationNodes.${nodeIndex}.factIds`,
          message: `Node ${node.id} references unknown fact ${factId}`,
        });
      }
    });
    node.exhibitIds.forEach((exhibitId) => {
      if (!exhibitIds.has(exhibitId)) {
        issues.push({
          code: "unknown_node_exhibit",
          path: `investigationNodes.${nodeIndex}.exhibitIds`,
          message: `Node ${node.id} references unknown exhibit ${exhibitId}`,
        });
      }
    });
  });

  definition.exhibits.forEach((exhibit, exhibitIndex) => {
    exhibit.sourceFactIds.forEach((factId) => {
      if (!factIds.has(factId)) {
        issues.push({
          code: "unknown_exhibit_fact",
          path: `exhibits.${exhibitIndex}.sourceFactIds`,
          message: `Exhibit ${exhibit.id} references unknown source fact ${factId}`,
        });
      }
    });
  });

  definition.calculations.forEach((calculation, calculationIndex) => {
    calculation.prerequisiteNodeIds.forEach((nodeId) => {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          code: "unknown_node_reference",
          path: `calculations.${calculationIndex}.prerequisiteNodeIds`,
          message: `Calculation ${calculation.id} references unknown prerequisite node ${nodeId}`,
        });
      }
    });

    if (!factIds.has(calculation.evidenceFactId)) {
      issues.push({
        code: "unknown_calculation_fact",
        path: `calculations.${calculationIndex}.evidenceFactId`,
        message: `Calculation ${calculation.id} references unknown evidence fact ${calculation.evidenceFactId}`,
      });
    }

    const calculatedAnswer = calculateFormula(calculation);
    if (
      !Number.isFinite(calculatedAnswer) ||
      !withinTolerance(
        calculation.expectedAnswer,
        calculatedAnswer,
        calculation.tolerance,
      )
    ) {
      issues.push({
        code: "calculation_answer_mismatch",
        path: `calculations.${calculationIndex}.expectedAnswer`,
        message: `Calculation ${calculation.id} expects ${calculation.expectedAnswer}, but its formula produces ${calculatedAnswer}`,
      });
    }
  });

  definition.recommendation.decisions.forEach((decision, decisionIndex) => {
    decision.supportingEvidenceIds.forEach((evidenceId) => {
      if (!factIds.has(evidenceId)) {
        issues.push({
          code: "unknown_recommendation_evidence",
          path: `recommendation.decisions.${decisionIndex}.supportingEvidenceIds`,
          message: `Recommendation ${decision.id} references unknown evidence ${evidenceId}`,
        });
      }
    });
  });

  definition.efficientPaths.forEach((path, pathIndex) => {
    path.nodeIds.forEach((nodeId) => {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          code: "unknown_path_node",
          path: `efficientPaths.${pathIndex}.nodeIds`,
          message: `Efficient path ${path.id} references unknown node ${nodeId}`,
        });
      }
    });
  });

  const reachableNodeIds = new Set(
    definition.investigationNodes
      .filter((node) => node.prerequisiteNodeIds.length === 0)
      .map((node) => node.id),
  );
  let previousSize = -1;

  while (previousSize !== reachableNodeIds.size) {
    previousSize = reachableNodeIds.size;
    definition.investigationNodes.forEach((node) => {
      if (
        node.prerequisiteNodeIds.every((nodeId) => reachableNodeIds.has(nodeId))
      ) {
        reachableNodeIds.add(node.id);
      }
    });
  }

  definition.investigationNodes.forEach((node, nodeIndex) => {
    if (node.critical && !reachableNodeIds.has(node.id)) {
      issues.push({
        code: "unreachable_critical_node",
        path: `investigationNodes.${nodeIndex}`,
        message: `Critical node ${node.id} is unreachable from an investigation root`,
      });
    }
  });

  return issues;
}

export function assertValidCase(definition: CaseDefinition) {
  const issues = validateCase(definition);

  if (issues.length > 0) {
    throw new Error(
      `Invalid case ${definition.id}:\n${issues
        .map((issue) => `- ${issue.message}`)
        .join("\n")}`,
    );
  }
}
