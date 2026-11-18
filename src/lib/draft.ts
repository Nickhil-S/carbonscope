import { useSyncExternalStore } from "react";
import { DEMO_INPUTS, EMPTY_INPUTS, type ActivityInputs } from "@/lib/engine/carbon";

export const SCALES = ["Country", "State", "District", "City / town", "Neighbourhood", "College campus", "Custom area"] as const;
export type Scale = (typeof SCALES)[number];

export interface Draft {
  title: string;
  scale: Scale;
  locationName: string;
  boundary: GeoJSON.Feature | null;
  inputs: ActivityInputs;
  isDemo: boolean;
}

export const DEMO_DRAFT: Draft = {
  title: "Demo — Riverside University Campus",
  scale: "College campus",
  locationName: "Demo campus (sample data)",
  boundary: null,
  inputs: DEMO_INPUTS,
  isDemo: true,
};
export const BLANK_DRAFT: Draft = { title: "", scale: "City / town", locationName: "", boundary: null, inputs: EMPTY_INPUTS, isDemo: false };

const KEY = "carbonscope-draft-v1";
let state: Draft = DEMO_DRAFT;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEMO_DRAFT, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
}

export function setDraft(update: Partial<Draft> | ((d: Draft) => Partial<Draft>)) {
  hydrate();
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
  listeners.forEach((l) => l());
}

export function useDraft(): Draft {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      if (!hydrated) {
        hydrate();
        queueMicrotask(() => listeners.forEach((x) => x()));
      }
      return () => listeners.delete(l);
    },
    () => state,
    () => DEMO_DRAFT,
  );
}
