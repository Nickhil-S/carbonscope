import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAssessment } from "@/lib/assessments";
import { buildRecommendations, calculateEmissions, CATEGORY_LABELS, type CategoryKey } from "@/lib/engine/carbon";
import { setDraft } from "@/lib/draft";
import { DemoNotice, PageHeader, Panel, SourceBadge, Stat } from "@/components/cs/ui";
import { Donut, Bars } from "@/components/cs/Charts";
import { Map } from "@/components/cs/Map";
import { Assistant } from "@/components/cs/Assistant";
import { RecList } from "./recommendations";
import { kg, num, pct } from "@/lib/format";

export const Route = createFileRoute("/assessments/$shareId")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Assessment report — CarbonScope" }, { name: "description", content: "Full environmental assessment report." }, { property: "og:title", content: "Assessment report — CarbonScope" }, { property: "og:description", content: "Emissions, hotspots, land use, water and recommendations." }] }),
  component: Details,
});

function Details() {
  const { shareId } = Route.useParams();
  const q = useQuery({ queryKey: ["assessment", shareId], queryFn: () => getAssessment(shareId) });
  if (q.isLoading) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">Loading report…</div>;
  if (!q.data) return <div className="mx-auto max-w-6xl px-4 py-20 text-center"><h1 className="text-2xl font-semibold">Report not found</h1><p className="mt-2 text-muted-foreground">This link may be wrong or the assessment was removed.</p><Button asChild className="mt-6"><Link to="/assessments">Back to archive</Link></Button></div>;
  const a = q.data;
  // Recalculate from stored raw inputs with the current engine; stored results are kept for audit.
  const r = calculateEmissions(a.inputs);
  const recs = buildRecommendations(a.inputs, r);
  const cats = Object.keys(r.byCategory) as CategoryKey[];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader eyebrow={`${a.scale} · report`} title={a.title} actions={<>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Share link copied"); }}>Copy share link</Button>
        <Button variant="outline" onClick={() => window.print()}>Print</Button>
        <Button asChild onClick={() => setDraft({ title: `${a.title} (copy)`, scale: a.scale as never, locationName: a.location_name ?? "", boundary: a.boundary, inputs: a.inputs, isDemo: a.is_demo })}><Link to="/simulator">Simulate</Link></Button>
      </>}>
        {a.location_name || "No location"} · saved {new Date(a.created_at).toLocaleString()} · methodology {a.methodology_version}
        {a.methodology_version !== r.methodologyVersion && <span className="text-warning-foreground"> (recalculated with {r.methodologyVersion})</span>}
      </PageHeader>
      {a.is_demo && <DemoNotice />}
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total emissions" value={kg(r.totalKg)} sub={`${num(r.annualTonnes, 1)} t CO₂e / year`} />
          <Stat label="Net after sequestration" value={kg(r.netKg)} sub="per month" badge={<SourceBadge kind="estimate" />} />
          <Stat label="Green cover" value={`${num(r.green.percent, 1)}%`} sub={`${num(r.green.storedTco2)} t CO₂ stored`} badge={<SourceBadge kind={a.inputs.landUseSource} />} />
          <Stat label="Area" value={`${num(r.area.ha, 2)} ha`} sub={`${num(r.area.acres, 1)} acres · ${num(r.area.km2, 3)} km²`} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Emissions by source"><Donut data={cats.map((k) => ({ name: CATEGORY_LABELS[k], value: Math.round(r.byCategory[k]) }))} /></Panel>
          <Panel title="Hotspots">
            <table className="w-full text-sm"><tbody>
              {r.hotspots.map((h) => <tr key={h.key} className="border-b last:border-0"><td className="py-2 tabular text-muted-foreground">#{h.rank}</td><td>{h.label}</td><td className="tabular text-right">{kg(h.kg)}</td><td className="tabular w-20 text-right">{pct(h.share)}</td></tr>)}
            </tbody></table>
          </Panel>
          <Panel title="Land utilisation" actions={<SourceBadge kind={a.inputs.landUseSource} />}>
            <Bars data={Object.entries(r.land.percentages).map(([k, v]) => ({ name: k, percent: v }))} keys={[{ key: "percent", label: "%" }]} unit="%" height={220} />
          </Panel>
          <Panel title="Water">
            <dl className="tabular grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground font-sans">Monthly use</dt><dd>{num(r.water.monthlyLitres / 1000)} m³</dd>
              <dt className="text-muted-foreground font-sans">Per person / day</dt><dd>{r.water.lpcd ? `${num(r.water.lpcd)} L (benchmark ${r.water.benchmarkLpcd})` : "—"}</dd>
              <dt className="text-muted-foreground font-sans">Rainwater potential</dt><dd>{num(r.water.harvestMonthlyL / 1000)} m³ / month</dd>
              <dt className="text-muted-foreground font-sans">Demand covered</dt><dd>{pct(r.water.harvestCoverage)}</dd>
              <dt className="text-muted-foreground font-sans">Emissions</dt><dd>{kg(r.water.emissions)}</dd>
            </dl>
          </Panel>
        </div>
        {a.boundary && <Panel title="Boundary"><Map boundary={a.boundary} editable={false} height={360} /></Panel>}
        <Panel title="Recommendations"><RecList recs={recs.slice(0, 6)} /></Panel>
        <Assistant title={a.title} inputs={a.inputs} />
      </div>
    </div>
  );
}
