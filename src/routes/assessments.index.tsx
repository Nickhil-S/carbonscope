import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listAssessments } from "@/lib/assessments";
import { PageHeader, Panel, SourceBadge } from "@/components/cs/ui";
import { kg, num } from "@/lib/format";

export const Route = createFileRoute("/assessments/")({
  head: () => ({ meta: [{ title: "Assessment archive — CarbonScope" }, { name: "description", content: "Previously saved environmental assessments." }, { property: "og:title", content: "Assessment archive — CarbonScope" }, { property: "og:description", content: "Browse saved assessments and open their reports." }] }),
  component: Archive,
});

function Archive() {
  const q = useQuery({ queryKey: ["assessments"], queryFn: listAssessments });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader eyebrow="Archive" title="Saved assessments" actions={<Button asChild><Link to="/new">New assessment</Link></Button>} />
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p className="text-sm text-destructive">Could not load assessments.</p>}
      {q.data && q.data.length === 0 && <Panel><p className="text-sm text-muted-foreground">Nothing saved yet. Run an assessment and press “Save assessment” on the dashboard.</p></Panel>}
      <div className="grid gap-3">
        {q.data?.map((a) => (
          <Link key={a.id} to="/assessments/$shareId" params={{ shareId: a.share_id }} className="grid gap-2 rounded-lg border bg-card p-5 shadow-card transition-colors hover:border-primary md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8">
            <div>
              <div className="flex items-center gap-2"><h3 className="font-semibold">{a.title}</h3>{a.is_demo && <SourceBadge kind="demo" />}</div>
              <p className="text-sm text-muted-foreground">{a.scale} · {a.location_name || "No location"} · {new Date(a.created_at).toLocaleDateString()}</p>
            </div>
            <p className="tabular text-sm">{num((a.area_m2 ?? 0) / 10000, 2)} ha</p>
            <p className="tabular text-lg font-semibold">{kg(a.results.totalKg)}<span className="text-xs font-normal text-muted-foreground"> /mo</span></p>
          </Link>
        ))}
      </div>
    </div>
  );
}
