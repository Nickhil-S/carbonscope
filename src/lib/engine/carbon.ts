/**
 * CarbonScope central calculation engine.
 * Every screen consumes results from this module — formulas live nowhere else.
 */
import { z } from "zod";

export const METHODOLOGY_VERSION = "cs-1.0.0";

// ---------- Emission factors ----------
/** Grid electricity, kg CO2e per kWh (IEA / national inventories, 2023 averages). */
export const ELECTRICITY_FACTORS = {
  india: { label: "India grid", factor: 0.716, source: "CEA CO₂ Baseline Database v19" },
  usa: { label: "United States grid", factor: 0.367, source: "EPA eGRID 2022" },
  uk: { label: "United Kingdom grid", factor: 0.207, source: "DESNZ GHG factors 2024" },
  eu: { label: "European Union grid", factor: 0.251, source: "EEA 2023" },
  china: { label: "China grid", factor: 0.581, source: "MEE China 2022" },
  global: { label: "Global average", factor: 0.475, source: "IEA World Energy Outlook 2023" },
} as const;
export type Region = keyof typeof ELECTRICITY_FACTORS;

/** Transport, kg CO2e per km (vehicle-km for cars/2W, passenger-km for public modes). */
export const TRANSPORT_FACTORS = {
  carPetrol: { label: "Petrol car", factor: 0.17 },
  carDiesel: { label: "Diesel car", factor: 0.168 },
  twoWheeler: { label: "Two-wheeler", factor: 0.083 },
  bus: { label: "Bus (per passenger-km)", factor: 0.089 },
  rail: { label: "Rail / metro (per passenger-km)", factor: 0.035 },
  ev: { label: "Electric car", factor: 0.053 },
  truck: { label: "Goods truck", factor: 0.9 },
} as const;
export type TransportMode = keyof typeof TRANSPORT_FACTORS;

/** Waste, kg CO2e per kg by treatment route (DESNZ 2024 / IPCC waste model). */
export const WASTE_FACTORS = {
  landfill: { label: "Landfill", factor: 0.58 },
  incinerated: { label: "Incineration", factor: 0.21 },
  composted: { label: "Composted", factor: 0.01 },
  recycled: { label: "Recycled", factor: 0.021 },
} as const;
export type WasteRoute = keyof typeof WASTE_FACTORS;

/** Water supply + treatment, kg CO2e per litre (0.344 kg per m³). */
export const WATER_FACTORS = {
  supplyAndTreatment: 0.000344,
  /** Litres per person per day benchmark (WHO/BIS urban). */
  benchmarkLpcd: 135,
  /** Runoff coefficient for built-up roof surfaces. */
  roofRunoff: 0.8,
  /** Share of built-up land assumed to be roof area. */
  roofShareOfBuiltUp: 0.6,
};

/** Vegetation carbon storage. */
export const GREEN_FACTORS = {
  /** Tonnes of carbon stored per hectare of mixed urban vegetation (IPCC Tier 1). */
  tonnesCarbonPerHa: 60,
  /** CO2 / C molecular ratio. */
  co2PerCarbon: 44 / 12,
  /** Annual sequestration, tonnes CO2 per hectare per year. */
  sequestrationTco2PerHaYr: 6.5,
};

// ---------- Input schema ----------
const nonNeg = z.coerce.number().min(0, "Must be zero or more").max(1e13, "Value too large");

export const landUseSchema = z.object({
  builtUp: nonNeg.max(100),
  roads: nonNeg.max(100),
  vegetation: nonNeg.max(100),
  openLand: nonNeg.max(100),
  water: nonNeg.max(100),
});

