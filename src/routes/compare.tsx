import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { listAssessments } from "@/lib/assessments";
import { calculateEmissions, CATEGORY_LABELS, type CategoryKey } from "@/lib/engine/carbon";
import { PageHeader, Panel } from "@/components/cs/ui";
import { Bars } from "@/components/cs/Charts";
import { kg, num } from "@/lib/format";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Compare assessments — CarbonScope" }, { name: "description", content: "Compare emissions, water, green cover and built-up area across assessments." }, { property: "og:title", content: "Compare assessments — CarbonScope" }, { property: "og:description", content: "Side-by-side environmental comparisons." }] }),
  component: Compare,
});

function Compare() {
  const q = useQuery({ queryKey: ["assessments"], queryFn: listAssessments });
  const [sel, setSel] = useState<string[]>([]);
  const rows = (q.data ?? []).filter((a) => sel.includes(a.id)).map((a) => ({ a, r: calculateEmissions(a.inputs) }));
  const metrics = [
    ["Total emissions", (x: (typeof rows)[number]) => kg(x.r.totalKg)],
    ["Electricity use", (x: (typeof rows)[number]) => `${num(x.a.inputs.electricityKwh)} kWh`],
    ["Transport emissions", (x: (typeof rows)[number]) => kg(x.r.byCategory.transport)],
    ["Waste generated", (x: (typeof rows)[number]) => `${num(x.r.waste.totalKg)} kg`],
    ["Water use", (x: (typeof rows)[number]) => `${num(x.a.inputs.waterLitres / 1000)} m³`],
    ["Green cover", (x: (typeof rows)[number]) => `${num(x.r.green.percent, 1)}%`],
    ["Built-up area", (x: (typeof rows)[number]) => `${num(x.r.land.builtUpPercent, 1)}%`],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader eyebrow="Comparison" title="Compare assessments">Pick two or more saved assessments.</PageHeader>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Panel title="Assessments">
          {q.isLoading && <p className="text-sm text-muted-foreground">Loading assessments…</p>}
          {q.error && <p className="text-sm text-destructive">Could not load assessments.</p>}
          {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No saved assessments yet.</p>}
          <ul className="grid gap-2">{q.data?.map((a) => (
            <li key={a.id}><label className="flex items-center gap-2 text-sm"><Checkbox checked={sel.includes(a.id)} onCheckedChange={(c) => setSel(c ? [...sel, a.id] : sel.filter((x) => x !== a.id))} />{a.title}</label></li>
          ))}</ul>
        </Panel>
        <div className="grid content-start gap-6">
          {rows.length < 2 ? <Panel><p className="text-sm text-muted-foreground">Select at least two assessments.</p></Panel> : <>
            <Panel title="Emissions by source (kg CO₂e / month)">
              <Bars data={(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((k) => Object.fromEntries([["name", CATEGORY_LABELS[k]], ...rows.map((x) => [x.a.id, Math.round(x.r.byCategory[k])])]))} keys={rows.map((x) => ({ key: x.a.id, label: x.a.title }))} unit=" kg" />
            </Panel>
            <Panel title="Indicators">
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="py-2 text-left">Metric</th>{rows.map((x) => <th key={x.a.id} className="text-right">{x.a.title}</th>)}</tr></thead>
                <tbody>{metrics.map(([l, f]) => <tr key={l} className="border-b last:border-0"><td className="py-2">{l}</td>{rows.map((x) => <td key={x.a.id} className="tabular text-right">{f(x)}</td>)}</tr>)}</tbody></table></div>
            </Panel>
          </>}
        </div>
      </div>
    </div>
  );
}
