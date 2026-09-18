import { describe, expect, it } from "vitest";
import { activeCaseVersions } from ".";
import {
  caseMetadataDefinitions,
  CaseMetadataSchema,
  getCaseMetadata,
} from "./metadata";

describe("V3 case metadata", () => {
  it("covers every active case at its exact content version", () => {
    expect(
      caseMetadataDefinitions.map(({ caseId, contentVersion }) => [
        caseId,
        contentVersion,
      ]),
    ).toEqual(Object.entries(activeCaseVersions));
  });

  it("supports Practice everywhere and Interview only for AlpineFit V2", () => {
    expect(caseMetadataDefinitions.map(({ caseId, contentVersion, supportedModes }) => ({
      caseId,
      contentVersion,
      supportedModes,
    }))).toEqual([
      {
        caseId: "alpinefit-profitability",
        contentVersion: 2,
        supportedModes: ["practice", "interview"],
      },
      {
        caseId: "northstar-profitability",
        contentVersion: 1,
        supportedModes: ["practice"],
      },
      {
        caseId: "fleetfix-market-entry",
        contentVersion: 1,
        supportedModes: ["practice"],
      },
      {
        caseId: "paypilot-growth",
        contentVersion: 2,
        supportedModes: ["practice"],
      },
      {
        caseId: "goldenloaf-operations",
        contentVersion: 2,
        supportedModes: ["practice"],
      },
      {
        caseId: "morningjet-pricing-breakeven",
        contentVersion: 1,
        supportedModes: ["practice"],
      },
    ]);
  });

  it("uses registered metadata with positive duration and unique practiced skills", () => {
    for (const metadata of caseMetadataDefinitions) {
      expect(CaseMetadataSchema.parse(metadata)).toEqual(metadata);
      expect(metadata.estimatedMinutes).toBeGreaterThan(0);
      expect(new Set(metadata.practicedSkillIds).size).toBe(
        metadata.practicedSkillIds.length,
      );
    }
  });

  it("resolves exact metadata and never substitutes another version", () => {
    expect(getCaseMetadata("alpinefit-profitability", 2)).toMatchObject({
      industryId: "fitness",
      estimatedMinutes: 35,
    });
    expect(getCaseMetadata("alpinefit-profitability", 1)).toBeUndefined();
    expect(getCaseMetadata("missing-case", 1)).toBeUndefined();
  });

  it("rejects duplicate modes and practiced skills", () => {
    const base = caseMetadataDefinitions[0];
    expect(CaseMetadataSchema.safeParse({
      ...base,
      supportedModes: ["practice", "practice"],
    }).success).toBe(false);
    expect(CaseMetadataSchema.safeParse({
      ...base,
      practicedSkillIds: ["structure", "structure"],
    }).success).toBe(false);
  });
});