export const inputSchema = z
  .object({
    region: z.enum(Object.keys(ELECTRICITY_FACTORS) as [Region, ...Region[]]),
    population: nonNeg,
    electricityKwh: nonNeg,
    transport: z.object(
      Object.fromEntries(Object.keys(TRANSPORT_FACTORS).map((k) => [k, nonNeg])) as Record<
        TransportMode,
        typeof nonNeg
      >,
    ),
    waste: z.object(
      Object.fromEntries(Object.keys(WASTE_FACTORS).map((k) => [k, nonNeg])) as Record<
        WasteRoute,
        typeof nonNeg
      >,
    ),
    waterLitres: nonNeg,
    rainfallMm: nonNeg.max(15000),
    areaM2: nonNeg,
    landUse: landUseSchema,
    landUseSource: z.enum(["user", "demo", "satellite"]),
  })
  .superRefine((v, ctx) => {
    const sum = Object.values(v.landUse).reduce((a, b) => a + b, 0);
    if (sum > 100.5)
      ctx.addIssue({ code: "custom", path: ["landUse"], message: `Land use adds up to ${sum.toFixed(1)}% (max 100%)` });
  });

export type ActivityInputs = z.infer<typeof inputSchema>;

export function validateInputs(raw: unknown) {
  return inputSchema.safeParse(raw);
}

// ---------- Area units ----------
export const AREA_UNITS = {
  m2: { label: "m²", perM2: 1 },
  acres: { label: "acres", perM2: 1 / 4046.8564224 },
  ha: { label: "hectares", perM2: 1 / 10000 },
  km2: { label: "km²", perM2: 1 / 1e6 },
} as const;
export function convertArea(m2: number) {
  return {
    m2,
    acres: m2 * AREA_UNITS.acres.perM2,
    ha: m2 * AREA_UNITS.ha.perM2,
    km2: m2 * AREA_UNITS.km2.perM2,
  };
}

// ---------- Indicator modules ----------
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function electricityEmissions(kwh: number, region: Region) {
  return kwh * ELECTRICITY_FACTORS[region].factor;
}
export function transportEmissions(t: ActivityInputs["transport"]) {
  const byMode = Object.fromEntries(
    (Object.keys(TRANSPORT_FACTORS) as TransportMode[]).map((m) => [m, t[m] * TRANSPORT_FACTORS[m].factor]),
  ) as Record<TransportMode, number>;
  return { total: sum(Object.values(byMode)), byMode };
}
export function wasteEmissions(w: ActivityInputs["waste"]) {
  const byRoute = Object.fromEntries(
    (Object.keys(WASTE_FACTORS) as WasteRoute[]).map((r) => [r, w[r] * WASTE_FACTORS[r].factor]),
  ) as Record<WasteRoute, number>;
  const totalKg = sum(Object.values(w));
  return { total: sum(Object.values(byRoute)), byRoute, totalKg, diversionRate: totalKg ? (w.composted + w.recycled) / totalKg : 0 };
}
export function waterIndicators(i: ActivityInputs) {
  const emissions = i.waterLitres * WATER_FACTORS.supplyAndTreatment;
  const lpcd = i.population > 0 ? i.waterLitres / i.population / 30 : null;
  const roofM2 = i.areaM2 * (i.landUse.builtUp / 100) * WATER_FACTORS.roofShareOfBuiltUp;
  // 1 mm on 1 m² = 1 litre
  const harvestAnnualL = roofM2 * i.rainfallMm * WATER_FACTORS.roofRunoff;
  const harvestMonthlyL = harvestAnnualL / 12;
  return {
    emissions,
    monthlyLitres: i.waterLitres,
    lpcd,
    benchmarkLpcd: WATER_FACTORS.benchmarkLpcd,
    harvestAnnualL,
    harvestMonthlyL,
    harvestCoverage: i.waterLitres > 0 ? Math.min(1, harvestMonthlyL / i.waterLitres) : 0,
  };
}
export function greenCover(i: ActivityInputs) {
  const vegM2 = i.areaM2 * (i.landUse.vegetation / 100);
  const ha = vegM2 / 10000;
  return {
    vegetationM2: vegM2,
    percent: i.landUse.vegetation,
    storedTco2: ha * GREEN_FACTORS.tonnesCarbonPerHa * GREEN_FACTORS.co2PerCarbon,
    sequestrationKgMonth: (ha * GREEN_FACTORS.sequestrationTco2PerHaYr * 1000) / 12,
  };
}
export function landUtilization(i: ActivityInputs) {
  const lu = i.landUse;
  const accounted = lu.builtUp + lu.roads + lu.vegetation + lu.openLand + lu.water;
  return {
    percentages: { ...lu, unclassified: Math.max(0, 100 - accounted) },
    areasM2: Object.fromEntries(Object.entries(lu).map(([k, v]) => [k, (i.areaM2 * v) / 100])) as Record<keyof typeof lu, number>,
    builtUpPercent: lu.builtUp + lu.roads,
  };
}

