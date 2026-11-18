import { supabase } from "@/integrations/supabase/client";
import { calculateEmissions, METHODOLOGY_VERSION, inputSchema, type ActivityInputs, type Results } from "@/lib/engine/carbon";
import type { Draft } from "@/lib/draft";

export interface AssessmentRow {
  id: string;
  share_id: string;
  title: string;
  scale: string;
  location_name: string | null;
  boundary: GeoJSON.Feature | null;
  area_m2: number | null;
  inputs: ActivityInputs;
  results: Results;
  methodology_version: string;
  is_demo: boolean;
  created_at: string;
}

export async function saveAssessment(d: Draft) {
  const title = d.title.trim();
  if (!title) throw new Error("Give the assessment a title first.");
  const inputs = inputSchema.parse(d.inputs);
  const results = calculateEmissions(inputs);
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      title: title.slice(0, 120),
      scale: d.scale,
      location_name: d.locationName || null,
      boundary: (d.boundary ?? null) as never,
      area_m2: inputs.areaM2,
      inputs: inputs as never,
      results: results as never,
      methodology_version: METHODOLOGY_VERSION,
      is_demo: d.isDemo || inputs.landUseSource === "demo",
    })
    .select("share_id")
    .single();
  if (error) throw error;
  return data.share_id as string;
}

export async function listAssessments(): Promise<AssessmentRow[]> {
  const { data, error } = await supabase.from("assessments").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data as unknown as AssessmentRow[];
}

export async function getAssessment(shareId: string): Promise<AssessmentRow | null> {
  const { data, error } = await supabase.from("assessments").select("*").eq("share_id", shareId).maybeSingle();
  if (error) throw error;
  return data as unknown as AssessmentRow | null;
}
