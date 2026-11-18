import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useDraft } from "@/lib/draft";
import { buildRecommendations, calculateEmissions, simulateScenario, CATEGORY_LABELS, type CategoryKey } from "@/lib/engine/carbon";
import { DemoNotice, Panel, PageHeader, SourceBadge, Stat } from "@/components/cs/ui";
import { Donut, Bars } from "@/components/cs/Charts";
import { Assistant } from "@/components/cs/Assistant";
import { kg, num, pct } from "@/lib/format";
import { SaveButton } from "@/components/cs/SaveButton";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CarbonScope" }, { name: "description", content: "Five-stage environmental calculation pipeline for the current assessment." }, { property: "og:title", content: "Dashboard — CarbonScope" }, { property: "og:description", content: "Activity input, calculation, hotspots, scenarios and recommendations." }] }),
  component: Dashboard,
});

function Stage({ n, title, children, to }: { n: string; title: string; children: React.ReactNode; to?: "/new" | "/simulator" | "/recommendations" }) {
  return (
    <Panel title={<span className="flex items-baseline gap-3"><span className="tabular text-sm text-primary">STAGE {n}</span>{title}</span>} actions={to && <Button asChild size="sm" variant="outline"><Link to={to}>Open</Link></Button>}>
      {children}
    </Panel>
  );
}

function Dashboard() {
  const d = useDraft();
  const i = d.inputs;
  const r = calculateEmissions(i);
  const sim = simulateScenario(i, { electricity: 20, transport: 15, waste: 30, water: 15 });
  const recs = buildRecommendations(i, r).slice(0, 3);
  const empty = r.totalKg === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow={d.scale} title={d.title || "Untitled assessment"} actions={<><Button asChild variant="outline"><Link to="/new">Edit inputs</Link></Button><SaveButton /></>}>
        {d.locationName || "No location selected"} · monthly figures
      </PageHeader>
      {d.isDemo && <DemoNotice />}
      {empty && <p className="mb-6 rounded-md border bg-muted p-4 text-sm">No activity data yet. <Link to="/new" className="text-primary underline">Enter inputs</Link> to run the pipeline.</p>}

      <div className="grid gap-6">
        <Stage n="01" title="Activity input" to="/new">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Electricity" value={`${num(i.electricityKwh)} kWh`} badge={<SourceBadge kind="user" />} />
            <Stat label="Travel distance" value={`${num(Object.values(i.transport).reduce((a, b) => a + b, 0))} km`} badge={<SourceBadge kind="user" />} />
            <Stat label="Waste" value={`${num(r.waste.totalKg)} kg`} badge={<SourceBadge kind="user" />} />
            <Stat label="Water" value={`${num(i.waterLitres / 1000)} m³`} badge={<SourceBadge kind="user" />} />
            <Stat label="Area" value={`${num(r.area.ha, 2)} ha`} sub={`${num(r.area.acres, 1)} acres · ${num(r.area.km2, 3)} km²`} badge={<SourceBadge kind={d.boundary ? "estimate" : "user"} />} />
          </div>
        </Stage>

        <Stage n="02" title="Environmental calculation">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label="Total emissions" value={kg(r.totalKg)} sub={`${num(r.annualTonnes, 1)} t CO₂e / year`} className="sm:col-span-2 lg:col-span-1" />
              {(Object.keys(r.byCategory) as CategoryKey[]).map((k) => <Stat key={k} label={CATEGORY_LABELS[k]} value={kg(r.byCategory[k])} sub={pct(r.totalKg ? r.byCategory[k] / r.totalKg : 0)} />)}
              <Stat label="Green cover" value={`${num(r.green.percent, 1)}%`} sub={`${num(r.green.storedTco2)} t CO₂ stored`} badge={<SourceBadge kind={i.landUseSource} />} />
              <Stat label="Built-up area" value={`${num(r.land.builtUpPercent, 1)}%`} sub="buildings + roads" badge={<SourceBadge kind={i.landUseSource} />} />
              <Stat label="Per capita" value={r.perCapitaKg == null ? "—" : kg(r.perCapitaKg)} sub={r.water.lpcd ? `${num(r.water.lpcd)} L/person/day water` : "Add population"} />
            </div>
            <Donut data={(Object.keys(r.byCategory) as CategoryKey[]).map((k) => ({ name: CATEGORY_LABELS[k], value: Math.round(r.byCategory[k]) }))} />
          </div>
        </Stage>

        <Stage n="03" title="Hotspot identification">
          <ol className="grid gap-2">
            {r.hotspots.map((h) => (
              <li key={h.key} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3">
                <span className="tabular text-muted-foreground">#{h.rank}</span>
                <div>
                  <div className="flex justify-between text-sm"><span className="font-medium">{h.label}</span><span className="tabular">{kg(h.kg)} · {pct(h.share)}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${h.share * 100}%` }} /></div>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs ${h.severity === "high" ? "bg-destructive/15 text-destructive" : h.severity === "medium" ? "bg-warning/25 text-warning-foreground" : "bg-secondary text-secondary-foreground"}`}>{h.severity}</span>
              </li>
            ))}
          </ol>
        </Stage>

        <Stage n="04" title="Scenario simulation" to="/simulator">
          <p className="mb-4 text-sm text-muted-foreground">Example scenario: −20% electricity, −15% transport, −30% waste, −15% water.</p>
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="grid gap-4">
              <Stat label="Monthly saving" value={kg(sim.savedKgMonth)} sub={`${pct(sim.savedPercent)} of baseline`} />
              <Stat label="Yearly saving" value={`${num(sim.savedTonnesYear, 1)} t CO₂e`} sub={`≈ ${num(sim.treeEquivalent)} mature trees`} />
            </div>
            <Bars data={sim.byCategory.map((c) => ({ name: c.label, baseline: Math.round(c.baseline), projected: Math.round(c.projected) }))} keys={[{ key: "baseline", label: "Baseline" }, { key: "projected", label: "Projected" }]} unit=" kg" />
          </div>
        </Stage>

        <Stage n="05" title="Recommendations" to="/recommendations">
          {recs.length === 0 ? <p className="text-sm text-muted-foreground">Enter activity data to generate recommendations.</p> : (
            <ul className="grid gap-3 md:grid-cols-3">
              {recs.map((x) => (
                <li key={x.id} className="rounded-md border p-4">
                  <p className="tabular text-xs text-primary">Score {x.score}</p>
                  <p className="mt-1 font-medium">{x.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Saves ≈ {kg(x.savingKgMonth)} / month</p>
                </li>
              ))}
            </ul>
          )}
        </Stage>

        {!empty && <Assistant title={d.title} inputs={i} />}
      </div>
    </div>
  );
}