// ---------- Stage 02: calculate ----------
export type CategoryKey = "electricity" | "transport" | "waste" | "water";
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  electricity: "Electricity",
  transport: "Transportation",
  waste: "Waste",
  water: "Water supply",
};

export function calculateEmissions(i: ActivityInputs) {
  const electricity = electricityEmissions(i.electricityKwh, i.region);
  const transport = transportEmissions(i.transport);
  const waste = wasteEmissions(i.waste);
  const water = waterIndicators(i);
  const green = greenCover(i);
  const land = landUtilization(i);
  const byCategory: Record<CategoryKey, number> = {
    electricity,
    transport: transport.total,
    waste: waste.total,
    water: water.emissions,
  };
  const totalKg = sum(Object.values(byCategory));
  const netKg = totalKg - green.sequestrationKgMonth;
  return {
    methodologyVersion: METHODOLOGY_VERSION,
    totalKg,
    annualTonnes: (totalKg * 12) / 1000,
    netKg,
    perCapitaKg: i.population > 0 ? totalKg / i.population : null,
    byCategory,
    transport,
    waste,
    water,
    green,
    land,
    area: convertArea(i.areaM2),
    hotspots: identifyHotspots(byCategory, totalKg),
    dataQuality: {
      activity: "user" as const,
      landUse: i.landUseSource,
      factors: "published" as const,
    },
  };
}
export type Results = ReturnType<typeof calculateEmissions>;

// ---------- Stage 03: hotspots ----------
export function identifyHotspots(byCategory: Record<CategoryKey, number>, total: number) {
  return (Object.keys(byCategory) as CategoryKey[])
    .map((k) => ({ key: k, label: CATEGORY_LABELS[k], kg: byCategory[k], share: total > 0 ? byCategory[k] / total : 0 }))
    .sort((a, b) => b.kg - a.kg)
    .map((h, idx) => ({ ...h, rank: idx + 1, severity: h.share >= 0.4 ? "high" : h.share >= 0.15 ? "medium" : "low" }));
}

// ---------- Stage 04: scenarios ----------
export type Reductions = Record<CategoryKey, number>; // 0–100 %
export const NO_REDUCTION: Reductions = { electricity: 0, transport: 0, waste: 0, water: 0 };

export function simulateScenario(i: ActivityInputs, r: Reductions) {
  const clamp = (n: number) => Math.min(100, Math.max(0, n)) / 100;
  const f = { electricity: 1 - clamp(r.electricity), transport: 1 - clamp(r.transport), waste: 1 - clamp(r.waste), water: 1 - clamp(r.water) };
  const scaled: ActivityInputs = {
    ...i,
    electricityKwh: i.electricityKwh * f.electricity,
    transport: Object.fromEntries(Object.entries(i.transport).map(([k, v]) => [k, v * f.transport])) as ActivityInputs["transport"],
    waste: Object.fromEntries(Object.entries(i.waste).map(([k, v]) => [k, v * f.waste])) as ActivityInputs["waste"],
    waterLitres: i.waterLitres * f.water,
  };
  const baseline = calculateEmissions(i);
  const projected = calculateEmissions(scaled);
  const savedKg = baseline.totalKg - projected.totalKg;
  return {
    baseline,
    projected,
    savedKgMonth: savedKg,
    savedTonnesYear: (savedKg * 12) / 1000,
    savedPercent: baseline.totalKg > 0 ? savedKg / baseline.totalKg : 0,
    waterSavedLitresMonth: i.waterLitres - scaled.waterLitres,
    byCategory: (Object.keys(baseline.byCategory) as CategoryKey[]).map((k) => ({
      key: k,
      label: CATEGORY_LABELS[k],
      baseline: baseline.byCategory[k],
      projected: projected.byCategory[k],
      saved: baseline.byCategory[k] - projected.byCategory[k],
    })),
    /** Equivalent mature trees needed to absorb the saving (≈21 kg CO2/tree/yr). */
    treeEquivalent: (savedKg * 12) / 21,
  };
}

