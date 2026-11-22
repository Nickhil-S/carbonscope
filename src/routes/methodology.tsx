import { createFileRoute } from "@tanstack/react-router";
import { ELECTRICITY_FACTORS, GREEN_FACTORS, METHODOLOGY_VERSION, TRANSPORT_FACTORS, WASTE_FACTORS, WATER_FACTORS } from "@/lib/engine/carbon";
import { PageHeader, Panel } from "@/components/cs/ui";

export const Route = createFileRoute("/methodology")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Methodology — CarbonScope" }, { name: "description", content: "Calculation formulas, emission factors and data sources." }, { property: "og:title", content: "Methodology — CarbonScope" }, { property: "og:description", content: "How CarbonScope calculates emissions and indicators." }] }),
  component: Methodology,
});

function Table({ rows }: { rows: [string, string | number, string?][] }) {
  return <table className="w-full text-sm"><tbody>{rows.map(([a, b, c]) => <tr key={a} className="border-b last:border-0"><td className="py-2">{a}</td><td className="tabular text-right">{b}</td><td className="pl-4 text-xs text-muted-foreground">{c}</td></tr>)}</tbody></table>;
}

function Methodology() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader eyebrow={`Version ${METHODOLOGY_VERSION}`} title="Methodology">All figures come from one versioned engine. Emissions = activity × emission factor, reported monthly in kg CO₂e.</PageHeader>
      <div className="grid gap-6">
        <Panel title="Electricity (kg CO₂e / kWh)"><Table rows={Object.values(ELECTRICITY_FACTORS).map((f) => [f.label, f.factor, f.source])} /></Panel>
        <Panel title="Transport (kg CO₂e / km)"><Table rows={Object.values(TRANSPORT_FACTORS).map((f) => [f.label, f.factor])} /></Panel>
        <Panel title="Waste (kg CO₂e / kg)"><Table rows={Object.values(WASTE_FACTORS).map((f) => [f.label, f.factor])} /></Panel>
        <Panel title="Water & green cover">
          <Table rows={[
            ["Water supply + treatment (kg/L)", WATER_FACTORS.supplyAndTreatment],
            ["Rainwater harvest = roof area × rainfall × runoff", WATER_FACTORS.roofRunoff, "roof = 60% of built-up"],
            ["Vegetation carbon stock (t C/ha)", GREEN_FACTORS.tonnesCarbonPerHa, "IPCC Tier 1"],
            ["Sequestration (t CO₂/ha/yr)", GREEN_FACTORS.sequestrationTco2PerHaYr],
          ]} />
        </Panel>
        <Panel title="Data labels">
          <p className="text-sm text-muted-foreground">Values are tagged User-provided, Estimate, Demo data or Satellite-measured. Satellite results (Sentinel-1/2, Earth Engine) are only shown once a processing pipeline is connected.</p>
        </Panel>
      </div>
    </div>
  );
}
