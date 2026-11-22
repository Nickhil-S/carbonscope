import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BLANK_DRAFT, DEMO_DRAFT, SCALES, setDraft, useDraft, type Draft, type Scale } from "@/lib/draft";
import { AREA_UNITS, ELECTRICITY_FACTORS, TRANSPORT_FACTORS, WASTE_FACTORS, validateInputs, type ActivityInputs, type Region } from "@/lib/engine/carbon";
import { PageHeader, Panel, SourceBadge } from "@/components/cs/ui";

export const Route = createFileRoute("/new")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "New assessment — CarbonScope" }, { name: "description", content: "Enter geographical and activity data for an environmental assessment." }, { property: "og:title", content: "New assessment — CarbonScope" }, { property: "og:description", content: "Electricity, transport, waste, water and land-use inputs." }] }),
  component: NewAssessment,
});

type Unit = keyof typeof AREA_UNITS;

function NumField({ label, value, onChange, suffix, error }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; error?: string | undefined }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input type="number" min={0} step="any" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className="tabular pr-14" aria-invalid={!!error} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function NewAssessment() {
  const draft = useDraft();
  const nav = useNavigate();
  const [f, setF] = useState<Draft>(draft);
  const [unit, setUnit] = useState<Unit>("ha");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  useEffect(() => setF(draft), [draft]);

  const set = (p: Partial<ActivityInputs>) => setF((s) => ({ ...s, isDemo: false, inputs: { ...s.inputs, ...p } }));
  const i = f.inputs;
  const areaInUnit = i.areaM2 * AREA_UNITS[unit].perM2;

  function submit() {
    const errs: Record<string, string> = {};
    if (!f.title.trim()) errs["title"] = "Title is required";
    const v = validateInputs(i);
    if (!v.success) v.error.issues.forEach((iss) => (errs[iss.path.join(".")] = iss.message));
    setErrors(errs);
    if (!v.success || Object.keys(errs).length) { toast.error("Please fix the highlighted fields"); return; }
    setDraft({ ...f, inputs: v.data });
    nav({ to: "/dashboard" });
  }

  const luSum = Object.values(i.landUse).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader eyebrow="Stage 01" title="New assessment" actions={<>
        <Button variant="outline" onClick={() => setDraft(DEMO_DRAFT)}>Load demo data</Button>
        <Button variant="ghost" onClick={() => setDraft(BLANK_DRAFT)}>Clear</Button>
      </>}>Enter monthly activity data. All values are treated as user-provided.</PageHeader>

      <div className="grid gap-6">
        <Panel title="Area">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-1.5 md:col-span-2">
              <Label className="text-xs">Assessment title</Label>
              <Input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. North Campus 2026 baseline" aria-invalid={!!errors["title"]} />
              {errors["title"] && <p className="text-xs text-destructive">{errors["title"]}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Scale</Label>
              <Select value={f.scale} onValueChange={(v) => setF({ ...f, scale: v as Scale })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCALES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <Label className="text-xs">Location name</Label>
              <Input value={f.locationName} maxLength={200} onChange={(e) => setF({ ...f, locationName: e.target.value })} placeholder="Search or draw on the map to fill this" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Electricity grid</Label>
              <Select value={i.region} onValueChange={(v) => set({ region: v as Region })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ELECTRICITY_FACTORS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label} ({v.factor})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Total area {f.boundary && <span className="text-primary">(from map)</span>}</Label>
              <div className="flex gap-2">
                <Input type="number" min={0} step="any" className="tabular" value={+areaInUnit.toFixed(4)} onChange={(e) => set({ areaM2: Math.max(0, Number(e.target.value) || 0) / AREA_UNITS[unit].perM2 })} />
                <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(AREA_UNITS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <NumField label="Population / occupants" value={i.population} onChange={(n) => set({ population: n })} error={errors["population"]} />
            <div className="flex items-end"><Button asChild variant="outline" className="w-full"><Link to="/map" onClick={() => setDraft(f)}>Select area on map</Link></Button></div>
          </div>
        </Panel>

        <Panel title="Electricity & water (monthly)">
          <div className="grid gap-4 md:grid-cols-3">
            <NumField label="Electricity consumption" suffix="kWh" value={i.electricityKwh} onChange={(n) => set({ electricityKwh: n })} error={errors["electricityKwh"]} />
            <NumField label="Water consumption" suffix="litres" value={i.waterLitres} onChange={(n) => set({ waterLitres: n })} error={errors["waterLitres"]} />
            <NumField label="Annual rainfall" suffix="mm" value={i.rainfallMm} onChange={(n) => set({ rainfallMm: n })} error={errors["rainfallMm"]} />
          </div>
        </Panel>

        <Panel title="Transportation (monthly distance)">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {(Object.keys(TRANSPORT_FACTORS) as (keyof typeof TRANSPORT_FACTORS)[]).map((m) => (
              <NumField key={m} label={TRANSPORT_FACTORS[m].label} suffix="km" value={i.transport[m]} onChange={(n) => set({ transport: { ...i.transport, [m]: n } })} error={errors[`transport.${m}`]} />
            ))}
          </div>
        </Panel>

        <Panel title="Waste (monthly)">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {(Object.keys(WASTE_FACTORS) as (keyof typeof WASTE_FACTORS)[]).map((w) => (
              <NumField key={w} label={WASTE_FACTORS[w].label} suffix="kg" value={i.waste[w]} onChange={(n) => set({ waste: { ...i.waste, [w]: n } })} error={errors[`waste.${w}`]} />
            ))}
          </div>
        </Panel>

        <Panel title="Land use" actions={<SourceBadge kind={i.landUseSource} />}>
          <p className="mb-4 text-sm text-muted-foreground">Percent of total area. Satellite land-cover classification is not connected, so enter values from site surveys or maps. Total: <span className={`tabular ${luSum > 100 ? "text-destructive" : ""}`}>{luSum.toFixed(1)}%</span></p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            {([["builtUp", "Built-up"], ["roads", "Roads & paths"], ["vegetation", "Vegetation"], ["openLand", "Open land"], ["water", "Water bodies"]] as const).map(([k, l]) => (
              <NumField key={k} label={l} suffix="%" value={i.landUse[k]} onChange={(n) => set({ landUseSource: "user", landUse: { ...i.landUse, [k]: n } })} error={errors[`landUse.${k}`]} />
            ))}
          </div>
          {errors["landUse"] && <p className="mt-2 text-sm text-destructive">{errors["landUse"]}</p>}
        </Panel>

        <div className="flex justify-end gap-2">
          <Button size="lg" onClick={submit}>Run calculation</Button>
        </div>
      </div>
    </div>
  );
}
