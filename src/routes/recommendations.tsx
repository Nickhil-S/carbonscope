import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useDraft } from "@/lib/draft";
import { buildRecommendations, type Recommendation } from "@/lib/engine/carbon";
import { DemoNotice, Level, PageHeader, Panel } from "@/components/cs/ui";
import { Button } from "@/components/ui/button";
import { kg } from "@/lib/format";

export const Route = createFileRoute("/recommendations")({
  head: () => ({ meta: [{ title: "Recommendations — CarbonScope" }, { name: "description", content: "Improvement actions ranked by savings, cost, difficulty and effort." }, { property: "og:title", content: "Recommendations — CarbonScope" }, { property: "og:description", content: "Ranked sustainability actions based on calculated results." }] }),
  component: Recs,
});

const SORTS = { score: "Overall score", savingKgMonth: "Savings", cost: "Lowest cost", difficulty: "Easiest", effortMonths: "Fastest" } as const;

export function RecList({ recs }: { recs: Recommendation[] }) {
  return (
    <ol className="grid gap-3">
      {recs.map((x, idx) => (
        <li key={x.id} className="grid gap-3 rounded-lg border bg-card p-5 shadow-card md:grid-cols-[3rem_1fr_auto]">
          <span className="tabular text-2xl text-primary">{String(idx + 1).padStart(2, "0")}</span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{x.category}</p>
            <h3 className="mt-0.5 text-lg font-semibold">{x.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{x.detail}</p>
            <div className="mt-3 flex flex-wrap gap-4"><Level n={x.cost} label="Cost" /><Level n={x.difficulty} label="Difficulty" /><span className="text-xs text-muted-foreground">Effort ≈ {x.effortMonths} mo</span></div>
          </div>
          <div className="text-right">
            <p className="tabular text-xl font-semibold">{kg(x.savingKgMonth)}</p>
            <p className="text-xs text-muted-foreground">saved / month</p>
            <p className="tabular mt-2 text-xs text-primary">score {x.score}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Recs() {
  const d = useDraft();
  const [sort, setSort] = useState<keyof typeof SORTS>("score");
  const recs = [...buildRecommendations(d.inputs)].sort((a, b) => (sort === "score" || sort === "savingKgMonth" ? b[sort] - a[sort] : a[sort] - b[sort]));
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader eyebrow="Stage 05" title="Recommendations">Generated from the calculated results of “{d.title || "current assessment"}”. Score = 60% savings + 40% ease (cost, difficulty, effort).</PageHeader>
      {d.isDemo && <DemoNotice />}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((k) => <Button key={k} size="sm" variant={sort === k ? "default" : "outline"} onClick={() => setSort(k)}>{SORTS[k]}</Button>)}
      </div>
      {recs.length ? <RecList recs={recs} /> : <Panel><p className="text-sm text-muted-foreground">No recommendations yet — enter activity data first.</p></Panel>}
    </div>
  );
}
