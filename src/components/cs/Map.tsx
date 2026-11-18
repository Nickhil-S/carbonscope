import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

const MapView = lazy(() => import("./MapView.client"));

export function Map(props: { boundary: GeoJSON.Feature | null; onDraw?: (f: GeoJSON.Feature) => void; editable?: boolean; height?: number }) {
  const fallback = <div style={{ height: props.height ?? 520 }} className="w-full animate-pulse rounded-lg border bg-muted" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <MapView {...props} />
      </Suspense>
    </ClientOnly>
  );
}
