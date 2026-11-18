import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useDraft } from "@/lib/draft";
import { CATEGORY_LABELS, NO_REDUCTION, simulateScenario, type CategoryKey, type Reductions } from "@/lib/engine/carbon";
import { DemoNotice, PageHeader, Panel, Stat } from "@/components/cs/ui";
import { Bars } from "@/components/cs/Charts";
import { Assistant } from "@/components/cs/Assistant";
import { kg, num, pct } from "@/lib/format";

export const Route = createFileRoute("/simulator")({
  head: () => ({ meta: [{ title: "Scenario simulator — CarbonScope" }, { name: "description", content: "Adjust reduction targets and instantly see projected emission savings." }, { property: "og:title", content: "Scenario simulator — CarbonScope" }, { property: "og:description", content: "Simulate reductions in electricity, transport, waste and water." }] }),
  component: Simulator,
});

const PRESETS: { label: string; r: Reductions }[] = [
  { label: "Quick wins", r: { electricity: 10, transport: 5, waste: 25, water: 15 } },
  { label: "Ambitious", r: { electricity: 35, transport: 25, waste: 60, water: 30 } },
  { label: "Net-zero path", r: { electricity: 80, transport: 60, waste: 80, water: 40 } },
];

function Simulator() {
  const d = useDraft();
  const [r, setR] = useState<Reductions>({ electricity: 20, transport: 15, waste: 30, water: 15 });
  const s = simulateScenario(d.inputs, r);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Stage 04" title="Scenario simulator">{d.title || "Current assessment"} — drag the sliders to recalculate.</PageHeader>
      {d.isDemo && <DemoNotice />}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Panel title="Reduction targets">
          <div className="mb-5 flex flex-wrap gap-2">
            {PRESETS.map((p) => <Button key={p.label} size="sm" variant="secondary" onClick={() => setR(p.r)}>{p.label}</Button>)}
            <Button size="sm" variant="ghost" onClick={() => setR(NO_REDUCTION)}>Reset</Button>
          </div>
          <div className="grid gap-6">
            {(Object.keys(r) as CategoryKey[]).map((k) => (
              <div key={k}>
                <div className="mb-2 flex justify-between text-sm"><span>{CATEGORY_LABELS[k]}</span><span className="tabular font-medium">−{r[k]}%</span></div>
                <Slider value={[r[k]]} min={0} max={100} step={1} onValueChange={([v]) => setR({ ...r, [k]: v })} aria-label={`${CATEGORY_LABELS[k]} reduction`} />
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid content-start gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Baseline" value={kg(s.baseline.totalKg)} sub="per month" />
            <Stat label="Projected" value={kg(s.projected.totalKg)} sub="per month" />
            <Stat label="Saving" value={pct(s.savedPercent)} sub={`${num(s.savedTonnesYear, 1)} t CO₂e / year`} />
            <Stat label="Water saved" value={`${num(s.waterSavedLitresMonth / 1000)} m³`} sub={`≈ ${num(s.treeEquivalent)} trees of CO₂`} />
          </div>
          <Panel title="Baseline vs projected (kg CO₂e / month)">
            <Bars data={s.byCategory.map((c) => ({ name: c.label, baseline: Math.round(c.baseline), projected: Math.round(c.projected) }))} keys={[{ key: "baseline", label: "Baseline" }, { key: "projected", label: "Projected" }]} height={320} unit=" kg" />
          </Panel>
          {s.baseline.totalKg > 0 && <Assistant title={d.title} inputs={d.inputs} reductions={r} />}
        </div>
      </div>
    </div>
  );
}