// ---------- Stage 05: recommendations ----------
type Level = 1 | 2 | 3; // 1 = low, 3 = high
export interface Recommendation {
  id: string;
  category: CategoryKey | "green";
  title: string;
  detail: string;
  savingKgMonth: number;
  cost: Level;
  difficulty: Level;
  effortMonths: number;
  score: number;
}

export function buildRecommendations(i: ActivityInputs, res: Results = calculateEmissions(i)): Recommendation[] {
  const out: Omit<Recommendation, "score">[] = [];
  const e = res.byCategory.electricity;
  if (e > 0) {
    out.push({ id: "led", category: "electricity", title: "Switch lighting to LED and add occupancy sensors", detail: `Lighting is typically ~15% of electricity use. At ${fmt(i.electricityKwh)} kWh/month this cuts about ${fmt(e * 0.15)} kg CO₂e.`, savingKgMonth: e * 0.15, cost: 1, difficulty: 1, effortMonths: 1 });
    out.push({ id: "solar", category: "electricity", title: "Install rooftop solar on built-up surfaces", detail: `Rooftop PV offsetting 30% of grid demand on the ${ELECTRICITY_FACTORS[i.region].label} (${ELECTRICITY_FACTORS[i.region].factor} kg/kWh).`, savingKgMonth: e * 0.3, cost: 3, difficulty: 2, effortMonths: 6 });
    out.push({ id: "hvac", category: "electricity", title: "Efficient HVAC scheduling and BEE 5-star appliances", detail: "Cooling and appliance upgrades typically save 10% of electricity.", savingKgMonth: e * 0.1, cost: 2, difficulty: 2, effortMonths: 3 });
  }
  const t = res.transport.byMode;
  const carKg = t.carPetrol + t.carDiesel;
  if (carKg > 0) {
    out.push({ id: "modeshift", category: "transport", title: "Shift 25% of car trips to bus, rail or shuttles", detail: `Car travel emits ${fmt(carKg)} kg CO₂e/month. Moving a quarter to bus (0.089 kg/km) saves the difference.`, savingKgMonth: (i.transport.carPetrol + i.transport.carDiesel) * 0.25 * (0.17 - 0.089), cost: 2, difficulty: 2, effortMonths: 4 });
    out.push({ id: "ev", category: "transport", title: "Electrify 20% of the car fleet", detail: "Replacing petrol/diesel cars with EVs (0.053 kg/km) for a fifth of distance.", savingKgMonth: (i.transport.carPetrol + i.transport.carDiesel) * 0.2 * (0.17 - 0.053), cost: 3, difficulty: 2, effortMonths: 12 });
  }
  if (t.twoWheeler > 0 || carKg > 0) {
    out.push({ id: "active", category: "transport", title: "Build cycling and walking paths for short trips", detail: "Replacing 10% of motorised short trips with active travel.", savingKgMonth: (carKg + t.twoWheeler) * 0.1, cost: 2, difficulty: 1, effortMonths: 6 });
  }
  if (i.waste.landfill > 0) {
    out.push({ id: "compost", category: "waste", title: "Segregate and compost organic waste", detail: `About half of landfilled waste is organic. Composting ${fmt(i.waste.landfill * 0.5)} kg/month avoids methane.`, savingKgMonth: i.waste.landfill * 0.5 * (WASTE_FACTORS.landfill.factor - WASTE_FACTORS.composted.factor), cost: 1, difficulty: 1, effortMonths: 2 });
    out.push({ id: "recycle", category: "waste", title: "Add dry-waste recycling collection", detail: "Diverting 20% of landfill to recycling streams.", savingKgMonth: i.waste.landfill * 0.2 * (WASTE_FACTORS.landfill.factor - WASTE_FACTORS.recycled.factor), cost: 1, difficulty: 2, effortMonths: 2 });
  }
  if (i.waterLitres > 0) {
    out.push({ id: "fixtures", category: "water", title: "Fit low-flow taps and fix leaks", detail: `Typically saves 20% of water — about ${fmt(i.waterLitres * 0.2)} L/month.`, savingKgMonth: res.water.emissions * 0.2, cost: 1, difficulty: 1, effortMonths: 1 });
    if (res.water.harvestMonthlyL > 0)
      out.push({ id: "rwh", category: "water", title: "Rainwater harvesting on rooftops", detail: `Roofs could capture ~${fmt(res.water.harvestMonthlyL)} L/month on average (${fmt(i.rainfallMm)} mm annual rainfall).`, savingKgMonth: Math.min(res.water.harvestMonthlyL, i.waterLitres) * WATER_FACTORS.supplyAndTreatment, cost: 2, difficulty: 2, effortMonths: 4 });
  }
  if (i.areaM2 > 0 && i.landUse.vegetation < 30) {
    const addHa = (i.areaM2 * Math.min(10, i.landUse.openLand) * 0.01) / 10000;
    out.push({ id: "trees", category: "green", title: "Plant trees on open land to raise green cover", detail: `Green cover is ${i.landUse.vegetation.toFixed(1)}%. Planting up to 10% of the area (${addHa.toFixed(2)} ha) on open land.`, savingKgMonth: (addHa * GREEN_FACTORS.sequestrationTco2PerHaYr * 1000) / 12, cost: 1, difficulty: 1, effortMonths: 12 });
  }
  const maxSaving = Math.max(1, ...out.map((r) => r.savingKgMonth));
  return out
    .filter((r) => r.savingKgMonth > 0)
    .map((r) => ({
      ...r,
      // 60% weight on savings, 40% on ease (cost, difficulty, effort).
      score: Math.round(
        100 * (0.6 * (r.savingKgMonth / maxSaving) + 0.4 * ((3 - r.cost) / 2 * 0.4 + (3 - r.difficulty) / 2 * 0.3 + Math.max(0, 1 - r.effortMonths / 12) * 0.3)),
      ),
    }))
    .sort((a, b) => b.score - a.score);
}

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

// ---------- Demo dataset ----------
export const DEMO_INPUTS: ActivityInputs = {
  region: "india",
  population: 6000,
  electricityKwh: 420000,
  transport: { carPetrol: 90000, carDiesel: 30000, twoWheeler: 160000, bus: 220000, rail: 40000, ev: 5000, truck: 3000 },
  waste: { landfill: 38000, incinerated: 0, composted: 6000, recycled: 4000 },
  waterLitres: 21000000,
  rainfallMm: 970,
  areaM2: 800000,
  landUse: { builtUp: 34, roads: 12, vegetation: 28, openLand: 22, water: 4 },
  landUseSource: "demo",
};

export const EMPTY_INPUTS: ActivityInputs = {
  region: "india",
  population: 0,
  electricityKwh: 0,
  transport: { carPetrol: 0, carDiesel: 0, twoWheeler: 0, bus: 0, rail: 0, ev: 0, truck: 0 },
  waste: { landfill: 0, incinerated: 0, composted: 0, recycled: 0 },
  waterLitres: 0,
  rainfallMm: 0,
  areaM2: 0,
  landUse: { builtUp: 0, roads: 0, vegetation: 0, openLand: 0, water: 0 },
  landUseSource: "user",
};
