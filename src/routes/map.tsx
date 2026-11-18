import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import turfArea from "@turf/area";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map } from "@/components/cs/Map";
import { PageHeader, Panel, SourceBadge } from "@/components/cs/ui";
import { setDraft, useDraft, type Scale } from "@/lib/draft";
import { convertArea } from "@/lib/engine/carbon";
import { num } from "@/lib/format";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Interactive map — CarbonScope" }, { name: "description", content: "Search places, select campus boundaries or draw custom polygons and calculate area." }, { property: "og:title", content: "Interactive map — CarbonScope" }, { property: "og:description", content: "Geographical area selection on OpenStreetMap." }] }),
  component: MapPage,
});

interface Place { display_name: string; type: string; class: string; geojson?: GeoJSON.Geometry; addresstype?: string }

function scaleFor(p: Place): Scale {
  const t = p.addresstype ?? p.type;
  if (p.class === "amenity" && /university|college|school/.test(p.type)) return "College campus";
  if (t === "country") return "Country";
  if (t === "state") return "State";
  if (/district|county/.test(t)) return "District";
  if (/city|town|village|municipality/.test(t)) return "City / town";
  if (/suburb|neighbourhood|quarter/.test(t)) return "Neighbourhood";
  return "Custom area";
}

function MapPage() {
  const d = useDraft();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const area = d.boundary ? convertArea(turfArea(d.boundary)) : null;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=6&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      const data: Place[] = await r.json();
      setResults(data);
      if (!data.length) toast.message("No places found");
    } catch {
      toast.error("Search failed — check your connection");
    } finally {
      setBusy(false);
    }
  }

  function apply(feature: GeoJSON.Feature, name?: string, scale?: Scale) {
    const m2 = turfArea(feature);
    if (m2 <= 0) {
      toast.error("This place has no area boundary — draw one instead.");
      return;
    }
    setDraft((s) => ({ boundary: feature, locationName: name ?? s.locationName, scale: scale ?? s.scale, isDemo: false, inputs: { ...s.inputs, areaM2: m2 } }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Geographical analysis" title="Interactive map" actions={<Button asChild><Link to="/new">Continue to inputs</Link></Button>}>
        Search a city, neighbourhood or campus, or draw a polygon with the tools on the map.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Map boundary={d.boundary} onDraw={(f) => apply(f, d.locationName || "Custom drawn area", "Custom area")} />
        <div className="grid content-start gap-6">
          <Panel title="Search">
            <form onSubmit={search} className="flex gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. IISc Bangalore" maxLength={200} />
              <Button type="submit" size="icon" disabled={busy} aria-label="Search">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
            </form>
            <ul className="mt-3 grid gap-1">
              {results.map((p, k) => {
                const poly = p.geojson && /Polygon/.test(p.geojson.type);
                return (
                  <li key={k}>
                    <button disabled={!poly} onClick={() => apply({ type: "Feature", properties: { name: p.display_name }, geometry: p.geojson! }, p.display_name.split(",").slice(0, 2).join(","), scaleFor(p))} className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50">
                      <span className="line-clamp-2">{p.display_name}</span>
                      <span className="text-xs text-muted-foreground">{scaleFor(p)} {poly ? "" : "· no boundary"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel title="Selected area" actions={area && <SourceBadge kind="estimate" />}>
            {area ? (
              <dl className="tabular grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Location</dt><dd className="font-sans">{d.locationName || "—"}</dd>
                <dt className="text-muted-foreground">m²</dt><dd>{num(area.m2)}</dd>
                <dt className="text-muted-foreground">Acres</dt><dd>{num(area.acres, 2)}</dd>
                <dt className="text-muted-foreground">Hectares</dt><dd>{num(area.ha, 2)}</dd>
                <dt className="text-muted-foreground">km²</dt><dd>{num(area.km2, 4)}</dd>
              </dl>
            ) : <p className="text-sm text-muted-foreground">No boundary selected yet.</p>}
            {d.boundary && (
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features: [d.boundary] })], { type: "application/geo+json" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "boundary.geojson"; a.click();
                }}>Download GeoJSON</Button>
                <Button size="sm" variant="ghost" onClick={() => setDraft({ boundary: null })}>Clear</Button>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Boundary is saved with the assessment. Area is computed geodesically from the GeoJSON polygon.</p>
          </Panel>
          <Panel title="Satellite layers">
            <ul className="grid gap-2 text-sm">
              {["Sentinel-2 (vegetation / land cover)", "Sentinel-1 (radar)", "Google Earth Engine"].map((s) => (
                <li key={s} className="flex items-center justify-between"><span>{s}</span><span className="text-xs text-muted-foreground">Not connected</span></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">No satellite-derived values are shown until a data pipeline is connected.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
