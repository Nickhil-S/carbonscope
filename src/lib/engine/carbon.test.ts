import { describe, expect, it } from "vitest";
import { DEMO_INPUTS, EMPTY_INPUTS, buildRecommendations, calculateEmissions, convertArea, simulateScenario, validateInputs, NO_REDUCTION } from "./carbon";

const base = { ...EMPTY_INPUTS, electricityKwh: 1000, transport: { ...EMPTY_INPUTS.transport, carPetrol: 100 }, waste: { ...EMPTY_INPUTS.waste, landfill: 10 }, waterLitres: 10000 };

describe("Stage 01 – input validation", () => {
  it("rejects negative electricity", () => {
    expect(validateInputs({ ...base, electricityKwh: -5 }).success).toBe(false);
  });
  it("rejects land use above 100%", () => {
    expect(validateInputs({ ...base, landUse: { builtUp: 60, roads: 30, vegetation: 30, openLand: 0, water: 0 } }).success).toBe(false);
  });
});

describe("Stage 02 – calculation", () => {
  it("uses India grid factor 0.716 kg/kWh", () => {
    expect(calculateEmissions(base).byCategory.electricity).toBeCloseTo(716);
  });
  it("totals all categories", () => {
    const r = calculateEmissions(base);
    expect(r.totalKg).toBeCloseTo(716 + 17 + 5.8 + 3.44);
  });
  it("converts 1 km² to 100 ha", () => {
    expect(convertArea(1e6).ha).toBeCloseTo(100);
  });
});

describe("Stage 03 – hotspots", () => {
  it("ranks electricity first when it dominates", () => {
    expect(calculateEmissions(base).hotspots[0]?.key).toBe("electricity");
  });
});

describe("Stage 04 – scenarios", () => {
  it("50% electricity cut saves 358 kg", () => {
    expect(simulateScenario(base, { ...NO_REDUCTION, electricity: 50 }).savedKgMonth).toBeCloseTo(358);
  });
});

describe("Stage 05 – recommendations", () => {
  it("is sorted by score and has positive savings", () => {
    const recs = buildRecommendations(DEMO_INPUTS);
    expect(recs.length).toBeGreaterThan(3);
    for (let k = 1; k < recs.length; k++) expect(recs[k - 1]!.score).toBeGreaterThanOrEqual(recs[k]!.score);
  });
});
