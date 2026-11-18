import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Map, SlidersHorizontal, Lightbulb, GitCompare, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-campus.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CarbonScope — Multi-scale environmental impact assessment" },
      { name: "description", content: "Calculate carbon emissions, green cover and water indicators for a campus, city, district or country. Simulate improvements and get ranked actions." },
      { property: "og:title", content: "CarbonScope — Multi-scale environmental impact assessment" },
      { property: "og:description", content: "From a college campus to an entire country: measure, analyse, compare and simulate environmental impact." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: BarChart3, title: "Five-stage pipeline", text: "Activity input → calculation → hotspots → scenarios → recommendations." },
  { icon: Map, title: "Any boundary", text: "Search places, outline a campus or draw a custom polygon on OpenStreetMap." },
  { icon: SlidersHorizontal, title: "Scenario simulator", text: "Change reduction targets and see savings recalculate instantly." },
  { icon: Lightbulb, title: "Ranked actions", text: "Recommendations scored by savings, cost, difficulty and effort." },
  { icon: GitCompare, title: "Compare areas", text: "Put two or more saved assessments side by side." },
  { icon: Satellite, title: "Satellite-ready", text: "Built for Sentinel-1/2 and Earth Engine — clearly labelled when not connected." },
];

const SCALES = ["Country", "State", "District", "City", "Neighbourhood", "Campus", "Custom area"];

function Landing() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero-gradient text-hero-foreground">
        <img src={hero} alt="Aerial view of a green campus" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-32">
          <p className="tabular text-xs uppercase tracking-[0.25em] opacity-80">Environmental impact assessment</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">Know the footprint of any place — from a campus to a country.</h1>
          <p className="mt-6 max-w-xl text-lg opacity-85">CarbonScope turns electricity, travel, waste, water and land-use data into emissions, hotspots and a ranked plan to improve.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary"><Link to="/new">Start an assessment <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="ghost" className="text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground"><Link to="/dashboard">Explore the demo</Link></Button>
          </div>
          <div className="mt-12 flex flex-wrap gap-2">
            {SCALES.map((s) => <span key={s} className="rounded-full border border-hero-foreground/30 px-3 py-1 text-xs">{s}</span>)}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-3xl font-semibold">One engine, every scale</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">Every number on every screen comes from a single, versioned calculation engine using published emission factors.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6 shadow-card">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
