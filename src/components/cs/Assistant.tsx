import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "./ui";
import { askEnvironmentalAssistant } from "@/lib/assistant.functions";
import { buildRecommendations, calculateEmissions, simulateScenario, type ActivityInputs, type Reductions } from "@/lib/engine/carbon";

const PROMPTS = [
  "What are the major environmental concerns here?",
  "How can we reduce emissions the most?",
  "How could green cover be improved?",
  "Suggest water conservation strategies.",
  "Explain the scenario simulation results.",
];

export function Assistant({ title, inputs, reductions }: { title: string; inputs: ActivityInputs; reductions?: Reductions }) {
  const ask = useServerFn(askEnvironmentalAssistant);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setErr("");
    setAnswer("");
    const results = calculateEmissions(inputs);
    const context = JSON.stringify({
      title,
      inputs,
      results: { ...results, land: results.land.percentages },
      scenario: reductions ? { reductions, ...summary(simulateScenario(inputs, reductions)) } : null,
      topRecommendations: buildRecommendations(inputs, results).slice(0, 6).map((r) => ({ title: r.title, savingKgMonth: Math.round(r.savingKgMonth) })),
    });
    try {
      const r = await ask({ data: { question, context } });
      if (r.error) setErr(r.error);
      else setAnswer(r.answer);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI environmental assistant</span>}>
      <p className="mb-3 text-sm text-muted-foreground">Answers are based only on this assessment's calculated data.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <Button key={p} size="sm" variant="secondary" disabled={busy} onClick={() => { setQ(p); run(p); }}>{p}</Button>
        ))}
      </div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); run(q); }}>
        <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about these results…" rows={2} maxLength={1000} />
        <Button type="submit" disabled={busy || !q.trim()} className="sm:self-end">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}</Button>
      </form>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {answer && <div className="mt-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">{answer}</div>}
    </Panel>
  );
}

function summary(s: ReturnType<typeof simulateScenario>) {
  return { savedKgMonth: Math.round(s.savedKgMonth), savedPercent: s.savedPercent, savedTonnesYear: s.savedTonnesYear, byCategory: s.byCategory };
}
